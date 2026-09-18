// ======================================================
// CONFIGURATION & GLOBAL STATE
// ======================================================
const API = "https://vryza-connect-backend-1.onrender.com";
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.5-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.33-2.55 5.05-2.55 1.71 0 5.02.89 5.05 2.55C15.8 19.15 14.03 20 12 20z'/></svg>";

// Auth Context
const token = localStorage.getItem("token");
const rawUser = localStorage.getItem("user");
let currentUser = null;

try {
  currentUser = rawUser ? JSON.parse(rawUser) : null;
} catch (err) {
  console.error("❌ INVALID USER DATA:", err);
}

const currentUserId = currentUser ? String(currentUser._id || currentUser.id || "") : "";

if (!token || !currentUser || !currentUserId) {
  window.location.href = "auth.html";
}

function getCleanToken() {
  return String(token || "").replace(/^Bearer\s+/i, "").trim();
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getCleanToken()}`,
    "Content-Type": "application/json"
  };
}

// Chat State
let activeChatUserId = localStorage.getItem("chatUserId") || null;
let activeChatUsername = localStorage.getItem("chatUsername") || "Chat";
let onlineUserIdsSet = new Set();
let renderedMessageIds = new Set();
let typingTimeout = null;
let sendingMessage = false;
let sendingVoice = false;

// WebRTC State
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let isCalling = false;

// Voice Recording State
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

// ======================================================
// SOCKET INITIALIZATION & HANDLERS
// ======================================================
const socket = io(API, {
  auth: { token: getCleanToken() },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000
});

socket.on("connect", () => {
  console.log("🟢 CHAT SOCKET CONNECTED:", socket.id);
  socket.emit("join", currentUserId);

  if (activeChatUserId) {
    socket.emit("openChat", { chattingWith: activeChatUserId });
  }
});

socket.on("onlineUsers", (usersArray) => {
  if (Array.isArray(usersArray)) {
    onlineUserIdsSet = new Set(usersArray.map((id) => String(id)));
    updateOnlineBadgesInUI();
  }
});

socket.on("connect_error", (err) => {
  console.error("❌ CHAT SOCKET CONNECTION ERROR:", err?.message || err);
});

socket.on("disconnect", (reason) => {
  console.warn("🔴 CHAT SOCKET DISCONNECTED:", reason);
});

// ======================================================
// DOM ELEMENTS
// ======================================================
const onlineUsersDiv = document.getElementById("onlineUsers");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message");
const chatWithTitle = document.getElementById("chatWith");
const searchUserInput = document.getElementById("searchUser");
const chatSection = document.getElementById("chatSection");
const contactsAside = document.getElementById("contactsAside");
const emptyChatDiv = document.getElementById("emptyChat");
const typingIndicator = document.getElementById("typing");
const startCallBtn = document.getElementById("startCall");
const endCallBtn = document.getElementById("endCall");
const videoArea = document.getElementById("videoArea");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const mediaInput = document.getElementById("mediaInput");
const micBtn = document.getElementById("micBtn");

// ======================================================
// LOAD CONVERSATIONS & SEARCH
// ======================================================
async function loadConversations() {
  if (!onlineUsersDiv) return;

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
      onlineUsersDiv.innerHTML = `
        <div class="text-center text-slate-400 text-xs py-4 italic">
          No active conversations yet. Search users above to start chatting!
        </div>
      `;
      return;
    }

    conversations.forEach((conv) => {
      const contact = conv.contactDetails || {};
      const contactId = String(contact._id || conv._id || "");
      if (!contactId || contactId === currentUserId) return;

      const username = contact.username || "User";
      const avatar = contact.profilePic || contact.avatar || DEFAULT_AVATAR;
      const isOnline = onlineUserIdsSet.has(contactId);

      let lastMsg = conv.lastMessage || "Started a conversation";
      if (!conv.lastMessage && conv.media) {
        if (conv.mediaType === "audio") lastMsg = "🎙️ Voice note";
        else if (conv.mediaType === "video") lastMsg = "🎥 Video";
        else lastMsg = "🖼️ Image";
      }

      const card = document.createElement("div");
      card.className = `
        flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition
        ${activeChatUserId === contactId ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}
      `;
      card.setAttribute("data-user-id", contactId);
      card.onclick = () => selectChatTarget(contactId, username);

      card.innerHTML = `
        <div class="relative shrink-0">
          <img src="${escapeAttribute(avatar)}" class="w-12 h-12 rounded-full object-cover border border-slate-200" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" />
          <span class="online-dot absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-slate-300"}"></span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-slate-800 text-sm truncate">${escapeHTML(username)}</h3>
          <p class="text-slate-500 text-xs truncate mt-0.5">${escapeHTML(lastMsg)}</p>
        </div>
      `;
      onlineUsersDiv.appendChild(card);
    });
  } catch (err) {
    console.error("❌ FAILED TO LOAD CONVERSATIONS:", err);
  }
}

function updateOnlineBadgesInUI() {
  if (!onlineUsersDiv) return;
  const cards = onlineUsersDiv.querySelectorAll("[data-user-id]");
  cards.forEach((card) => {
    const uid = card.getAttribute("data-user-id");
    const dot = card.querySelector(".online-dot");
    if (dot) {
      if (onlineUserIdsSet.has(uid)) {
        dot.classList.remove("bg-slate-300");
        dot.classList.add("bg-green-500");
      } else {
        dot.classList.remove("bg-green-500");
        dot.classList.add("bg-slate-300");
      }
    }
  });
}

if (searchUserInput) {
  searchUserInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if (!query) {
      loadConversations();
      return;
    }

    try {
      const res = await fetch(`${API}/api/user/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: getAuthHeaders()
      });
      const users = await res.json();
      if (!res.ok) return;

      onlineUsersDiv.innerHTML = "";
      if (!Array.isArray(users) || users.length === 0) {
        onlineUsersDiv.innerHTML = `<div class="text-center text-slate-400 text-xs py-4">No users found matching "${escapeHTML(query)}"</div>`;
        return;
      }

      users.forEach((user) => {
        const uId = String(user._id || user.id || "");
        if (!uId || uId === currentUserId) return;

        const avatar = user.profilePic || user.avatar || DEFAULT_AVATAR;
        const isOnline = onlineUserIdsSet.has(uId);
        const card = document.createElement("div");

        card.className = "flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 border border-transparent transition";
        card.onclick = () => selectChatTarget(uId, user.username);
        card.innerHTML = `
          <div class="relative shrink-0">
            <img src="${escapeAttribute(avatar)}" class="w-12 h-12 rounded-full object-cover border border-slate-200" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" />
            <span class="w-3 h-3 rounded-full border-2 border-white absolute bottom-0 right-0 ${isOnline ? "bg-green-500" : "bg-slate-300"}"></span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-800 text-sm truncate">@${escapeHTML(user.username || "User")}</h3>
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

// ======================================================
// SELECT CHAT & LOAD HISTORY
// ======================================================
async function selectChatTarget(userId, username) {
  if (!userId) return;

  activeChatUserId = String(userId);
  activeChatUsername = username || "Chat";
  localStorage.setItem("chatUserId", activeChatUserId);
  localStorage.setItem("chatUsername", activeChatUsername);

  if (chatWithTitle) chatWithTitle.textContent = `@${activeChatUsername}`;
  if (emptyChatDiv) emptyChatDiv.style.display = "none";
  if (typingIndicator) typingIndicator.textContent = "";

  if (window.innerWidth < 768) {
    if (contactsAside) contactsAside.classList.add("hidden");
    if (chatSection) {
      chatSection.classList.remove("hidden");
      chatSection.classList.add("flex");
    }
  }

  if (socket.connected) {
    socket.emit("openChat", { chattingWith: activeChatUserId });
  }

  await loadChatHistory(activeChatUserId);

  try {
    await fetch(`${API}/api/messages/read/${encodeURIComponent(activeChatUserId)}`, {
      method: "PUT",
      headers: getAuthHeaders()
    });
  } catch (err) {}

  loadConversations();
  if (typeof loadUnreadMessageCount === "function") loadUnreadMessageCount();
}

async function loadChatHistory(userId) {
  if (!messagesDiv || !userId) return;

  try {
    const res = await fetch(`${API}/api/messages/${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) return;

    messagesDiv.innerHTML = "";
    renderedMessageIds.clear();

    const msgs = data.messages || [];
    if (msgs.length === 0) {
      messagesDiv.innerHTML = `<div class="text-center text-slate-400 text-xs my-6 italic">No messages yet. Say hello to @${escapeHTML(activeChatUsername)}!</div>`;
      return;
    }

    msgs.forEach((msg) => appendMessageToUI(msg));
    scrollToBottom();
  } catch (err) {
    console.error("❌ FAILED TO LOAD CHAT HISTORY:", err);
  }
}

