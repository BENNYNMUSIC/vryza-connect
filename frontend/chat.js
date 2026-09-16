// ================= MASTER CONFIGURATION =================
const API = "https://vryza-connect-backend-1.onrender.com";
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.33-2.55 5.05-2.55 1.71 0 5.02.89 5.05 2.55C15.8 19.15 14.03 20 12 20z'/></svg>";

const token = localStorage.getItem("token");
const rawUser = localStorage.getItem("user");
const currentUser = rawUser ? JSON.parse(rawUser) : null;
const currentUserId = currentUser ? String(currentUser._id || currentUser.id || "") : "";

if (!token || !currentUser || !currentUserId) {
  window.location.href = "auth.html";
}

function getCleanToken() {
  return token.replace(/^Bearer\s+/i, "").trim();
}

function getAuthHeaders() {
  return {
    "Authorization": `Bearer ${getCleanToken()}`,
    "Content-Type": "application/json"
  };
}

// ================= REALTIME SOCKET INITIALIZATION =================
const socket = io(API, {
  auth: { token: getCleanToken() },
  transports: ["websocket", "polling"]
});

let activeChatUserId = localStorage.getItem("chatUserId") || null;
let activeChatUsername = localStorage.getItem("chatUsername") || "Chat";
let typingTimeout = null;

socket.on("connect", () => {
  console.log("🟢 CHAT SOCKET CONNECTED:", socket.id);
  socket.emit("join", currentUserId);
  if (activeChatUserId) {
    socket.emit("openChat", { userId: currentUserId, chattingWith: activeChatUserId });
  }
});

socket.on("connect_error", (err) => {
  console.error("❌ CHAT SOCKET CONNECTION ERROR:", err.message);
});

// ================= DOM ELEMENTS =================
const onlineUsersDiv = document.getElementById("onlineUsers");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message");
const chatWithTitle = document.getElementById("chatWith");
const searchUserInput = document.getElementById("searchUser");
const chatSection = document.getElementById("chatSection");
const contactsAside = document.getElementById("contactsAside");
const emptyChatDiv = document.getElementById("emptyChat");
const typingIndicator = document.getElementById("typing");

