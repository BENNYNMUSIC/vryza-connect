const API = "https://vryza-connect-backend-1.onrender.com";

const rawToken = localStorage.getItem("token") || "";
const token = rawToken.replace(/^Bearer\s+/i, "").trim();
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user || (!user.id && !user._id)) {
  location.href = "auth.html";
}

const currentUserId = (user.id || user._id).toString();

const socket = io(API, {
  auth: { token }
});

let receiverId = null;
let currentChatType = "user"; // "user" or "group"
let allFriends = [];

// DOM Selectors
const contactsContainer = document.getElementById("onlineUsers");
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("message");
const mediaInput = document.getElementById("mediaInput");
const chatWith = document.getElementById("chatWith");
const typingText = document.getElementById("typing");
const searchInput = document.getElementById("searchUser");
const contactsAside = document.getElementById("contactsAside");
const chatSection = document.getElementById("chatSection");
const startCallBtn = document.getElementById("startCall");
const endCallBtn = document.getElementById("endCall");

// Voice & WebRTC Globals
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let localStream = null;
let peerConnection = null;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

// Helper: Safely extract ID string whether populated object or raw ID string
function extractId(entity) {
  if (!entity) return "";
  if (typeof entity === "object") {
    return (entity._id || entity.id || "").toString();
  }
  return entity.toString();
}

// ================= MOBILE NAVIGATION =================
function showContactsView() {
  if (!contactsAside || !chatSection) return;
  contactsAside.classList.remove("hidden");
  contactsAside.classList.add("flex");
  chatSection.classList.add("hidden");
  chatSection.classList.remove("flex");
}

function showChatView() {
  if (!contactsAside || !chatSection) return;
  if (window.innerWidth < 768) {
    contactsAside.classList.add("hidden");
    contactsAside.classList.remove("flex");
    chatSection.classList.remove("hidden");
    chatSection.classList.add("flex");
  }
}

// ================= SOCKET CONNECT =================
socket.on("connect", () => {
  console.log("🟢 SOCKET CONNECTED:", socket.id);
  socket.emit("join", currentUserId);
});

socket.on("connect_error", (err) => {
  console.error("❌ SOCKET CONNECTION ERROR:", err.message);
});

