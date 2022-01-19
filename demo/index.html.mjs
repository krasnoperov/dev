export default ({ html, links }) =>
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Test App</title>
  <meta content="Test App" name="description"/>
  <meta content="width=device-width,initial-scale=1" name="viewport"/>
  <link href="data:" rel="icon"/>
  ${[...links].map(style => `<link href="${style}" media="all" rel="stylesheet" type="text/css">`).join('')}
  <script async src="https://ga.jspm.io/npm:es-module-shims@1.3.6/dist/es-module-shims.js"></script>
  <script type="esms-options">{ "polyfillEnable": ["css-modules"] }</script>
  <script async src="https://unpkg.com/construct-style-sheets-polyfill@3.0.0/dist/adoptedStyleSheets.js"></script>
  <script type="importmap">
  {
    "imports": {
      "preact/compat/jsx-dev-runtime": "/node_modules/preact/compat/jsx-dev-runtime.mjs",
      "preact/compat/jsx-runtime": "/node_modules/preact/compat/jsx-runtime.mjs",
      "preact/compat/scheduler": "/node_modules/preact/compat/scheduler.mjs",
      "preact/jsx-dev-runtime": "/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js",
      "preact-iso/prerender": "/node_modules/preact-iso/prerender.js",
      "preact/compat/server": "/node_modules/preact/compat/server.mjs",
      "preact-iso/hydrate": "/node_modules/preact-iso/hydrate.js",
      "preact/jsx-runtime": "/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js",
      "preact-iso/router": "/node_modules/preact-iso/router.js",
      "preact/test-utils": "/node_modules/preact/test-utils/dist/testUtils.module.js",
      "preact-iso/lazy": "/node_modules/preact-iso/lazy.js",
      "preact/devtools": "/node_modules/preact/devtools/dist/devtools.module.js",
      "preact/compat": "/node_modules/preact/compat/dist/compat.module.js",
      "preact/debug": "/node_modules/preact/debug/dist/debug.module.js",
      "preact/hooks": "/node_modules/preact/hooks/dist/hooks.module.js",
      "preact-iso": "/node_modules/preact-iso/index.js",
      "preact": "/node_modules/preact/dist/preact.module.js"
    }
  }
  </script>
</head>
<body>
${html}
<script src="/build/static/client.218248a8.js" type="module"></script>
</body>
</html>`