// ======================================================
// RENDER MESSAGE IN UI (WITH DEDUPLICATION)
// ======================================================
function appendMessageToUI(msg) {
  if (!messagesDiv || !msg) return;

  const msgId = String(msg._id || msg.id || "");
  if (msgId && renderedMessageIds.has(msgId)) {
    return; // Prevent duplicate rendering
  }
  if (msgId) renderedMessageIds.add(msgId);

  const senderId = String(msg.senderId?._id || msg.senderId || msg.sender || "");
  const isSelf = senderId === currentUserId;

  const msgDiv = document.createElement("div");
  msgDiv.className = `flex flex-col ${isSelf ? "items-end" : "items-start"} my-2`;

  let contentHTML = "";

  if (msg.text) {
    contentHTML = `
      <div class="${isSelf ? "bg-blue-600 text-white" : "bg-white text-slate-800 border border-slate-200"} px-4 py-2.5 rounded-2xl max-w-[80%] text-sm shadow-sm break-words">
        ${escapeHTML(String(msg.text))}
      </div>
    `;
  } else if (msg.media) {
    const rawMedia = String(msg.media);
    const mediaUrl = rawMedia.startsWith("http://") || rawMedia.startsWith("https://") || rawMedia.startsWith("data:")
      ? rawMedia
      : `${API}/uploads/${rawMedia}`;

    if (msg.mediaType === "audio") {
      contentHTML = `
        <div class="${isSelf ? "bg-blue-600" : "bg-white border border-slate-200"} rounded-2xl p-2 shadow-sm">
          <audio controls preload="metadata" class="max-w-[260px]">
            <source src="${escapeAttribute(mediaUrl)}" type="audio/webm" />
            Your browser does not support audio playback.
          </audio>
        </div>
      `;
    } else if (msg.mediaType === "video") {
      contentHTML = `
        <video controls preload="metadata" class="max-w-[240px] rounded-xl border border-slate-200 shadow-sm">
          <source src="${escapeAttribute(mediaUrl)}" />
          Your browser does not support video playback.
        </video>
      `;
    } else {
      contentHTML = `
        <img src="${escapeAttribute(mediaUrl)}" class="max-w-[200px] rounded-xl border border-slate-200 shadow-sm" onerror="this.style.display='none';" />
      `;
    }
  }

  const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  msgDiv.innerHTML = `
    <span class="text-[10px] text-slate-400 px-1 mb-1">${timeStr}</span>
    ${contentHTML}
  `;

  messagesDiv.appendChild(msgDiv);
}

