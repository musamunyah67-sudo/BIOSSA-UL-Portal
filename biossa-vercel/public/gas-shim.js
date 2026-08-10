/* ==========================================================================
   GAS-SHIM
   Drop this in BEFORE your existing inline portal <script>. It reproduces
   just enough of google.script.run's chainable API that the rest of your
   existing Index.html code doesn't need to be rewritten call-by-call.

   Existing code like:
     google.script.run
       .withSuccessHandler(cb)
       .withFailureHandler(cb)
       .portalAdminSummary(sessionToken)
   keeps working unchanged -- it transparently becomes a fetch("/api/proxy")
   call under the hood.

   It also exposes window.__biossaBootReady, a Promise that resolves once the
   real bootstrap data has been fetched from the backend (replacing the old
   `<?!= bootstrap ?>` server-side template injection, which only exists
   inside Apps Script's HTML Service and has no equivalent on a static host).
========================================================================== */

(function () {
  "use strict";

  function runOne(fnName, args, onSuccess, onFailure) {
    fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fn: fnName, args: args })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var err = new Error((data && data.error) || ("Request failed (" + res.status + ")"));
            throw err;
          }
          return data;
        });
      })
      .then(function (data) {
        if (onSuccess) onSuccess(data);
      })
      .catch(function (err) {
        if (onFailure) onFailure(err);
        else if (typeof console !== "undefined") console.error(err);
      });
  }

  function makeRunner(successHandler, failureHandler) {
    // A Proxy stands in for google.script.run: any property access other
    // than withSuccessHandler/withFailureHandler is treated as the target
    // server function name to call.
    return new Proxy(
      {},
      {
        get: function (_target, prop) {
          if (prop === "withSuccessHandler") {
            return function (cb) {
              return makeRunner(cb, failureHandler);
            };
          }
          if (prop === "withFailureHandler") {
            return function (cb) {
              return makeRunner(successHandler, cb);
            };
          }
          // Any other property name is the Apps Script function being
          // invoked, e.g. .portalAdminSummary(sessionToken)
          return function () {
            var args = Array.prototype.slice.call(arguments);
            runOne(prop, args, successHandler, failureHandler);
          };
        }
      }
    );
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = makeRunner(null, null);

  // Fetches bootstrap data (settings, announcements, active user, isAdmin)
  // the same way portalGetBootstrap_() used to be injected server-side.
  window.__biossaBootReady = new Promise(function (resolve) {
    runOne(
      "portalGetBootstrap",
      [],
      function (data) {
        resolve(data || {});
      },
      function () {
        // Fail open with an empty bootstrap object rather than blocking the
        // whole page if the backend is briefly unreachable on first load.
        resolve({});
      }
    );
  });
})();