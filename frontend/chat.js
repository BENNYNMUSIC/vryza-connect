// ================= MASTER CONFIGURATION =================
const API = "https://vryza-connect-backend-1.onrender.com";

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.33-2.55 5.05-2.55 1.71 0 5.02.89 5.05 2.55C15.8 19.15 14.03 20 12 20z'/></svg>";

const token = localStorage.getItem("token");
const rawUser = localStorage.getItem("user");

let currentUser = null;

try {
  currentUser = rawUser ? JSON.parse(rawUser) : null;
} catch (err) {
  console.error("❌ INVALID USER DATA IN LOCAL STORAGE:", err);
  currentUser = null;
}

const currentUserId = currentUser
  ? String(currentUser._id || currentUser.id || "")
  : "";

if (!token || !currentUser || !currentUserId) {
  window.location.href = "auth.html";
}

// ================= AUTH HELPERS =================

function getCleanToken() {
  return String(token || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getCleanToken()}`,
    "Content-Type": "application/json"
  };
}

// ================= REALTIME SOCKET INITIALIZATION =================

const socket = io(API, {
  auth: {
    token: getCleanToken()
  },
  transports: ["websocket", "polling"]
});

let activeChatUserId = localStorage.getItem("chatUserId") || null;
let activeChatUsername =
  localStorage.getItem("chatUsername") || "Chat";

let typingTimeout = null;
let sendingMessage = false;

// ================= SOCKET CONNECTION =================

socket.on("connect", () => {
  console.log("🟢 CHAT SOCKET CONNECTED:", socket.id);

  // Join authenticated user's private room.
  socket.emit("join", currentUserId);

  // Tell server which chat is currently open.
  if (activeChatUserId) {
    socket.emit("openChat", {
      userId: currentUserId,
      chattingWith: activeChatUserId
    });
  }
});

socket.on("connect_error", (err) => {
  console.error(
    "❌ CHAT SOCKET CONNECTION ERROR:",
    err?.message || err
  );
});

socket.on("disconnect", (reason) => {
  console.warn("🔴 CHAT SOCKET DISCONNECTED:", reason);
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

// ================= LOAD SIDEBAR CONVERSATIONS =================

async function loadConversations() {
  if (!onlineUsersDiv) return;

  try {
    const res = await fetch(`${API}/api/messages`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(
        "❌ FAILED TO LOAD CONVERSATIONS:",
        data?.message || res.status
      );
      return;
    }

    onlineUsersDiv.innerHTML = "";

    const conversations = data.conversations || [];

    if (conversations.length === 0) {
      onlineUsersDiv.innerHTML = `
        <div class="text-center text-slate-400 text-xs py-4 italic">
          No active conversations yet. Search users above to start chatting!
        </div>
      `;
      return;
    }

    conversations.forEach((conv) => {
      const contact = conv.contactDetails || {};

      const contactId = String(
        contact._id || conv._id || ""
      );

      const username =
        contact.username || "Unknown User";

      // FIX:
      // Your message route returns profilePic,
      // not contact.avatar.
      const avatar =
        contact.profilePic ||
        contact.avatar ||
        DEFAULT_AVATAR;

      const lastMsg =
        conv.lastMessage ||
        (conv.media ? "[Media Attachment]" : "Started a conversation");

      const card = document.createElement("div");

      card.className =
        `flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition ${
          activeChatUserId === contactId
            ? "bg-blue-50 border border-blue-200"
            : "hover:bg-slate-50 border border-transparent"
        }`;

      card.onclick = () =>
        selectChatTarget(contactId, username);

      card.innerHTML = `
        <div class="relative shrink-0">
          <img
            src="${escapeAttribute(avatar)}"
            class="w-12 h-12 rounded-full object-cover border border-slate-200"
            onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';"
          />
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-slate-800 text-sm truncate">
            ${escapeHTML(username)}
          </h3>

          <p class="text-slate-500 text-xs truncate mt-0.5">
            ${escapeHTML(lastMsg)}
          </p>
        </div>
      `;

      onlineUsersDiv.appendChild(card);
    });
  } catch (err) {
    console.error(
      "❌ FAILED TO LOAD CONVERSATIONS:",
      err
    );
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
      const res = await fetch(
        `${API}/api/user/search?q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: getAuthHeaders()
        }
      );

      const users = await res.json();

      if (!res.ok) {
        console.error(
          "❌ USER SEARCH FAILED:",
          users?.message || res.status
        );
        return;
      }

      onlineUsersDiv.innerHTML = "";

      if (!Array.isArray(users) || users.length === 0) {
        onlineUsersDiv.innerHTML = `
          <div class="text-center text-slate-400 text-xs py-4">
            No users found matching "${escapeHTML(query)}"
          </div>
        `;
        return;
      }

      users.forEach((user) => {
        const uId = String(user._id || user.id || "");

        if (!uId || uId === currentUserId) {
          return;
        }

        const avatar =
          user.profilePic ||
          user.avatar ||
          DEFAULT_AVATAR;

        const card = document.createElement("div");

        card.className =
          "flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 border border-transparent transition";

        card.onclick = () =>
          selectChatTarget(uId, user.username);

        card.innerHTML = `
          <img
            src="${escapeAttribute(avatar)}"
            class="w-12 h-12 rounded-full object-cover border border-slate-200"
            onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';"
          />

          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-800 text-sm truncate">
              @${escapeHTML(user.username || "User")}
            </h3>

            <p class="text-blue-600 text-xs font-semibold mt-0.5">
              Click to chat
            </p>
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
  if (!userId) {
    console.error("❌ NO CHAT USER ID PROVIDED");
    return;
  }

  activeChatUserId = String(userId);
  activeChatUsername = username || "Chat";

  localStorage.setItem(
    "chatUserId",
    activeChatUserId
  );

  localStorage.setItem(
    "chatUsername",
    activeChatUsername
  );

  if (chatWithTitle) {
    chatWithTitle.textContent =
      `@${activeChatUsername}`;
  }

  if (emptyChatDiv) {
    emptyChatDiv.style.display = "none";
  }

  // Mobile layout
  if (window.innerWidth < 768) {
    if (contactsAside) {
      contactsAside.classList.add("hidden");
    }

    if (chatSection) {
      chatSection.classList.remove("hidden");
      chatSection.classList.add("flex");
    }
  }

  // Tell server which conversation is open.
  if (socket.connected) {
    socket.emit("openChat", {
      userId: currentUserId,
      chattingWith: activeChatUserId
    });
  }

  await loadChatHistory(activeChatUserId);

  // Mark messages from this user as read.
  try {
    const res = await fetch(
      `${API}/api/messages/read/${encodeURIComponent(
        activeChatUserId
      )}`,
      {
        method: "PUT",
        headers: getAuthHeaders()
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      console.warn(
        "⚠️ MARK READ FAILED:",
        data?.message || res.status
      );
    }
  } catch (err) {
    console.error(
      "❌ FAILED TO MARK MESSAGES READ:",
      err
    );
  }

  // Refresh sidebar after marking read.
  loadConversations();

  // Refresh badge if your chatBadge.js exposes this.
  if (typeof loadUnreadMessageCount === "function") {
    loadUnreadMessageCount();
  }
}

// ================= LOAD CHAT HISTORY =================

async function loadChatHistory(userId) {
  if (!messagesDiv || !userId) return;

  try {
    const res = await fetch(
      `${API}/api/messages/${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: getAuthHeaders()
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error(
        "❌ MESSAGE HISTORY ERROR:",
        data?.message || res.status
      );
      return;
    }

    messagesDiv.innerHTML = "";

    const msgs = data.messages || [];

    if (msgs.length === 0) {
      messagesDiv.innerHTML = `
        <div class="text-center text-slate-400 text-xs my-6 italic">
          No messages yet. Say hello to @${escapeHTML(
            activeChatUsername
          )}!
        </div>
      `;
      return;
    }

    msgs.forEach((msg) => {
      appendMessageToUI(msg);
    });

    scrollToBottom();
  } catch (err) {
    console.error(
      "❌ FAILED TO LOAD MESSAGE HISTORY:",
      err
    );
  }
}