// ================= LOAD & RENDER FRIENDS =================
async function loadFriends() {
  try {
    const res = await fetch(`${API}/api/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!data.success || !data.friends || !data.friends.length) {
      if (contactsContainer) {
        contactsContainer.innerHTML = `
          <div class="text-center text-slate-400 text-sm py-4">No friends yet</div>
        `;
      }
      return;
    }

    allFriends = data.friends;
    renderFriends(allFriends);

    const savedActiveChat = localStorage.getItem("activeChatUser");
    if (savedActiveChat) {
      try {
        const lastUser = JSON.parse(savedActiveChat);
        if (lastUser && (lastUser._id || lastUser.id)) {
          openChat(lastUser);
        }
      } catch (e) {
        console.error("Error restoring chat session:", e);
      }
    }
  } catch (err) {
    console.error("Error loading contacts list:", err);
    if (contactsContainer) {
      contactsContainer.innerHTML = `
        <div class="text-center text-red-400 text-sm py-4">Failed to load friends</div>
      `;
    }
  }
}

function renderFriends(friendsList) {
  if (!contactsContainer) return;
  contactsContainer.innerHTML = "";

  if (!friendsList.length) {
    contactsContainer.innerHTML = `
      <div class="text-center text-slate-400 text-xs py-4">No contacts found</div>
    `;
    return;
  }

  friendsList.forEach((friend) => {
    const friendId = extractId(friend);
    const isActive = receiverId && receiverId === friendId;

    const card = document.createElement("div");
    card.className = `
      p-2.5 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer hover:bg-slate-50
      flex items-center gap-3 transition-all border
      ${isActive ? "bg-blue-50/80 border-blue-200 shadow-sm" : "bg-white border-slate-100"}
    `;

    const avatar = friend.profilePic
      ? (friend.profilePic.startsWith("http") ? friend.profilePic : `${API}/uploads/${friend.profilePic}`)
      : "images/default-avatar.png";

    card.innerHTML = `
      <img src="${avatar}" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-slate-100" alt="avatar">
      <div class="flex-1 overflow-hidden">
        <div class="font-semibold text-slate-700 text-xs sm:text-sm truncate">${friend.username}</div>
        <div class="text-[10px] sm:text-[11px] text-slate-400 truncate">@${friend.username.toLowerCase()}</div>
      </div>
    `;

    card.onclick = () => openChat(friend);
    contactsContainer.appendChild(card);
  });
}

// ================= LIVE SEARCH =================
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = allFriends.filter(
      (f) => f.username && f.username.toLowerCase().includes(term)
    );
    renderFriends(filtered);
  });
}

// ================= OPEN CHAT =================
function openChat(friend) {
  if (!friend) return;

  if (receiverId && currentChatType === "group") {
    socket.emit("leaveGroup", receiverId);
  }

  receiverId = extractId(friend);
  currentChatType = "user";

  if (!receiverId) return;

  localStorage.setItem(
    "activeChatUser",
    JSON.stringify({ _id: receiverId, username: friend.username })
  );
  localStorage.setItem("chatUserId", receiverId);

  if (chatWith) chatWith.innerText = `Chatting with ${friend.username}`;
  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div class="text-center text-slate-400 text-xs italic">Loading thread...</div>
    `;
  }

  renderFriends(allFriends);

  socket.emit("openChat", {
    userId: currentUserId,
    chattingWith: receiverId
  });

  openConversation(receiverId);
  loadMessages();
  showChatView();
}

// ================= MARK READ =================
async function openConversation(senderId) {
  if (!senderId) return;
  try {
    await fetch(`${API}/api/messages/read/${senderId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (typeof fetchUnreadChatCount === "function") {
      fetchUnreadChatCount();
    }
  } catch (err) {
    console.error("Failed to mark messages as read:", err);
  }
}

// ================= LOAD MESSAGES =================
async function loadMessages() {
  if (!receiverId || currentChatType !== "user") return;

  try {
    const res = await fetch(`${API}/api/messages/${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!messagesContainer) return;
    messagesContainer.innerHTML = "";

    if (!data.messages || !data.messages.length) {
      messagesContainer.innerHTML = `
        <div id="emptyChat" class="text-center text-slate-400 text-sm mt-10 italic">
          No messages yet. Say hello!
        </div>
      `;
      return;
    }

    data.messages.forEach((msg) => {
      const msgSender = extractId(msg.senderId);
      const mine = msgSender === currentUserId;

      if (msg.mediaType === "audio" || (msg.media && msg.media.startsWith("data:audio"))) {
        addVoiceMessageToDOM(msg.media, mine ? "sent" : "received");
      } else if (msg.media) {
        addMediaMessageToDOM(msg.media, msg.mediaType || "image", mine ? "sent" : "received");
      } else if (msg.text) {
        addMessage(msg.text, mine ? "sent" : "received");
      }
    });
  } catch (err) {
    console.error("Error fetching message records:", err);
  }
}

// ================= SEND MESSAGE =================
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (!receiverId) {
    alert("Select a friend first");
    return;
  }

  socket.emit("sendMessage", {
    senderId: currentUserId,
    receiverId: receiverId,
    text: text
  });

  messageInput.value = "";
  socket.emit("stopTyping", { senderId: currentUserId, receiverId: receiverId });
}

// ================= RECEIVE MESSAGE =================
socket.on("receiveMessage", (msg) => {
  if (!msg) return;

  const senderId = extractId(msg.senderId);
  const msgReceiverId = extractId(msg.receiverId);
  const activeId = extractId(receiverId);

  const emptyChat = document.getElementById("emptyChat");
  if (emptyChat) emptyChat.remove();

  const mine = senderId === currentUserId;

  if (senderId === activeId || msgReceiverId === activeId) {
    if (msg.mediaType === "audio" || (msg.media && msg.media.startsWith("data:audio"))) {
      addVoiceMessageToDOM(msg.media, mine ? "sent" : "received");
    } else if (msg.media) {
      addMediaMessageToDOM(msg.media, msg.mediaType || "image", mine ? "sent" : "received");
    } else if (msg.text) {
      addMessage(msg.text, mine ? "sent" : "received");
    }
  }
});

// ================= MEDIA UPLOAD =================
if (mediaInput) {
  mediaInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !receiverId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      const fileType = file.type.startsWith("video") ? "video" : "image";

      socket.emit("sendVoice", {
        senderId: currentUserId,
        receiverId: receiverId,
        audio: base64Data,
        mediaType: fileType
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  });
}

// ================= DOM MESSAGE HELPERS =================
function addMessage(text, type) {
  if (!messagesContainer) return;

  const div = document.createElement("div");
  div.className =
    type === "sent"
      ? "bg-blue-600 text-white ml-auto max-w-[80%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl shadow-sm text-xs sm:text-sm break-words"
      : "bg-slate-200 text-slate-800 mr-auto max-w-[80%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl shadow-sm text-xs sm:text-sm break-words";

  div.innerText = text;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addVoiceMessageToDOM(base64Audio, type) {
  if (!messagesContainer) return;

  const div = document.createElement("div");
  div.className =
    type === "sent"
      ? "bg-blue-600 text-white ml-auto max-w-[85%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl flex flex-col gap-1 shadow-sm"
      : "bg-slate-200 text-slate-800 mr-auto max-w-[85%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl flex flex-col gap-1 shadow-sm";

  div.innerHTML = `
    <span class="text-[9px] sm:text-[10px] opacity-70 font-semibold uppercase tracking-wider">
      ${type === "sent" ? "Your Voice Note" : "Voice Note"}
    </span>
    <audio src="${base64Audio}" controls class="w-40 sm:w-48 h-8 mt-1 rounded"></audio>
  `;

  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addMediaMessageToDOM(mediaUrl, mediaType, type) {
  if (!messagesContainer) return;

  const div = document.createElement("div");
  div.className =
    type === "sent"
      ? "bg-blue-600 ml-auto max-w-[85%] sm:max-w-xs p-2 rounded-2xl shadow-sm"
      : "bg-slate-200 mr-auto max-w-[85%] sm:max-w-xs p-2 rounded-2xl shadow-sm";

  if (mediaType === "video") {
    div.innerHTML = `<video src="${mediaUrl}" controls class="w-full rounded-xl max-h-48 object-cover"></video>`;
  } else {
    div.innerHTML = `<img src="${mediaUrl}" class="w-full rounded-xl max-h-48 object-cover" alt="Media Attachment">`;
  }

  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= TYPING INDICATORS =================
let typingTimeout;
if (messageInput) {
  messageInput.addEventListener("input", () => {
    if (!receiverId) return;
    socket.emit("typing", { senderId: currentUserId, receiverId: receiverId });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", { senderId: currentUserId, receiverId: receiverId });
    }, 2000);
  });

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

socket.on("userTyping", (data) => {
  if (extractId(data.senderId) === extractId(receiverId) && typingText) {
    typingText.innerText = "Typing...";
  }
});

socket.on("userStopTyping", (data) => {
  if (extractId(data.senderId) === extractId(receiverId) && typingText) {
    typingText.innerText = "";
  }
});

// ================= VOICE RECORDING =================
async function toggleRecording() {
  const micBtn = document.getElementById("micBtn");
  if (!receiverId) {
    alert("Select a friend first before recording.");
    return;
  }

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          socket.emit("sendVoice", {
            senderId: currentUserId,
            receiverId: receiverId,
            audio: reader.result,
            mediaType: "audio"
          });
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;

      if (micBtn) {
        micBtn.className =
          "w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-500 text-white transition shadow-md flex items-center justify-center text-sm sm:text-lg animate-pulse";
        micBtn.innerText = "🛑";
      }
    } catch (err) {
      console.error("Mic access failure:", err);
      alert("Microphone permission denied or device unavailable.");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;

    if (micBtn) {
      micBtn.className =
        "w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white hover:bg-red-50 hover:text-red-500 text-slate-500 transition shadow-sm flex items-center justify-center text-sm sm:text-lg";
      micBtn.innerText = "🎙️";
    }
  }
}

socket.on("receiveVoice", (data) => {
  if (!data) return;
  const senderId = extractId(data.senderId);
  const activeId = extractId(receiverId);

  if (senderId === activeId || extractId(data.receiverId) === activeId) {
    const emptyChat = document.getElementById("emptyChat");
    if (emptyChat) emptyChat.remove();

    const mine = senderId === currentUserId;
    if (data.mediaType === "audio" || (data.audio && data.audio.startsWith("data:audio"))) {
      addVoiceMessageToDOM(data.audio || data.media, mine ? "sent" : "received");
    } else if (data.audio || data.media) {
      addMediaMessageToDOM(data.audio || data.media, data.mediaType || "image", mine ? "sent" : "received");
    }
  }
});

// ================= WEBRTC CALLING ENGINE =================
async function setupWebRTC() {
  peerConnection = new RTCPeerConnection(rtcConfig);
  if (!localStream) throw new Error("Local stream unavailable");

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo && event.streams[0]) remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && receiverId) {
      socket.emit("iceCandidate", { to: receiverId, candidate: event.candidate });
    }
  };
}

