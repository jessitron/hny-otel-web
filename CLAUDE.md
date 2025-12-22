# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal wrapper around OpenTelemetry Web SDK for Honeycomb, bundled into a single JavaScript file that can be imported via a `<script>` tag. The project uses esbuild to bundle OpenTelemetry dependencies into a distributable browser-compatible JavaScript file.

**Key insight**: OpenTelemetry doesn't provide a single .js file for browser use, so this project bridges that gap by bundling the necessary code. It's optimized for debugging and intended as a template for users to fork and customize.

## Architecture

- **Entry point**: `src/hny.js` - Contains all tracing functionality, exports `window.Hny` global object
- **Demo page**: `src/index.html` - Example HTML page showing usage
- **Build output**: `dist/hny.js` (unminified) and `dist/hny.min.js` (minified, for publishing)
- **Package**: Published to npm as `@jessitronica/hny-otel-web`

The wrapper provides a simplified API around:
- `@honeycombio/opentelemetry-web` - Honeycomb's OpenTelemetry distribution
- `@opentelemetry/auto-instrumentations-web` - Automatic browser instrumentation
- `@opentelemetry/api` - Core OpenTelemetry API

## Development Commands

### Building
```bash
npm run build        # Build unminified to dist/hny.js
npm run dist         # Build minified to dist/hny.min.js (for distribution)
npm run watch        # Build and watch for changes
```

### Testing Locally
```bash
npm run futz         # Build, copy index.html to dist/, and serve with http-server
```
After running `futz`, open the served page in a browser and check:
- Browser DevTools Console for initialization messages
- Browser DevTools Network tab for `/v1/traces` requests to the collector

### Running Local Collector
To capture traces locally:
1. Edit `otel-local-config.yaml` and add your Honeycomb API key
2. Start Docker
3. Run `./run-collector`
4. Test collector with: `curl -i http://localhost:4318/v1/traces -X POST -H "Content-Type: application/json" -d @test-span.json`

### Publishing
1. Update version in both `package.json` AND `README.md` (version appears in example script tag)
2. Update `MY_VERSION` constant in `src/hny.js`
3. Run `npm publish --access public` (login as jessitronica)
4. Optionally run `./release` to create GitHub release (requires `gh` CLI and `jq`)

## Important Implementation Details

### Version Synchronization
The version number appears in THREE places and must be updated together:
- `package.json` version field
- `README.md` in the unpkg.com script tag URL
- `src/hny.js` MY_VERSION constant

### API Surface
The `window.Hny` object exposes these functions (see README.md for full API):
- `initializeTracing(config)` - Must be called first, initializes OpenTelemetry with Honeycomb
- `inSpan(tracerName, spanName, fn)` - Wraps synchronous code in a span
- `inSpanAsync(tracerName, spanName, fn)` - Wraps async code in a span
- `setAttributes(attributes)` - Sets attributes on active span
- `recordException(error, additionalAttributes)` - Records exceptions with custom attributes
- `addSpanEvent(message, attributes)` - Adds events to active span
- `activeSpanContext()` - Returns current span context
- `inChildSpan(tracerName, spanName, parentContext, fn)` - Creates child spans

### Custom Instrumentation Configuration
The code includes custom configuration for auto-instrumentations:
- Network events are ignored (`ignoreNetworkEvents: true`)
- Trace headers propagate to localhost and jessitron domains
- Document load instrumentation adds custom attributes for content length (encoded/decoded body size)

### Debug Mode
When `initializeTracing({ debug: true })`:
- Sends a test span immediately
- Enables Honeycomb's local visualizations feature

### Honeycomb Link Generation
When `provideOneLinkToHoneycomb: true`, the code fetches team/environment info from Honeycomb's auth endpoint and logs a direct URL to query traces in the Honeycomb UI.

## Build System Notes

This project uses **esbuild** (not Parcel, despite the README mentioning Parcel historically). The build is configured in `package.json` scripts:
- Format: IIFE (Immediately Invoked Function Expression) for browser compatibility
- Platform: browser
- Bundle: true (includes all dependencies)

## Shell Environment Gotchas

**zsh environment variable expansion bug**: When using the Bash tool (which actually runs zsh on macOS), environment variables like `$HONEYCOMB_API_KEY` fail to expand in piped commands, even when properly exported.

Example of the problem:
```bash
curl -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" https://api.honeycomb.io/1/auth | jq .  # FAILS - variable is empty
```

Workarounds:
- Don't pipe: `curl -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" https://api.honeycomb.io/1/auth` (works)
- Use bash explicitly: `bash -c 'curl -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" https://api.honeycomb.io/1/auth' | jq .` (works)
- Capture then pipe: `response=$(curl ...); echo "$response" | jq .` (works)
