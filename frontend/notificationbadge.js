/*!
 * notificationbadge.js - unread-notifications badge for the "Alerts" nav button
 *
 *   <script src="notificationbadge.js" defer></script>   (home, profile, chat, friends, notifications)
 *
 *  - Red badge with the unread count, updated live (Socket.IO) and every minute.
 *  - Also sets the red dot/number on the installed app icon where the browser supports it.
 *  - NotificationBadge.refresh()  re-checks the count     NotificationBadge.set(n)  shows a number
 */
(function () {
  "use strict";
  if (window.NotificationBadge) return;

  var API_URL = "https://vryza-connect-backend-1.onrender.com";
  var POLL_MS = 60000;
  var badgeEl = null, btnEl = null, socket = null, timer = null, debounce = null, count = 0;

  function getToken() {
    try {
      var raw = localStorage.getItem("token");
      return raw ? raw.replace(/^Bearer\s+/i, "").trim() : "";
    } catch (e) { return ""; }
  }

  function getUserId(token) {
    try {
      var user = JSON.parse(localStorage.getItem("user") || "null");
      if (user && (user._id || user.id)) return String(user._id || user.id);
    } catch (e) {}
    try {
      var b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var p = JSON.parse(atob(b64));
      return String(p.id || p._id || p.userId || "");
    } catch (e) { return ""; }
  }

  function findButton() {
    return document.querySelector('nav button[onclick*="notifications.html"]') ||
           document.querySelector('nav a[href*="notifications.html"]') ||
           document.querySelector("[data-notifications-nav]");
  }

  function injectStyles() {
    if (document.getElementById("notifbadge-styles")) return;
    var s = document.createElement("style");
    s.id = "notifbadge-styles";
    s.textContent =
      "@keyframes notifbadge-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}" +
      ".notifbadge{position:absolute;top:-4px;right:-8px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;" +
      "font-size:10px;font-weight:800;line-height:16px;text-align:center;color:#fff;background:#ef4444;border:2px solid #fff;" +
      "box-sizing:content-box;box-shadow:0 1px 3px rgba(0,0,0,.25);pointer-events:none;animation:notifbadge-pop .25s ease-out;font-family:inherit}" +
      "html.dark .notifbadge{border-color:#0f172a}";
    document.head.appendChild(s);
  }

  function ensureBadge() {
    if (badgeEl && document.contains(badgeEl)) return badgeEl;
    btnEl = findButton();
    if (!btnEl) return null;
    injectStyles();
    if (getComputedStyle(btnEl).position === "static") btnEl.style.position = "relative";
    badgeEl = document.createElement("span");
    badgeEl.className = "notifbadge";
    badgeEl.style.display = "none";
    badgeEl.setAttribute("aria-live", "polite");
    btnEl.appendChild(badgeEl);
    return badgeEl;
  }

  function setAppBadge(n) {
    try {
      if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n).catch(function () {});
      else if (n === 0 && navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {});
    } catch (e) {}
  }

  function render(n) {
    count = Math.max(0, Number(n) || 0);
    setAppBadge(count);

    var el = ensureBadge();
    if (!el) return;
    var text = count > 99 ? "99+" : String(count);
    var changed = el.textContent !== text;
    el.textContent = text;
    el.style.display = count > 0 ? "block" : "none";
    el.title = count + " unread notification" + (count === 1 ? "" : "s");
    btnEl.setAttribute("aria-label", "Notifications: " + el.title);

    if (changed && count > 0) {
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }
  }

  function refresh() {
    var token = getToken();
    if (!token) return Promise.resolve();
    return fetch(API_URL + "/api/notifications/unread-count", { headers: { Authorization: "Bearer " + token } })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) { render(data.count); })
      .catch(function (err) { console.warn("[notificationbadge] could not load count:", err.message || err); });
  }

  function refreshSoon() {
    clearTimeout(debounce);
    debounce = setTimeout(refresh, 300);
  }

  function connectSocket(token) {
    if (socket || typeof window.io !== "function") return;
    var userId = getUserId(token);
    try {
      socket = window.io(API_URL, { auth: { token: token }, transports: ["websocket", "polling"] });
    } catch (e) { return; }

    socket.on("connect", function () { if (userId) socket.emit("join", userId); });

    // The server sends the same notification under two event names: count it once.
    var seen = {};
    function onNotification(n) {
      var id = n && n._id;
      if (id) {
        if (seen[id]) return;
        seen[id] = true;
        setTimeout(function () { delete seen[id]; }, 10000);
      }
      render(count + 1);   // show it instantly...
      refreshSoon();       // ...then confirm with the server
    }
    socket.on("notificationReceived", onNotification);
    socket.on("newNotification", onNotification);
  }

  function init() {
    var token = getToken();
    if (!token) return;
    ensureBadge();
    refresh();
    connectSocket(token);

    timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") refresh(); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) refresh(); });
    window.addEventListener("notifications:changed", refresh);
    window.addEventListener("storage", function (e) { if (e.key === "token" && !e.newValue) render(0); });
  }

  window.NotificationBadge = { refresh: refresh, set: render };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