// ================= LOAD SIDEBAR CONVERSATIONS & CONTACTS =================
async function loadConversations() {
  try {
    const res = await fetch(`${API}/api/messages`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (!res.ok) return;

    onlineUsersDiv.innerHTML = "";
    const conversations = data.conversations || [];

    if (conversations.length === 0) {
      onlineUsersDiv.innerHTML = `<div class="text-center text-slate-400 text-xs py-4 italic">No active conversations yet. Search users above to start chatting!</div>`;
      return;
    }

    conversations.forEach((conv) => {
      const contact = conv.contactDetails || {};
      const contactId = contact._id || conv._id;
      const username = contact.username || "Unknown User";
      const avatar = contact.avatar || DEFAULT_AVATAR;
      const lastMsg = conv.lastMessage || (conv.media ? "[Media Attachment]" : "Started a conversation");

      const card = document.createElement("div");
      card.className = `flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition ${activeChatUserId === contactId ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`;
      card.onclick = () => selectChatTarget(contactId, username);

      card.innerHTML = `
        <div class="relative shrink-0">
          <img src="${avatar}" class="w-12 h-12 rounded-full object-cover border border-slate-200" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-slate-800 text-sm truncate">${username}</h3>
          <p class="text-slate-500 text-xs truncate mt-0.5">${lastMsg}</p>
        </div>
      `;
      onlineUsersDiv.appendChild(card);
    });

  } catch (err) {
    console.error("❌ FAILED TO LOAD CONVERSATIONS:", err);
  }
}

// ================= SEARCH USERS =================
if (searchUserInput) {
  searchUserInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if (!query) {
      loadConversations();
      return;
    }

    try {
      const res = await fetch(`${API}/api/user/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });
      const users = await res.json();

      if (!res.ok) return;

      onlineUsersDiv.innerHTML = "";
      if (users.length === 0) {
        onlineUsersDiv.innerHTML = `<div class="text-center text-slate-400 text-xs py-4">No users found matching "${query}"</div>`;
        return;
      }

      users.forEach((user) => {
        const uId = user._id || user.id;
        if (uId === currentUserId) return;

        const avatar = user.profilePic || user.avatar || DEFAULT_AVATAR;

        const card = document.createElement("div");
        card.className = "flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 border border-transparent transition";
        card.onclick = () => selectChatTarget(uId, user.username);

        card.innerHTML = `
          <img src="${avatar}" class="w-12 h-12 rounded-full object-cover border border-slate-200" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" />
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-800 text-sm truncate">@${user.username}</h3>
            <p class="text-blue-600 text-xs font-semibold mt-0.5">Click to chat</p>
          </div>
        `;
        onlineUsersDiv.appendChild(card);
      });
    } catch (err) {
      console.error("❌ SEARCH ERROR:", err);
    }
  });
}

// ================= SELECT CHAT TARGET =================
async function selectChatTarget(userId, username) {
  activeChatUserId = userId;
  activeChatUsername = username;
  localStorage.setItem("chatUserId", userId);
  localStorage.setItem("chatUsername", username);

  if (chatWithTitle) chatWithTitle.textContent = `@${username}`;
  if (emptyChatDiv) emptyChatDiv.style.display = "none";

  // Mobile layout switch
  if (window.innerWidth < 768) {
    if (contactsAside) contactsAside.classList.add("hidden");
    if (chatSection) {
      chatSection.classList.remove("hidden");
      chatSection.classList.add("flex");
    }
  }

  socket.emit("openChat", { userId: currentUserId, chattingWith: userId });

  // Load chat history via REST
  await loadChatHistory(userId);

  // Mark messages as read
  try {
    await fetch(`${API}/api/messages/read/${userId}`, {
      method: "PUT",
      headers: getAuthHeaders()
    });
  } catch (err) {
    console.error("Failed to mark messages read:", err);
  }
}

// ================= LOAD CHAT HISTORY =================
async function loadChatHistory(userId) {
  try {
    const res = await fetch(`${API}/api/messages/${userId}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    const data = await res.json();

    if (!res.ok) return;

    messagesDiv.innerHTML = "";
    const msgs = data.messages || [];

    if (msgs.length === 0) {
      messagesDiv.innerHTML = `<div class="text-center text-slate-400 text-xs my-6 italic">No messages yet. Say hello to @${activeChatUsername}!</div>`;
      return;
    }

    msgs.forEach((msg) => appendMessageToUI(msg));
    scrollToBottom();
  } catch (err) {
    console.error("❌ FAILED TO LOAD MESSAGE HISTORY:", err);
  }
}

// ================= RENDER MESSAGE IN UI =================
function appendMessageToUI(msg) {
  const senderId = String(msg.senderId?._id || msg.senderId || "");
  const isSelf = senderId === currentUserId;

  const msgDiv = document.createElement("div");
  msgDiv.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'} my-2`;

  let contentHTML = "";
  if (msg.text) {
    contentHTML = `<div class="${isSelf ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-200'} px-4 py-2.5 rounded-2xl max-w-[80%] text-sm shadow-sm break-words">${escapeHTML(msg.text)}</div>`;
  } else if (msg.media) {
    const mediaUrl = msg.media.startsWith("http") ? msg.media : `${API}/uploads/${msg.media}`;
    if (msg.mediaType === "audio") {
      contentHTML = `<audio controls class="max-w-[240px]"><source src="${mediaUrl}" type="audio/webm"></audio>`;
    } else {
      contentHTML = `<img src="${mediaUrl}" class="max-w-[200px] rounded-xl border border-slate-200 shadow-sm" />`;
    }
  }

  const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgDiv.innerHTML = `
    <span class="text-[10px] text-slate-400 px-1 mb-1">${timeStr}</span>
    ${contentHTML}
  `;

  messagesDiv.appendChild(msgDiv);
}

// ================= SEND MESSAGE =================
function sendMessage() {
  if (!activeChatUserId || !messageInput) return;
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("sendMessage", {
    senderId: currentUserId,
    receiverId: activeChatUserId,
    text: text
  });

  messageInput.value = "";
  socket.emit("stopTyping", { senderId: currentUserId, receiverId: activeChatUserId });
}

if (messageInput) {
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      socket.emit("typing", { senderId: currentUserId, receiverId: activeChatUserId });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit("stopTyping", { senderId: currentUserId, receiverId: activeChatUserId });
      }, 1500);
    }
  });
}

// ================= SOCKET LISTENERS =================
socket.on("receiveMessage", (message) => {
  const senderId = String(message.senderId?._id || message.senderId || "");
  const receiverId = String(message.receiverId?._id || message.receiverId || "");

  if (activeChatUserId && (senderId === activeChatUserId || receiverId === activeChatUserId)) {
    // Remove empty state placeholder if present
    const placeholder = messagesDiv.querySelector("div.italic");
    if (placeholder) placeholder.remove();

    appendMessageToUI(message);
    scrollToBottom();
  }

  loadConversations();
});

socket.on("userTyping", ({ senderId }) => {
  if (senderId === activeChatUserId && typingIndicator) {
    typingIndicator.textContent = `${activeChatUsername} is typing...`;
  }
});

socket.on("userStopTyping", ({ senderId }) => {
  if (senderId === activeChatUserId && typingIndicator) {
    typingIndicator.textContent = "";
  }
});

// ================= UTILITIES =================
function scrollToBottom() {
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function showContactsView() {
  if (window.innerWidth < 768) {
    if (chatSection) {
      chatSection.classList.remove("flex");
      chatSection.classList.add("hidden");
    }
    if (contactsAside) contactsAside.classList.remove("hidden");
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadConversations();
  if (activeChatUserId) {
    selectChatTarget(activeChatUserId, activeChatUsername);
  }
});