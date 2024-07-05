import { HoneycombWebSDK } from "@honeycombio/opentelemetry-web";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { trace } from "@opentelemetry/api";

console.log("Helly from Hny.js");
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
  console.log("Params", params);
  if (params.debug) {
    console.log("Debug mode, my favorite!");
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
        "@opentelemetry/instrumentation-document-load": configDefaults,
      }),
    ],
    ...params,
  });
  console.log("starting SDK...");
  sdk.start();

  instrumentGlobalErrors();

  if (params.debug) {
    sendTestSpan();
  }

  console.log("Tracing initialized");
}

function instrumentGlobalErrors() {
  const tracer = trace.getTracer("@jessitron/errors");
  window.addEventListener("error", (e) => {
    const span = tracer.startSpan("Error on page");
    span.setAttributes({
      error: true,
      "error.message": e.message,
      "error.stack": e.error?.stack,
      "error.filename": e.filename,
      "error.line_number": e.lineno,
      "error.column_number": e.colno,
    });
    span.end();
  });
}

function sendTestSpan() {
  console.log("Time to send the test span!");
  const span = trace.getTracer("test span").startSpan("test span");
  console.log("Sending test span", span.spanContext());
  span.end();
}

/* I'm exporting 'trace' here, but I have a feeling some of the functionality on it is stripped off.
 * getActiveSpan() was missing, when I tried to use that outside of this project, while this project was not
 * using it.
 * Someday, don't export 'trace' because it is a lie. Or do, but document which parts of TraceAPI are gonna be on it.
 */
export const Hny = initializeTracing;
// Now for the REAL export
window.Hny = Hny;