import { HoneycombWebSDK, WebVitalsInstrumentation } from "@honeycombio/opentelemetry-web";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { trace, context } from "@opentelemetry/api";
import { ATTR_EXCEPTION_MESSAGE, ATTR_EXCEPTION_STACKTRACE, ATTR_EXCEPTION_TYPE } from "@opentelemetry/semantic-conventions";

const MY_VERSION = "0.12.0";

function initializeTracing(params /* { apiKey: string, serviceName: string } */) {
  if (!params) {
    params = {};
  }
  if (!params.apiKey) {
    throw new Error("Usage: initializeTracing({ apiKey: 'honeycomb api key', serviceName: 'name of this service' })");
  }
  if (!params.serviceName) {
    console.log("No service name provided to initializeTracing. Defaulting to unknown_service");
    params.serviceName = "unknown_service";
  }

  const configDefaults = {
    ignoreNetworkEvents: true,
    propagateTraceHeaderCorsUrls: [/localhost/, /jessitron/, /127\.0\.0\.1/],
  };

  const sdk = new HoneycombWebSDK({
    // endpoint: "https://api.eu1.honeycomb.io/v1/traces", // Send to EU instance of Honeycomb. Defaults to sending to US instance.
    localVisualizations: params.debug,
    instrumentations: [
      getWebAutoInstrumentations({
        // Loads custom configuration for xml-http-request instrumentation.
        "@opentelemetry/instrumentation-xml-http-request": configDefaults,
        "@opentelemetry/instrumentation-fetch": configDefaults,
        "@opentelemetry/instrumentation-document-load": configDefaults,
      }),
      new WebVitalsInstrumentation(), // Explicitly add Web Vitals as recommended in Honeycomb docs
    ],
    ...params,
  });
  sdk.start();

  if (params.debug) {
    sendTestSpan();
  }

  if (params.provideOneLinkToHoneycomb) {
    const tracesEndpoint = params.endpoint || "https://api.honeycomb.io";
    const apiOrigin = new URL(tracesEndpoint).origin;
    const authEndpoint = apiOrigin + "/1/auth";
    const uiOrigin = apiOrigin.replace("api", "ui");
    const datasetSlug = params.serviceName || "unknown_service";
    fetch(authEndpoint, { headers: { "X-Honeycomb-Team": params.apiKey } })
      .then((result) => result.json())
      .then((data) => {
        const datasetQueryUrl = `${uiOrigin}/${data.team.slug}/environments/${data.environment.slug}/datasets/${datasetSlug}`;
        console.log(`Query your traces: ${datasetQueryUrl}`);
      });
  }

  console.log(`Hny-otel-web tracing initialized, ${MY_VERSION} at last update of this message`);
}

function sendTestSpan() {
  const span = getTracer({
    name: "hny-otel-web test",
    version: MY_VERSION,
  }).startSpan("test span");
  console.log("Sending test span", span.spanContext());
  span.end();
}

function activeSpanContext() {
  return trace.getActiveSpan()?.spanContext();
}

function setAttributes(attributes) {
  const span = trace.getActiveSpan();
  span && span.setAttributes(attributes); // maybe there is no active span, nbd
}

function getTracer(inputTracer) {
  let tracerName, tracerVersion;
  if (typeof inputTracer === "string") {
    tracerName = inputTracer;
  } else {
    tracerName = inputTracer.name || "missing tracer name";
    tracerVersion = inputTracer.version;
  }
  return trace.getTracer(tracerName, tracerVersion);
}

function inSpan(inputTracerName, spanName, fn, context) {
  if (fn === undefined || typeof fn !== "function") {
    throw new Error("USAGE: inSpan(tracerName, spanName, () => { ... })");
  }
  return getTracer(inputTracerName).startActiveSpan(spanName, {}, context || null, (span) => {
    try {
      return fn(span);
    } catch (err) {
      span.setStatus({
        code: 2, //SpanStatusCode.ERROR,
        message: err.message,
      });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}

async function inSpanAsync(inputTracerName, spanName, fn, context) {
  if (fn === undefined) {
    console.log("USAGE: inSpanAsync(tracerName, spanName, async () => { ... })");
  }
  return getTracer(inputTracerName).startActiveSpan(spanName, {}, context, async (span) => {
    try {
      return await fn(span);
    } catch (err) {
      span.setStatus({
        code: 2, // trace.SpanStatusCode.ERROR,
        message: err.message,
      });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}

function recordException(exception, additionalAttributes) {
  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }

  // I took this from the sdk-trace-base, except I'm gonna support additional attributes.
  // https://github.com/open-telemetry/opentelemetry-js/blob/90afa2850c0690f7a18ecc511c04927a3183490b/packages/opentelemetry-sdk-trace-base/src/Span.ts#L321
  const attributes = {};
  if (typeof exception === "string") {
    attributes[ATTR_EXCEPTION_MESSAGE] = exception;
  } else if (exception) {
    if (exception.code) {
      attributes[ATTR_EXCEPTION_TYPE] = exception.code.toString();
    } else if (exception.name) {
      attributes[ATTR_EXCEPTION_TYPE] = exception.name;
    }
    if (exception.message) {
      attributes[ATTR_EXCEPTION_MESSAGE] = exception.message;
    }
    if (exception.stack) {
      attributes[ATTR_EXCEPTION_STACKTRACE] = exception.stack;
    }
  }
  const allAttributes = { ...attributes, ...additionalAttributes };
  span.addEvent("exception", allAttributes);
  span.setStatus({
    code: 2, // SpanStatusCode.ERROR,
    message: attributes[ATTR_EXCEPTION_MESSAGE],
  });
}

function addSpanEvent(message, attributes) {
  const span = trace.getActiveSpan();
  span?.addEvent(message, attributes);
}

function inChildSpan(inputTracerName, spanName, spanContext, fn) {
  if (!!spanContext && (!spanContext.spanId || !spanContext.traceId)) {
    console.log("inChildSpan: the third argument should be a spanContext (or undefined to use the active context)");
    fn = spanContext;
    spanContext = fn;
  }

  const usefulContext = !!spanContext ? trace.setSpanContext(context.active(), spanContext) : context.active();

  return inSpan(inputTracerName, spanName, fn, usefulContext);
}

/* I'm exporting 'trace' here, but I have a feeling some of the functionality on it is stripped off.
 * getActiveSpan() was missing, when I tried to use that outside of this project, while this project was not
 * using it.
 * Someday, don't export 'trace' because it is a lie. Or do, but document which parts of TraceAPI are gonna be on it.
 */
export const Hny = {
  initializeTracing,
  setAttributes,
  inSpan,
  inSpanAsync,
  recordException,
  addSpanEvent,
  activeSpanContext,
  inChildSpan,
};
// Now for the REAL export
window.Hny = Hny;