// ======================================================
// SEND TEXT MESSAGES
// ======================================================
function sendMessage() {
  if (!messageInput || !activeChatUserId) return;
  const text = messageInput.value.trim();
  if (!text) return;

  if (!socket.connected) {
    alert("Chat server connection is active. Reconnecting...");
    return;
  }

  if (sendingMessage) return;
  sendingMessage = true;

  socket.emit("sendMessage", {
    receiverId: activeChatUserId,
    text: text
  });
}

socket.on("messageSaved", (data) => {
  sendingMessage = false;
  if (messageInput) {
    messageInput.value = "";
    messageInput.focus();
  }
  if (activeChatUserId && socket.connected) {
    socket.emit("stopTyping", { receiverId: activeChatUserId });
  }
  loadConversations();
});

socket.on("messageError", (data) => {
  sendingMessage = false;
  alert(data?.message || "Message delivery failed.");
});

// Handle incoming messages (Text, Audio, Media)
socket.on("receiveMessage", (message) => {
  if (!message) return;

  const senderId = String(message.senderId?._id || message.senderId || "");
  const receiverId = String(message.receiverId?._id || message.receiverId || "");

  const belongsToCurrentChat = activeChatUserId && (senderId === activeChatUserId || receiverId === activeChatUserId);

  if (belongsToCurrentChat) {
    const placeholder = messagesDiv?.querySelector("div.italic");
    if (placeholder) placeholder.remove();

    appendMessageToUI(message);
    scrollToBottom();

    if (senderId === activeChatUserId && senderId !== currentUserId) {
      fetch(`${API}/api/messages/read/${encodeURIComponent(senderId)}`, {
        method: "PUT",
        headers: getAuthHeaders()
      }).catch(() => {});
    }
  }

  loadConversations();
  if (typeof loadUnreadMessageCount === "function") loadUnreadMessageCount();
});

socket.on("voiceSaved", () => {
  sendingVoice = false;
  loadConversations();
});

socket.on("voiceError", (data) => {
  sendingVoice = false;
  alert(data?.message || "Media delivery failed.");
});

// ======================================================
// TYPING INDICATORS
// ======================================================
if (messageInput) {
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      return;
    }

    if (activeChatUserId && socket.connected) {
      socket.emit("typing", { receiverId: activeChatUserId });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit("stopTyping", { receiverId: activeChatUserId });
      }, 1500);
    }
  });
}

socket.on("userTyping", ({ senderId }) => {
  if (String(senderId) === String(activeChatUserId) && typingIndicator) {
    typingIndicator.textContent = `${activeChatUsername} is typing...`;
  }
});

