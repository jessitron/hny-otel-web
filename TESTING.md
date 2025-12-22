# Testing Guide for hny-otel-web

This guide explains how to test the OpenTelemetry browser tracing functionality and verify that all expected traces are captured and sent to Honeycomb.

## Prerequisites

1. Docker installed and running
2. Honeycomb API key set as environment variable: `export HONEYCOMB_API_KEY=your_api_key_here`
3. Local OpenTelemetry collector configured and running
4. Node.js and npm installed

## Running the Tests

### 1. Verify Collector is Running (or Start It)

Check if the collector is already running:
```bash
docker ps | grep otel
```

If not running, start it:
```bash
./run-collector
```

This starts a Docker container running the OpenTelemetry collector that:
- Accepts traces on `http://localhost:4318/v1/traces`
- Forwards traces to Honeycomb
- Logs traces to stdout (debug exporter)

### 2. Test the Collector

Send a test span to verify the collector is working:
```bash
curl -i http://localhost:4318/v1/traces -X POST -H "Content-Type: application/json" -d @test-span.json
```

You should see a `200 OK` response.

### 3. Verify Test Span in Honeycomb

Use the Honeycomb MCP to query for the test span in your dataset. This confirms the collector is forwarding traces to Honeycomb successfully.

### 4. Build and Serve the Test Page

```bash
npm run futz
```

This command:
- Builds the unminified bundle to `dist/hny.js`
- Copies `src/index.html` to `dist/`
- Starts `http-server` on port 8081

### 5. Load the Test Page

Open your browser to:
```
http://127.0.0.1:8081/
```

The page will automatically:
- Initialize OpenTelemetry tracing
- Throw intentional errors
- Create custom spans
- Record exceptions
- Establish parent-child span relationships
- Make a failing HTTP request
- Capture web vitals (FCP, LCP, etc.)

## What the Test Page Does

The test page (`src/index.html`) deliberately creates the following instrumentation:

| Line | Action | Purpose |
|------|--------|---------|
| 11-16 | `Hny.initializeTracing()` | Initializes OTel with debug mode enabled |
| 20 | `throw new Error("Pirates!!")` | Tests uncaught exception capture |
| 24-27 | `Hny.inSpan("test-tracer", "this is a span", ...)` | Tests custom span creation with events |
| 26 | `Hny.addSpanEvent("this is an event")` | Tests span event recording |
| 32-41 | `Hny.inSpan("test-tracer", "catching-error", ...)` | Tests caught exception recording |
| 35 | `Hny.setAttributes({ sneaky: "pirates" })` | Tests custom span attributes |
| 39 | `Hny.recordException(e)` | Tests manual exception recording |
| 46-49 | `Hny.inSpan()` and `Hny.inChildSpan()` | Tests parent-child span relationships |
| 54 | `fetch("http://127.0.0.1:8080/test")` | Tests failed network request instrumentation |

Additionally, auto-instrumentation automatically captures:
- Document load events
- Resource fetches (hny.js, favicon, etc.)
- Web vitals (FCP, LCP, TTFB, INP)
- XMLHttpRequest and Fetch API calls

## Verification Checklist

Use these Honeycomb queries to verify all expected traces are present. All queries should be run against:
- **Environment:** `local` (or your test environment)
- **Dataset:** `hny-otel-web-test`
- **Time Range:** Last 2 hours (or adjust based on when you ran the test)

### ✅ 1. Document Load & Auto-Instrumentation

**Query:**
```
WHERE name IN ["documentLoad", "FCP", "LCP", "TTFB"]
GROUP BY name
COUNT
```

**Expected Results:**
- At least 1 `documentLoad` span
- At least 1 web vital span (FCP, LCP, or TTFB)

**Why This Matters:** Verifies that OpenTelemetry's document-load instrumentation is working and capturing page performance metrics.

---

### ✅ 2. Uncaught Exception "Pirates!!"

**Query:**
```
WHERE name = "exception" AND exception.message = "Pirates!!"
GROUP BY exception.type, exception.message, exception.structured_stacktrace.lines
COUNT
```

**Expected Results:**
- 1 exception span
- `exception.type = "Error"`
- `exception.message = "Pirates!!"`
- `exception.structured_stacktrace.lines = [20]` (thrown at src/index.html:20)

**Why This Matters:** Verifies that uncaught errors are automatically captured by the global error instrumentation.

---

### ✅ 3. Custom Span with Event

**Query:**
```
WHERE name = "this is a span"
GROUP BY span.num_events, library.name
COUNT
```

**Expected Results:**
- 1 span named "this is a span"
- `library.name = "test-tracer"`
- `span.num_events = 1` (contains the "this is an event" event)

**Why This Matters:** Verifies that the `Hny.inSpan()` API works and that span events can be added via `Hny.addSpanEvent()`.

---

### ✅ 4. Caught Exception with Custom Attribute

**Query:**
```
WHERE name = "catching-error"
GROUP BY sneaky, span.num_events
COUNT
```

**Expected Results:**
- 1 span named "catching-error"
- `sneaky = "pirates"` (custom attribute set in src/index.html:35)
- `span.num_events = 1` (the recorded exception)

**To verify the exception details:**
```
WHERE name = "exception" AND exception.message = "Sneaky Pirates!!"
GROUP BY exception.type, parent_name
COUNT
```

**Expected:**
- 1 exception event
- `parent_name = "catching-error"` or `meta.annotation_type = "span_event"`

**Why This Matters:** Verifies that:
- Custom attributes can be set on spans via `Hny.setAttributes()`
- Exceptions can be manually recorded on spans via `Hny.recordException()`
- Caught exceptions appear as span events, not separate spans

