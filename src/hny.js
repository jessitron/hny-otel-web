import { HoneycombWebSDK } from "@honeycombio/opentelemetry-web";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { trace } from "@opentelemetry/api";

function initializeTracing(
  params /* { apiKey: string, serviceName: string } */
) {
  if (!params) {
    params = {};
  }
  if (!params.apiKey) {
    throw new Error(
      "Usage: initializeTracing({ apiKey: 'honeycomb api key', serviceName: 'name of this service' })"
    );
  }
  if (!params.serviceName) {
    console.log(
      "No service name provided to initializeTracing. Defaulting to unknown_service"
    );
    params.serviceName = "unknown_service";
  }

  function addContentLengthToSpan(span, resource) {
    // this works for document-load.
    const encodedLength = resource.encodedBodySize;

    if (encodedLength !== undefined) {
      span.setAttribute("http.request_content_length", encodedLength); // SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH
    }

    const decodedLength = resource.decodedBodySize;

    if (decodedLength !== undefined && encodedLength !== decodedLength) {
      span.setAttribute(
        "http.response_content_length_uncompressed", //SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED,
        decodedLength
      );
    }
  }

  const configDefaults = {
    ignoreNetworkEvents: true,
    // propagateTraceHeaderCorsUrls: [
    // /.+/g, // Regex to match your backend URLs. Update to the domains you wish to include.
    // ]
  };

  const sdk = new HoneycombWebSDK({
    // endpoint: "https://api.eu1.honeycomb.io/v1/traces", // Send to EU instance of Honeycomb. Defaults to sending to US instance.
    localVisualizations: params.debug,
    instrumentations: [
      getWebAutoInstrumentations({
        // Loads custom configuration for xml-http-request instrumentation.
        "@opentelemetry/instrumentation-xml-http-request": configDefaults,
        "@opentelemetry/instrumentation-fetch": configDefaults,
        "@opentelemetry/instrumentation-document-load": {
          applyCustomAttributesOnSpan: {
            resourceFetch: addContentLengthToSpan,
          },
          ...configDefaults,
        },
      }),
    ],
    ...params,
  });
  sdk.start();

  instrumentGlobalErrors();

  if (params.debug) {
    sendTestSpan();
  }

  // TODO: add the version of this library. Can i get parcel to import a json file?
  console.log("Tracing initialized, v0.10.0 at last update of this message");
}

function sendTestSpan() {
  const span = trace.getTracer("test span").startSpan("test span");
  console.log("Sending test span", span.spanContext());
  span.end();
}

function setAttributes(attributes) {
  const span = trace.getActiveSpan();
  span && span.setAttributes(attributes); // maybe there is no active span, nbd
}

function inSpan(tracerName, spanName, fn) {
  if (fn === undefined) {
    console.log("USAGE: inSpan(tracerName, spanName, () => { ... })");
  }
  return trace.getTracer(tracerName).startActiveSpan(spanName, (span) => {
    try {
      return fn();
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

async function inSpanAsync(tracerName, spanName, fn) {
  if (fn === undefined) {
    console.log(
      "USAGE: inSpanAsync(tracerName, spanName, async () => { ... })"
    );
  }
  return trace.getTracer(tracerName).startActiveSpan(spanName, async (span) => {
    try {
      return await fn();
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

async function recordException(err) {
  const span = trace.getActiveSpan();
  span.setStatus({
    code: 2, // SpanStatusCode.ERROR,
    message: err.message,
  });
  span.recordException(err);
}

async function addSpanEvent(message, attributes) {
  const span = trace.getActiveSpan();
  span.addEvent(message, attributes);
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
};
// Now for the REAL export
window.Hny = Hny;