socket.on("userStopTyping", ({ senderId }) => {
  if (String(senderId) === String(activeChatUserId) && typingIndicator) {
    typingIndicator.textContent = "";
  }
});

// ======================================================
// MEDIA ATTACHMENTS (IMAGE & VIDEO)
// ======================================================
if (mediaInput) {
  mediaInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChatUserId) return;

    if (!socket.connected) {
      alert("Chat connection is lost. Please reconnect.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        sendingVoice = true;

        socket.emit("sendVoice", {
          receiverId: activeChatUserId,
          audio: base64Data,
          mediaType: mediaType
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      sendingVoice = false;
      alert("Could not process attachment.");
    }

    e.target.value = "";
  });
}

// ======================================================
// VOICE NOTE RECORDING
// ======================================================
async function toggleRecording() {
  if (!activeChatUserId) {
    alert("Please select a contact first.");
    return;
  }

  if (!socket.connected) {
    alert("Chat server offline.");
    return;
  }

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorderOptions = {};

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        recorderOptions = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        recorderOptions = { mimeType: "audio/webm" };
      }

      mediaRecorder = new MediaRecorder(stream, recorderOptions);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        try {
          const mimeType = mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunks, { type: mimeType });

          if (audioBlob.size === 0) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            sendingVoice = true;
            socket.emit("sendVoice", {
              receiverId: activeChatUserId,
              audio: reader.result,
              mediaType: "audio"
            });
          };
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          sendingVoice = false;
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      isRecording = true;
      if (micBtn) micBtn.classList.add("bg-red-100", "text-red-500", "animate-pulse");
    } catch (err) {
      alert("Could not access microphone.");
    }
    return;
  }

  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  } catch (err) {}

  isRecording = false;
  if (micBtn) micBtn.classList.remove("bg-red-100", "text-red-500", "animate-pulse");
}

// ======================================================
// WEBRTC CALL SIGNALING (FIXED)
// ======================================================
async function startVideoCall() {
  if (!activeChatUserId) {
    alert("Please select a contact to call.");
    return;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) localVideo.srcObject = localStream;
    if (videoArea) videoArea.classList.remove("hidden");
    if (startCallBtn) startCallBtn.classList.add("hidden");
    if (endCallBtn) endCallBtn.classList.remove("hidden");

    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
      remoteStream = event.streams[0];
      if (remoteVideo) remoteVideo.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { to: activeChatUserId, candidate: event.candidate });
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("callUser", {
      userToCall: activeChatUserId,
      signalData: offer,
      callType: "video"
    });

    isCalling = true;
  } catch (err) {
    alert("Camera or Microphone permission denied.");
    triggerEndCall();
  }
}

socket.on("incomingCall", async ({ signal, from, callType }) => {
  activeChatUserId = String(from);
  if (videoArea) videoArea.classList.remove("hidden");
  if (startCallBtn) startCallBtn.classList.add("hidden");
  if (endCallBtn) endCallBtn.classList.remove("hidden");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
      remoteStream = event.streams[0];
      if (remoteVideo) remoteVideo.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { to: activeChatUserId, candidate: event.candidate });
      }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answerCall", { signal: answer, to: activeChatUserId });
    isCalling = true;
  } catch (err) {
    console.error("❌ INCOMING CALL ERROR:", err);
  }
});

socket.on("callAccepted", async ({ signal }) => {
  try {
    if (peerConnection && signal) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    }
  } catch (err) {
    console.error("❌ CALL ACCEPTED ERROR:", err);
  }
});

socket.on("iceCandidate", async ({ candidate }) => {
  try {
    if (peerConnection && candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (err) {}
});

socket.on("callEnded", () => cleanupCall());

function triggerEndCall() {
  if (activeChatUserId) socket.emit("endCall", { to: activeChatUserId });
  cleanupCall();
}

function cleanupCall() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  if (videoArea) videoArea.classList.add("hidden");
  if (startCallBtn) startCallBtn.classList.remove("hidden");
  if (endCallBtn) endCallBtn.classList.add("hidden");
  isCalling = false;
}

if (startCallBtn) startCallBtn.addEventListener("click", startVideoCall);
if (endCallBtn) endCallBtn.addEventListener("click", triggerEndCall);

// ======================================================
// HELPER FUNCTIONS & INITIALIZATION
// ======================================================
function scrollToBottom() {
  if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}

function escapeAttribute(str) {
  return escapeHTML(str);
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

document.addEventListener("DOMContentLoaded", () => {
  loadConversations();
  if (activeChatUserId) {
    selectChatTarget(activeChatUserId, activeChatUsername);
  }
});