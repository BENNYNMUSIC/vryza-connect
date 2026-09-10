// ================= UNREAD CHAT BADGE CONTROLLER =================
const API_URL = "https://vryza-connect-backend-1.onrender.com";

let chatUnreadCount = 0;

// Fetch current unread count on page load
async function fetchUnreadChatCount() {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return;

  const token = rawToken.replace(/^Bearer\s+/i, "").trim();

  try {
    const res = await fetch(`${API_URL}/api/messages/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    chatUnreadCount = data.unreadCount || data.count || 0;
    updateChatBadgeUI();
  } catch (err) {
    console.error("Failed to fetch chat unread count:", err);
  }
}

// Update DOM badge element visibility and count
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

// Socket.IO Real-time Listener Integration
function initChatSocketBadge() {
  const rawToken = localStorage.getItem("token");
  if (!rawToken || typeof io === "undefined") return;

  const token = rawToken.replace(/^Bearer\s+/i, "").trim();
  let currentUserId = "";

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    currentUserId = payload.id || payload._id;
  } catch (e) {
    return;
  }

  if (!currentUserId) return;

  const socket = io(API_URL);
  socket.emit("join", currentUserId);

  // Listen for direct incoming messages
  socket.on("receiveMessage", (message) => {
    const activeChatPartnerId = localStorage.getItem("chatUserId");

    // Increment badge only if message is NOT from currently active conversation user
    if (message.senderId !== activeChatPartnerId && window.location.pathname.includes("chat.html") === false) {
      chatUnreadCount++;
      updateChatBadgeUI();
    }
  });

  // Listen for notification socket events as backup
  socket.on("newNotification", (notification) => {
    if (notification.type === "message") {
      chatUnreadCount++;
      updateChatBadgeUI();
    }
  });
}

// Kick off badge initialization
document.addEventListener("DOMContentLoaded", () => {
  fetchUnreadChatCount();
  initChatSocketBadge();
});