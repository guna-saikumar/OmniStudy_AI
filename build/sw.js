/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "2f25ae7cd4b552457e79050e1cec8316"
  }, {
    "url": "assets/workbox-window.prod.es5-BIl4cyR9.js",
    "revision": null
  }, {
    "url": "assets/purify.es-CFh60W_8.js",
    "revision": null
  }, {
    "url": "assets/jspdf.es.min-gMiPNs5g.js",
    "revision": null
  }, {
    "url": "assets/index.es-Be6vbqdX.js",
    "revision": null
  }, {
    "url": "assets/index-DQDi0SIC.js",
    "revision": null
  }, {
    "url": "assets/index-CCnBp3L5.css",
    "revision": null
  }, {
    "url": "assets/html2pdf-CKrphQIh.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-B0tyYwQk.js",
    "revision": null
  }, {
    "url": "favicon.ico",
    "revision": "4234fdf8089ffa091fb50cc0572f3f8a"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "1f477a6902dd5a0965d23776f053f9a8"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "ca355b4c226ae5d6046722653e5b36a7"
  }, {
    "url": "icons/premium-splash.png",
    "revision": "bcf5c048da572acdb6b003111a2dfe0e"
  }, {
    "url": "manifest.webmanifest",
    "revision": "fabbe954a2c6b1bf2c00bce22f339a2e"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