---

### ✅ 5. Parent-Child Span Relationship

**Query:**
```
WHERE name IN ["propagation parent", "propagation child"]
GROUP BY name, trace.trace_id, trace.span_id, trace.parent_id
COUNT
```

**Expected Results:**
- 2 spans: "propagation parent" and "propagation child"
- Both spans have the **same** `trace.trace_id`
- Child's `trace.parent_id` **equals** Parent's `trace.span_id`
- Parent has **no** `trace.parent_id` (or it's empty)

**Why This Matters:** Verifies that the `Hny.inChildSpan()` API correctly creates child spans with proper trace context propagation.

---

### ✅ 6. Failed Fetch Request

**Query:**
```
WHERE name = "HTTP GET" AND http.url CONTAINS "/test"
GROUP BY http.url, http.status_code, http.status_text
COUNT
```

**Expected Results:**
- 1 HTTP GET span to `http://127.0.0.1:8080/test`
- `http.status_code = 0` (indicates network failure)
- `http.status_text` contains "NetworkError"

**Also check for the NetworkError exception:**
```
WHERE exception.message CONTAINS "NetworkError"
GROUP BY exception.type, exception.message
COUNT
```

**Expected:**
- 1 exception with `exception.type = "TypeError"` and message about NetworkError

**Why This Matters:** Verifies that:
- Fetch API calls are automatically instrumented
- Failed network requests are properly captured
- Network errors generate exception spans

---

### ✅ 7. Debug Mode Test Span

**Query:**
```
WHERE name = "test span"
COUNT
```

**Expected Results:**
- At least 1 span named "test span"

**Why This Matters:** When `debug: true` is passed to `initializeTracing()`, a test span is immediately sent to verify the connection to the collector. This helps diagnose configuration issues.

---

### ✅ 8. Resource Fetches

**Query:**
```
WHERE name = "resourceFetch"
GROUP BY http.url
COUNT
```

**Expected Results:**
- Multiple `resourceFetch` spans (typically 4-6)
- Includes URLs for:
  - `hny.js` (the bundle)
  - `favicon.ico`
  - The page itself (`/`)
  - The failed `/test` endpoint

**Why This Matters:** Verifies that document-load instrumentation captures all resource fetches during page load.

---

## Quick Verification Query

For a fast overview of all captured spans:

```
WHERE service.name = "hny-otel-web-test"
GROUP BY name
ORDER BY COUNT DESC
COUNT
```

**Expected Span Types (minimum):**
- `resourceFetch` (5+)
- `exception` (2-3: Pirates!!, Sneaky Pirates!!, NetworkError)
- `documentLoad` (1)
- `FCP` or `LCP` (web vitals, 1+)
- `catching-error` (1)
- `this is a span` (1)
- `propagation parent` (1)
- `propagation child` (1)
- `HTTP GET` (1-2)
- `test span` (1)

**Total expected:** ~20-30 spans per page load

---

## Sharing Test Results

After running tests, generate a Honeycomb query link 

```
WHERE 
GROUP BY trace.trace_id, root.name
COUNT
```

Set the time range to match when you ran the test, then share the link.
Run the query with the Honeycomb MCP, and get the link from its response.

Report the link to the user with some cute ASCII art decoration.

---

## Troubleshooting

### No traces appearing in Honeycomb

1. **Check collector is running:**
   ```bash
   docker ps | grep otel
   ```

2. **Check collector logs for errors:**
   ```bash
   docker logs <container-id> --tail 50
   ```

3. **Verify CORS configuration:**
   - The collector must allow requests from the port your test server is running on
   - Check `otel-local-config.yaml` includes your test server's origin

4. **Check browser console for errors:**
   - Open DevTools → Console
   - Look for CORS errors or failed `/v1/traces` requests

5. **Check browser network tab:**
   - Open DevTools → Network
   - Filter for `/v1/traces`
   - Verify POST requests are succeeding (status 200)

### Traces appear in collector logs but not in Honeycomb

1. **Verify API key:**
   - Check `HONEYCOMB_API_KEY` environment variable is set
   - Verify the key is valid: `curl -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" https://api.honeycomb.io/1/auth`

2. **Check collector exporter configuration:**
   - Verify `otel-local-config.yaml` has the `otlp` exporter configured
   - Ensure it's listed in the `service.pipelines.traces.exporters` section

3. **Check for Honeycomb API errors in collector logs:**
   - Look for HTTP errors or authentication failures

### Missing specific spans

1. **Exception spans missing:**
   - Check browser console for suppressed errors
   - Verify `@honeycombio/instrumentation-global-errors` is loaded

2. **Web vitals missing:**
   - Some web vitals (like INP) only fire on user interaction
   - Try clicking elements on the page
   - Web vitals may be delayed (LCP can change until user interaction)

3. **Custom spans missing:**
   - Verify the JavaScript is executing (check console.log statements)
   - Check for JavaScript errors that prevent execution

### CORS Errors

If you see CORS errors in the browser console:

1. **Restart the collector** after updating `otel-local-config.yaml`:
   ```bash
   docker restart <container-id>
   ```

2. **Verify the allowed origins** match your test server exactly:
   - Protocol must match (`http` vs `https`)
   - Host must match (`127.0.0.1` vs `localhost`)
   - Port must match

3. **Hard refresh the page** after fixing CORS (Cmd+Shift+R / Ctrl+Shift+R)

---

## Test Maintenance

When modifying `src/index.html` test scenarios:

1. Update the "What the Test Page Does" table in this document
2. Add corresponding verification steps to the checklist
3. Update expected span counts in the "Quick Verification Query" section
4. Document any new custom attributes or special conditions