// ================= RENDER MESSAGE =================

function appendMessageToUI(msg) {
  if (!messagesDiv || !msg) return;

  const senderId = String(
    msg.senderId?._id ||
    msg.senderId ||
    ""
  );

  const isSelf =
    senderId === currentUserId;

  const msgDiv =
    document.createElement("div");

  msgDiv.className =
    `flex flex-col ${
      isSelf ? "items-end" : "items-start"
    } my-2`;

  let contentHTML = "";

  if (msg.text) {
    contentHTML = `
      <div class="${
        isSelf
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-800 border border-slate-200"
      } px-4 py-2.5 rounded-2xl max-w-[80%] text-sm shadow-sm break-words">
        ${escapeHTML(String(msg.text))}
      </div>
    `;
  } else if (msg.media) {
    const rawMedia = String(msg.media);

    const mediaUrl =
      rawMedia.startsWith("http://") ||
      rawMedia.startsWith("https://") ||
      rawMedia.startsWith("data:")
        ? rawMedia
        : `${API}/uploads/${rawMedia}`;

    if (msg.mediaType === "audio") {
      contentHTML = `
        <audio controls class="max-w-[240px]">
          <source src="${escapeAttribute(mediaUrl)}" type="audio/webm">
          Your browser does not support audio playback.
        </audio>
      `;
    } else if (msg.mediaType === "video") {
      contentHTML = `
        <video
          controls
          class="max-w-[240px] rounded-xl border border-slate-200 shadow-sm"
        >
          <source src="${escapeAttribute(mediaUrl)}">
          Your browser does not support video playback.
        </video>
      `;
    } else {
      contentHTML = `
        <img
          src="${escapeAttribute(mediaUrl)}"
          class="max-w-[200px] rounded-xl border border-slate-200 shadow-sm"
          onerror="this.style.display='none';"
        />
      `;
    }
  }

  const timeStr =
    new Date(
      msg.createdAt || Date.now()
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  msgDiv.innerHTML = `
    <span class="text-[10px] text-slate-400 px-1 mb-1">
      ${timeStr}
    </span>

    ${contentHTML}
  `;

  messagesDiv.appendChild(msgDiv);
}

// ================= SEND MESSAGE =================

function sendMessage() {
  if (!messageInput) {
    console.error("❌ MESSAGE INPUT NOT FOUND");
    return;
  }

  if (!activeChatUserId) {
    console.warn(
      "⚠️ NO ACTIVE CHAT SELECTED"
    );
    return;
  }

  const text =
    messageInput.value.trim();

  if (!text) {
    return;
  }

  if (!socket.connected) {
    console.error(
      "❌ CANNOT SEND MESSAGE: SOCKET NOT CONNECTED"
    );

    alert(
      "Chat connection is not connected yet. Please wait a moment and try again."
    );

    return;
  }

  if (sendingMessage) {
    return;
  }

  sendingMessage = true;

  console.log("📤 SENDING MESSAGE:", {
    senderId: currentUserId,
    receiverId: activeChatUserId,
    textLength: text.length,
    socketId: socket.id
  });

  socket.emit("sendMessage", {
    senderId: currentUserId,
    receiverId: activeChatUserId,
    text: text
  });

  /*
   * Do NOT immediately display the message here.
   *
   * The server will save it and then emit receiveMessage.
   * This prevents duplicate messages.
   *
   * We also don't clear the input until the server confirms
   * that the message was accepted.
   */
}

// ================= MESSAGE SUCCESS =================

socket.on("messageSaved", (data) => {
  console.log(
    "✅ MESSAGE SAVED:",
    data
  );

  sendingMessage = false;

  if (messageInput) {
    messageInput.value = "";
    messageInput.focus();
  }

  if (
    activeChatUserId &&
    socket.connected
  ) {
    socket.emit("stopTyping", {
      senderId: currentUserId,
      receiverId: activeChatUserId
    });
  }

  loadConversations();
});

// ================= MESSAGE ERROR =================

socket.on("messageError", (data) => {
  console.error(
    "❌ MESSAGE ERROR:",
    data
  );

  sendingMessage = false;

  alert(
    data?.message ||
      "The message could not be sent."
  );
});

// ================= INPUT / ENTER KEY =================

if (messageInput) {
  messageInput.addEventListener(
    "keypress",
    (e) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        sendMessage();
        return;
      }

      if (
        activeChatUserId &&
        socket.connected
      ) {
        socket.emit("typing", {
          senderId: currentUserId,
          receiverId: activeChatUserId
        });

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
          socket.emit("stopTyping", {
            senderId: currentUserId,
            receiverId: activeChatUserId
          });
        }, 1500);
      }
    }
  );
}

