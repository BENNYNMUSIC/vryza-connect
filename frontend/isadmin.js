// AI Admin chat messages (used on a page that has a #chat-window element and a global `socket`).
// Shows AI replies with a badge and normal messages as plain bubbles. All text is inserted safely.
(function () {
  "use strict";
  var registered = false;

  function addMessage(data) {
    var chatWindow = document.getElementById("chat-window");
    if (!chatWindow || !data) return;

    var msgElement = document.createElement("div");
    var rawDate = data.timestamp ? new Date(data.timestamp) : new Date();
    var timeString = !isNaN(rawDate.getTime()) ? rawDate.toLocaleTimeString() : "";

    if (data.isAi) {
      msgElement.className = "message ai-admin-message";

      var header = document.createElement("div");
      header.className = "msg-header";
      var badge = document.createElement("span");
      badge.className = "bot-badge";
      badge.textContent = "🤖 AI ADMIN";
      var time = document.createElement("span");
      time.className = "time";
      time.textContent = timeString;
      header.append(badge, time);

      var body = document.createElement("div");
      body.className = "msg-body";
      body.textContent = data.message || "";

      msgElement.append(header, body);
    } else {
      msgElement.className = "message user-message";
      var sender = document.createElement("strong");
      sender.textContent = (data.sender || "User") + ": ";
      msgElement.append(sender, document.createTextNode(data.message || ""));
    }

    chatWindow.appendChild(msgElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // The page defines `socket` in its own script; wait for it instead of giving up.
  function register(attempt) {
    if (registered) return;
    var s = (typeof socket !== "undefined" && socket) ? socket : null;
    if (!s) {
      if (attempt < 40) setTimeout(function () { register(attempt + 1); }, 250);
      else console.warn("[isadmin] no socket found, AI admin messages will not show on this page");
      return;
    }
    registered = true;
    s.on("receive_message", addMessage);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { register(0); });
  else register(0);

  window.addAiAdminMessage = addMessage;   // handy for testing: addAiAdminMessage({isAi:true, message:"Hi"})
})();
