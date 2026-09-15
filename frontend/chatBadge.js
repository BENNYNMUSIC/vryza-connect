// ================= UNREAD CHAT BADGE CONTROLLER =================

const API_URL = "https://vryza-connect-backend-1.onrender.com";

let chatUnreadCount = 0;


// ================= GET TOKEN =================

function getCleanToken() {
  const rawToken = localStorage.getItem("token");

  if (!rawToken) {
    return null;
  }

  return rawToken
    .replace(/^Bearer\s+/i, "")
    .trim();
}


// ================= FETCH UNREAD COUNT =================

async function fetchUnreadChatCount() {
  const token = getCleanToken();

  if (!token) {
    return;
  }

  try {
    const res = await fetch(
      `${API_URL}/api/messages/unread-count`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (res.status === 401) {
      console.warn("Unread badge: authentication expired.");
      return;
    }

    if (!res.ok) {
      console.warn(
        "Unread badge API returned:",
        res.status
      );
      return;
    }

    const data = await res.json();

    chatUnreadCount =
      Number(data.unreadCount || 0);

    updateChatBadgeUI();

  } catch (err) {
    console.error(
      "❌ FAILED TO FETCH UNREAD COUNT:",
      err
    );
  }
}


// ================= UPDATE BADGE =================

function updateChatBadgeUI() {
  const badge =
    document.getElementById("chatUnreadBadge");

  if (!badge) {
    return;
  }

  if (chatUnreadCount > 0) {

    badge.innerText =
      chatUnreadCount > 99
        ? "99+"
        : chatUnreadCount;

    badge.classList.remove("hidden");

  } else {

    badge.innerText = "0";

    badge.classList.add("hidden");
  }
}


// ================= REAL-TIME SOCKET BADGE =================

function initChatSocketBadge() {

  const rawToken =
    localStorage.getItem("token");

  if (
    !rawToken ||
    typeof io === "undefined"
  ) {
    return;
  }

  let currentUserId = "";

  const token =
    rawToken
      .replace(/^Bearer\s+/i, "")
      .trim();

  try {

    const parts = token.split(".");

    if (parts.length !== 3) {
      return;
    }

    const base64Url = parts[1];

    const base64 =
      base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const payload =
      JSON.parse(
        window.atob(base64)
      );

    currentUserId =
      payload.id ||
      payload._id;

  } catch (err) {

    console.error(
      "❌ Could not read user from token:",
      err
    );

    return;
  }

  if (!currentUserId) {
    return;
  }


  // IMPORTANT:
  // Your server requires Socket.IO authentication.
  // Pass the token when creating the socket.

  const socket = io(API_URL, {
    auth: {
      token
    }
  });


  socket.on("connect", () => {

    console.log(
      "🔔 Chat badge socket connected"
    );

    socket.emit(
      "join",
      currentUserId
    );
  });


  // ================= NEW PRIVATE MESSAGE =================

  socket.on("receiveMessage", (message) => {

    if (!message) {
      return;
    }

    const senderId =
      message.senderId?.toString();

    const receiverId =
      message.receiverId?.toString();

    const myId =
      currentUserId.toString();


    // VERY IMPORTANT:
    // Ignore messages that YOU sent.
    if (senderId === myId) {
      return;
    }


    // Only count messages actually sent TO us.
    if (receiverId !== myId) {
      return;
    }


    // If currently viewing this exact conversation,
    // don't increase the badge.
    const activeChatPartner =
      localStorage.getItem("chatUserId") ||
      localStorage.getItem("activeChatUser");


    if (
      activeChatPartner &&
      activeChatPartner.includes(senderId) &&
      window.location.pathname.includes("chat.html")
    ) {
      return;
    }


    chatUnreadCount++;

    updateChatBadgeUI();

  });


  socket.on("disconnect", () => {

    console.log(
      "🔕 Chat badge socket disconnected"
    );

  });
}


// ================= INITIALIZE =================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    fetchUnreadChatCount();

    initChatSocketBadge();

  }
);