// ================= RECEIVE MESSAGE =================

socket.on("receiveMessage", (message) => {
  console.log(
    "📨 MESSAGE RECEIVED:",
    message
  );

  const senderId = String(
    message.senderId?._id ||
    message.senderId ||
    ""
  );

  const receiverId = String(
    message.receiverId?._id ||
    message.receiverId ||
    ""
  );

  const belongsToCurrentChat =
    activeChatUserId &&
    (
      senderId === String(activeChatUserId) ||
      receiverId === String(activeChatUserId)
    );

  if (belongsToCurrentChat) {
    // Remove empty-state message.
    const placeholder =
      messagesDiv?.querySelector(
        "div.italic"
      );

    if (placeholder) {
      placeholder.remove();
    }

    appendMessageToUI(message);
    scrollToBottom();

    /*
     * If another user sends a message while
     * their chat is currently open, mark it read.
     */
    if (
      senderId === String(activeChatUserId) &&
      senderId !== currentUserId
    ) {
      fetch(
        `${API}/api/messages/read/${encodeURIComponent(
          senderId
        )}`,
        {
          method: "PUT",
          headers: getAuthHeaders()
        }
      ).catch((err) => {
        console.error(
          "❌ AUTO READ ERROR:",
          err
        );
      });
    }
  }

  loadConversations();

  if (
    typeof loadUnreadMessageCount ===
    "function"
  ) {
    loadUnreadMessageCount();
  }
});

