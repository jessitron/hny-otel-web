# My minimal wrapper around Honeycomb's SDK

Currently (November 2023), OpenTelemetry doesn't offer a single .js file that I can import in a script tag.

I want this so that my toy app can send spans to Honeycomb to tell me that someone hit the page, and when some JS threw an error.

This repository constructs a .js file, wrapping the OpenTelemetry libraries, using Parcel to bundle the necessary code up. It publishes the .js as a GitHub release.

## Make your own distribution

I don't recommend using this; instead, I recommend copying it and making your own tiny distribution that does what you want and nothing else.

## Use

```html
<script src="https://unpkg.com/@jessitronica/hny-otel-web@0.6.0/dist/hny.js"></script>
<script>window.Hny.initializeTracing({debug: true, apiKey: "your-honeycomb-ingest-api-key", serviceName: "my-app"})</script>
```

or from unpkg, the relevant include is: https://unpkg.com/@jessitronica/hny-otel-web@0.5.0/dist/hny.js

(where v0.2.0 is the current prerelease)

This wrapper follows the [Honeycomb docs](https://docs.honeycomb.io/send-data/javascript-browser/honeycomb-distribution/) as of now.
(It's July 5th 2024)

Currently this results in a binary of almost 200k.

### examples

See [hny.js](https://github.com/jessitron/hny-otel-web/blob/main/src/hny.js) for the code.

See [index.html](https://github.com/jessitron/hny-otel-web/blob/main/src/index.html) for an example of use; but you'll change the script tag that brings it in, because that one expects `otel.js` locally.

## Development

Change something in otel.js,`npm install`, and `npm run build`. This builds a parcel target defined in `package.json`. The output goes to `dist/hny.js`.

To test, change `index.html` and then run `npm run futz` to copy it to dist and serve it. Load the page, and then check the dev tools. Network tab should show hits to `/v1/traces`.

which won't work until you run a collector.

### Run a local collector

Edit `otel-local-config.yaml` and put a Honeycomb API key in the spot.

Start Docker.

`./run-collector`

## notes

Why GitHub releases? Because password reset on npmjs.com is not working.
