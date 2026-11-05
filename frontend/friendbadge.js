/*!
 * friendbadge.js  -  Vryza+ Friends nav badge
 *
 * Adds a live badge to the "Friends" button in the top nav on any page.
 *   - Green pill  = number of friends online right now (real-time via Socket.IO)
 *   - Blue pill   = total friends (fallback if the socket isn't available)
 *   - Hidden when there is nothing to show
 *
 * Usage: add this line to home.html, friends.html (and any other page with the nav)
 *   <script src="friendbadge.js" defer></script>
 *
 * Optional API:
 *   FriendBadge.refresh()   -> re-fetch the friends list (call after follow/unfollow)
 *   window.dispatchEvent(new Event("friends:changed"))  -> same thing
 */
(function () {
  "use strict";

  if (window.__friendBadgeLoaded) return;
  window.__friendBadgeLoaded = true;

  var API_BASE_URL = "https://vryza-connect-backend-1.onrender.com";
  var POLL_MS = 60000;

  var friendIds = [];            // ids of everyone in /api/friends
  var onlineSet = new Set();     // ids currently online (from socket)
  var socketReady = false;       // true once we've received an onlineUsers event
  var badgeEl = null;
  var btnEl = null;
  var socket = null;
  var pollTimer = null;

  /* ---------- helpers ---------- */

  function getToken() {
    try {
      var raw = localStorage.getItem("token");
      return raw ? raw.replace(/^Bearer\s+/i, "").trim() : null;
    } catch (e) {
      return null;
    }
  }

  function getUserId(token) {
    try {
      var user = JSON.parse(localStorage.getItem("user") || "null");
      if (user && (user._id || user.id)) return String(user._id || user.id);
    } catch (e) {}
    try {
      var payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return String(payload.id || payload._id || payload.userId || "");
    } catch (e) {
      return "";
    }
  }

  function findFriendsButton() {
    return (
      document.querySelector('nav button[onclick*="friends.html"]') ||
      document.querySelector('nav a[href*="friends.html"]') ||
      document.querySelector('[data-friends-nav]')
    );
  }

  function injectStyles() {
    if (document.getElementById("friendbadge-styles")) return;
    var style = document.createElement("style");
    style.id = "friendbadge-styles";
    style.textContent =
      "@keyframes friendbadge-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}" +
      ".friendbadge{position:absolute;top:-4px;right:-8px;min-width:16px;height:16px;padding:0 4px;" +
      "border-radius:999px;font-size:10px;font-weight:800;line-height:16px;" +
      "text-align:center;color:#fff;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2);" +
      "pointer-events:none;animation:friendbadge-pop .25s ease-out;font-family:inherit;" +
      "box-sizing:content-box;}" +
      ".friendbadge--online{background:#10b981}" +
      ".friendbadge--total{background:#2563eb}" +
      "html.dark .friendbadge{border-color:#0f172a}";
    document.head.appendChild(style);
  }

  /* ---------- badge rendering ---------- */

  function ensureBadge() {
    if (badgeEl && document.contains(badgeEl)) return badgeEl;

    btnEl = findFriendsButton();
    if (!btnEl) return null;

    injectStyles();

    if (getComputedStyle(btnEl).position === "static") {
      btnEl.style.position = "relative";
    }

    badgeEl = document.createElement("span");
    badgeEl.className = "friendbadge friendbadge--online";
    badgeEl.setAttribute("aria-live", "polite");
    badgeEl.style.display = "none";
    btnEl.appendChild(badgeEl);
    return badgeEl;
  }

  function countOnline() {
    var n = 0;
    for (var i = 0; i < friendIds.length; i++) {
      if (onlineSet.has(friendIds[i])) n++;
    }
    return n;
  }

  function render() {
    var el = ensureBadge();
    if (!el) return;

    var total = friendIds.length;
    var online = countOnline();
    var value, mode;

    if (socketReady) {
      value = online;
      mode = "online";
    } else {
      value = total;
      mode = "total";
    }

    var text = value > 99 ? "99+" : String(value);
    var changed = el.textContent !== text || !el.classList.contains("friendbadge--" + mode);

    el.classList.remove("friendbadge--online", "friendbadge--total");
    el.classList.add("friendbadge--" + mode);
    el.textContent = text;
    el.style.display = value > 0 ? "block" : "none";

    var label = socketReady
      ? online + " friend" + (online === 1 ? "" : "s") + " online \u00b7 " + total + " total"
      : total + " friend" + (total === 1 ? "" : "s");
    el.title = label;
    btnEl.setAttribute("aria-label", "Friends: " + label);

    if (changed && value > 0) {
      el.style.animation = "none";
      void el.offsetWidth; // restart animation
      el.style.animation = "";
    }
  }

  /* ---------- data ---------- */

  function loadFriends() {
    var token = getToken();
    if (!token) return Promise.resolve();

    return fetch(API_BASE_URL + "/api/friends", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && Array.isArray(data.friends)) {
          friendIds = data.friends
            .map(function (f) { return String(f._id || f.id || ""); })
            .filter(Boolean);
          render();
        }
      })
      .catch(function (err) {
        console.warn("[friendbadge] could not load friends:", err.message || err);
      });
  }

  function connectSocket() {
    var token = getToken();
    if (!token || typeof window.io !== "function" || socket) return;

    var userId = getUserId(token);

    try {
      socket = window.io(API_BASE_URL, {
        auth: { token: token },
        transports: ["websocket", "polling"]
      });
    } catch (e) {
      console.warn("[friendbadge] socket failed:", e);
      return;
    }

    socket.on("connect", function () {
      if (userId) socket.emit("join", userId);
    });

    socket.on("onlineUsers", function (users) {
      if (!Array.isArray(users)) return;
      onlineSet = new Set(users.map(function (id) { return String(id); }));
      socketReady = true;
      render();
    });

    socket.on("disconnect", function () {
      // Keep last known state; it will refresh when we reconnect.
    });
  }

  function refresh() {
    return loadFriends();
  }

  /* ---------- init ---------- */

  function init() {
    if (!getToken()) return; // logged out: no badge

    ensureBadge();
    loadFriends();
    connectSocket();

    pollTimer = setInterval(loadFriends, POLL_MS);

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") loadFriends();
    });
    window.addEventListener("friends:changed", loadFriends);
    window.addEventListener("storage", function (e) {
      if (e.key === "token" && !e.newValue && badgeEl) badgeEl.style.display = "none";
    });
  }

  window.FriendBadge = {
    refresh: refresh,
    destroy: function () {
      if (pollTimer) clearInterval(pollTimer);
      if (socket) socket.disconnect();
      if (badgeEl && badgeEl.parentNode) badgeEl.parentNode.removeChild(badgeEl);
      window.__friendBadgeLoaded = false;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