// ================= TYPING =================

socket.on(
  "userTyping",
  ({ senderId }) => {
    if (
      String(senderId) ===
        String(activeChatUserId) &&
      typingIndicator
    ) {
      typingIndicator.textContent =
        `${activeChatUsername} is typing...`;
    }
  }
);

socket.on(
  "userStopTyping",
  ({ senderId }) => {
    if (
      String(senderId) ===
        String(activeChatUserId) &&
      typingIndicator
    ) {
      typingIndicator.textContent = "";
    }
  }
);

// ================= UTILITIES =================

function scrollToBottom() {
  if (messagesDiv) {
    messagesDiv.scrollTop =
      messagesDiv.scrollHeight;
  }
}

function escapeHTML(str) {
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[tag] || tag)
  );
}

function escapeAttribute(str) {
  return escapeHTML(str);
}

// ================= MOBILE CONTACT VIEW =================

function showContactsView() {
  if (window.innerWidth < 768) {
    if (chatSection) {
      chatSection.classList.remove("flex");
      chatSection.classList.add("hidden");
    }

    if (contactsAside) {
      contactsAside.classList.remove("hidden");
    }
  }
}

// ================= INITIALIZE =================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadConversations();

    if (activeChatUserId) {
      selectChatTarget(
        activeChatUserId,
        activeChatUsername
      );
    }
  }
);