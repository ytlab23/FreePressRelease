/*
 * Syncs the header (and footer) auth affordance with the portal's login state.
 *
 * This static apex site (freepressrelease.io) is a different origin from the
 * portal app (my.freepressrelease.io) that owns the session cookie, so we can't
 * know server-side whether the visitor is signed in. Instead we ask the portal
 * with a credentialed, cross-origin probe: freepressrelease.io and
 * my.freepressrelease.io are same-site, so the browser sends the portal's
 * SameSite=Lax cookie and the portal answers { authed: true|false }.
 *
 * Logged in  -> header link reads "Dashboard" and points at /dashboard.
 * Logged out -> header link reads "Login" and points at /login (the default).
 *
 * The last answer is cached in localStorage (shared with the proxied /press
 * pages, which are the same origin) so repeat visits render the right label
 * with no flash.
 */
(function () {
  "use strict";

  var APP = "https://my.freepressrelease.io";
  var STATUS_URL = APP + "/api/auth-status";
  var CACHE_KEY = "fpr_authed";

  function apply(authed) {
    var headerLinks = document.querySelectorAll("a.login-btn-header");
    for (var i = 0; i < headerLinks.length; i++) {
      headerLinks[i].textContent = authed ? "Dashboard" : "Login";
      headerLinks[i].setAttribute("href", APP + (authed ? "/dashboard" : "/login"));
    }
  }

  // 1) Render the last-known state immediately to avoid a Login -> Dashboard flash.
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached !== null) apply(cached === "1");
  } catch (e) {
    /* storage unavailable (private mode) — fall through to the network probe */
  }

  // 2) Reconcile with the portal's real session state.
  fetch(STATUS_URL, { credentials: "include" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data) return;
      var authed = !!data.authed;
      try {
        localStorage.setItem(CACHE_KEY, authed ? "1" : "0");
      } catch (e) {
        /* ignore storage failures */
      }
      apply(authed);
    })
    .catch(function () {
      /* offline or blocked — leave the logged-out default in place */
    });
})();