if (startCallBtn) {
  startCallBtn.addEventListener("click", async () => {
    if (!receiverId) {
      alert("Select a friend to call first!");
      return;
    }

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = document.getElementById("localVideo");
      if (localVideo) localVideo.srcObject = localStream;

      document.getElementById("videoArea")?.classList.remove("hidden");
      startCallBtn.classList.add("hidden");
      endCallBtn?.classList.remove("hidden");

      await setupWebRTC();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("callUser", { userToCall: receiverId, signalData: offer, from: currentUserId });
      if (chatWith) chatWith.innerText = "Calling friend...";
    } catch (err) {
      console.error("Camera/Mic failure:", err);
      alert("Could not start call. Grant camera and microphone permissions.");
    }
  });
}

function triggerEndCall() {
  if (receiverId) socket.emit("endCall", { to: receiverId });
  endActiveStream();
}

if (endCallBtn) endCallBtn.addEventListener("click", triggerEndCall);

socket.on("incomingCall", async (data) => {
  const accept = confirm("Incoming call! Would you like to accept?");
  if (!accept) {
    socket.emit("endCall", { to: data.from });
    return;
  }

  receiverId = extractId(data.from);
  document.getElementById("videoArea")?.classList.remove("hidden");
  startCallBtn?.classList.add("hidden");
  endCallBtn?.classList.remove("hidden");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = document.getElementById("localVideo");
    if (localVideo) localVideo.srcObject = localStream;

    await setupWebRTC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answerCall", { signal: answer, to: data.from });
    if (chatWith) chatWith.innerText = "Call Connected";
  } catch (err) {
    console.error("Error answering call:", err);
  }
});

socket.on("callAccepted", async (signal) => {
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    if (chatWith) chatWith.innerText = "Call Connected";
  }
});

socket.on("iceCandidate", async (data) => {
  if (peerConnection && data.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

socket.on("callEnded", () => {
  alert("The call has ended.");
  endActiveStream();
});

function endActiveStream() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;

  document.getElementById("videoArea")?.classList.add("hidden");
  startCallBtn?.classList.remove("hidden");
  endCallBtn?.classList.add("hidden");

  if (chatWith) {
    chatWith.innerText = receiverId ? "Conversation Active" : "Select a conversation";
  }
}

// Initial Load
loadFriends();

// Global Binds
window.sendMessage = sendMessage;
window.toggleRecording = toggleRecording;
window.showContactsView = showContactsView;
window.triggerEndCall = triggerEndCall;
window.openConversation = openConversation;