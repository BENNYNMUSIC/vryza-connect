// ================= UNREAD CHAT BADGE CONTROLLER =================

const API_URL = "https://vryza-connect-backend-1.onrender.com";
let chatUnreadCount = 0;

// ================= GET TOKEN =================
function getCleanToken() {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return null;
  return rawToken.replace(/^Bearer\s+/i, "").trim();
}

// ================= FETCH UNREAD COUNT =================
async function fetchUnreadChatCount() {
  const token = getCleanToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/api/messages/unread-count`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      console.warn("Unread badge: authentication expired.");
      return;
    }

    if (!res.ok) {
      console.warn("Unread badge API returned:", res.status);
      return;
    }

    const data = await res.json();
    chatUnreadCount = Number(data.unreadCount || 0);
    updateChatBadgeUI();

  } catch (err) {
    console.error("❌ FAILED TO FETCH UNREAD COUNT:", err);
  }
}

// ================= UPDATE BADGE UI =================
function updateChatBadgeUI() {
  const badge = document.getElementById("chatUnreadBadge");
  if (!badge) return;

  if (chatUnreadCount > 0) {
    badge.innerText = chatUnreadCount > 99 ? "99+" : chatUnreadCount;
    badge.classList.remove("hidden");
  } else {
    badge.innerText = "0";
    badge.classList.add("hidden");
  }
}

// ================= REAL-TIME SOCKET BADGE =================
function initChatSocketBadge() {
  const token = getCleanToken();
  if (!token || typeof io === "undefined") return;

  let currentUserId = "";

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));

    currentUserId = String(payload.id || payload._id || payload.userId || "");
  } catch (err) {
    console.error("❌ Could not parse token payload:", err);
    return;
  }

  if (!currentUserId) return;

  const socket = io(API_URL, {
    auth: { token }
  });

  socket.on("connect", () => {
    console.log("🔔 Chat badge socket connected");
    socket.emit("join", currentUserId);
  });

  socket.on("receiveMessage", (message) => {
    if (!message) return;

    const senderId = String(message.senderId?._id || message.senderId || "");
    const receiverId = String(message.receiverId?._id || message.receiverId || "");
    const myId = String(currentUserId);

    if (senderId === myId || receiverId !== myId) return;

    const activeChatPartner = String(
      localStorage.getItem("chatUserId") || localStorage.getItem("activeChatUser") || ""
    );

    if (
      activeChatPartner &&
      activeChatPartner === senderId &&
      window.location.pathname.includes("chat.html")
    ) {
      return;
    }

    chatUnreadCount++;
    updateChatBadgeUI();
  });

  socket.on("disconnect", () => {
    console.log("🔕 Chat badge socket disconnected");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchUnreadChatCount();
  initChatSocketBadge();
});