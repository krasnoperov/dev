# PoC of no-bundle dev server

Features in development environment:

 * No bundle: source files are processed on demand, one by one
 * Lazy loaded components with their own styles
 * CSS Modules together with [CSS Modules Scripts](https://web.dev/css-module-scripts/)
 * Server Side Rendering (TBD)
 * Watch mode (TBD)

## Running Dev Server

    $ npm install
    $ npm run dev
    $ open https://localhost/demo/index.html

## Notes

* Dependencies from node_modules are resolved with [import maps](https://github.com/WICG/import-maps).
  It works natively in Chrome and using [ES Module Shims](https://github.com/guybedford/es-module-shims) in other browsers.

* CSS files are loaded and attached using [CSS Modules Scripts](https://web.dev/css-module-scripts/).
  Again it works in Chrome and uses [Constructible style sheets polyfill](https://github.com/calebdwilliams/construct-style-sheets#readme) in other browsers.

* Keys and Certificate for the local https server are generated with [devcert](https://github.com/davewasmer/devcert) during the first launch.

* Define HOST and PORT environment variables if you want to change the address of the development server.
