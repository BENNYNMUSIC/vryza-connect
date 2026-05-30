// ================= MASTER SERVER PATHWAY LOCATORS =================
const API = "https://vryza-connect-backend-production.up.railway.app";

// ================= ESTABLISH REALTIME NETWORK CONDUIT =================
const socket = io(API, {
  transports: ["websocket", "polling"],
  secure: true
});

// ================= DIAGNOSTIC LINK MONITORING =================
socket.on("connect", () => {
  console.log("🟢 ENGINE: Realtime synchronization terminal online. ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.warn("❌ ENGINE: Synchronization terminal dropped connection.", err.message);
});

// ================= ACCOUNT PROFILE STATE VALIDATION =================
const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  alert("Identity handshake missing. Please authenticate.");
  window.location.href = "auth.html";
}

const currentUserId = (user._id || user.id).toString();

// ================= ACTIVE CONVERSATION TARGETING =================
let receiverId = localStorage.getItem("chatUserId");
let receiverName = localStorage.getItem("chatUsername");

if (receiverId) receiverId = receiverId.toString();

// ================= UI DOM ELEMENT POOL HOOKS =================
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("message");
const typingText = document.getElementById("typing");
const chatWithHeader = document.getElementById("chatWith");
const startCallBtn = document.getElementById("startCall");
const videoArea = document.getElementById("videoArea");

// Sync initial header label text cleanly on boot sequence load
function updateChatHeader() {
  if (chatWithHeader) {
    chatWithHeader.innerText = receiverName ? `Chatting with ${receiverName}` : "Select a conversation";
  }
}
updateChatHeader();

// ================= INITIALIZE CONVERSATION CHANNEL ROUTE =================
socket.emit("join", currentUserId);

// ================= BACKEND STORAGE RESYNC LOGIC =================
async function loadMessages() {
  if (!receiverId || !messagesContainer) return;

  try {
    messagesContainer.innerHTML = `
      <div class="text-center text-slate-400 py-4 italic animate-pulse">
        Synchronizing encrypted timeline data...
      </div>
    `;

    const res = await fetch(`${API}/api/messages/${receiverId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "userid": currentUserId,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    console.log("📥 TIMELINE DATA ARCHIVE RECEIVED:", data);

    if (!res.ok || data.success === false) {
      messagesContainer.innerHTML = `
        <div class="text-center text-red-400 py-4 font-semibold">
          ⚠️ Timeline synchronization failed.
        </div>
      `;
      return;
    }

    const historicalFeed = data.messages || data;
    messagesContainer.innerHTML = "";

    // If conversation is empty, show the placeholder layout node cleanly
    if (!Array.isArray(historicalFeed) || historicalFeed.length === 0) {
      messagesContainer.innerHTML = `
        <div id="emptyChat" class="text-center text-slate-400 text-sm mt-10 italic">
          Start chatting with someone online
        </div>
      `;
      return;
    }

    historicalFeed.forEach((msg) => {
      const sender = (msg.senderId || msg.sender)?.toString();
      const type = sender === currentUserId ? "sent" : "received";

      if (msg.text) addMessage(msg.text, type);
      if (msg.media) addMediaMessage(msg.media, msg.mediaType, type);
      if (msg.audio) addVoiceMessage(msg.audio, type);
    });

    scrollBottom();

  } catch (err) {
    console.error("❌ CRITICAL CONVERSATION RECOVERY TRAVERSAL ERROR:", err);
  }
}

// ================= TRANSIT CHAT CONTENT BLOCKS =================
function sendMessage() {
  if (!messageInput) return;
  const text = messageInput.value.trim();

  if (!text || !receiverId) return;

  // Remove placeholder if present before pushing new item fragments
  const emptyChatPlaceholder = document.getElementById("emptyChat");
  if (emptyChatPlaceholder) emptyChatPlaceholder.remove();

  // Real-time broadcast dispatch
  socket.emit("sendMessage", {
    senderId: currentUserId,
    receiverId: receiverId,
    message: text
  });

  addMessage(text, "sent");
  messageInput.value = "";
}

// Attach physical device keypress hooks
if (messageInput) {
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Native throttle updates typing patterns cleanly
  messageInput.addEventListener("input", () => {
    if (!receiverId) return;
    socket.emit("typing", { senderId: currentUserId, receiverId });
  });
}

// ================= SOCKET EVENT HOOK RECEIVERS =================
socket.on("receiveMessage", (data) => {
  console.log("💬 LIVE TEXT INTERCEPT:", data);
  const incomingSender = (data.senderId || data.sender)?.toString();
  if (incomingSender === receiverId) {
    const emptyChatPlaceholder = document.getElementById("emptyChat");
    if (emptyChatPlaceholder) emptyChatPlaceholder.remove();
    
    addMessage(data.message || data.text, "received");
  }
});

socket.on("userTyping", (data) => {
  const typingSender = data.senderId?.toString();
  if (typingSender !== receiverId) return;

  if (typingText) typingText.innerText = `${receiverName} is writing...`;

  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    if (typingText) typingText.innerText = "";
  }, 2000);
});

socket.on("receiveMedia", (data) => {
  console.log("🖼️ LIVE MULTIMEDIA INTERCEPT:", data);
  const mediaSender = data.senderId?.toString();
  if (mediaSender === receiverId) {
    const emptyChatPlaceholder = document.getElementById("emptyChat");
    if (emptyChatPlaceholder) emptyChatPlaceholder.remove();

    addMediaMessage(data.media, data.mediaType, "received");
  }
});

socket.on("receiveVoice", (data) => {
  console.log("🎙️ LIVE AUDIO INTERCEPT:", data);
  const voiceSender = data.senderId?.toString();
  if (voiceSender === receiverId) {
    const emptyChatPlaceholder = document.getElementById("emptyChat");
    if (emptyChatPlaceholder) emptyChatPlaceholder.remove();

    addVoiceMessage(data.audio || data.fileUrl, "received");
  }
});

// ================= DOM ELEMENT INJECTION BUILDERS =================
function addMessage(text, type) {
  if (!messagesContainer) return;
  const div = document.createElement("div");
  const base = "max-w-xs px-4 py-2.5 rounded-2xl text-sm break-words shadow-sm my-1.5 inline-block clear-both transition-all";

  div.className = type === "sent"
    ? `${base} bg-blue-600 text-white float-right rounded-tr-none`
    : `${base} bg-gray-200 text-gray-800 float-left rounded-tl-none`;

  div.innerText = text;
  messagesContainer.appendChild(div);
  scrollBottom();
}

function addMediaMessage(media, mediaType, type) {
  if (!messagesContainer) return;
  const div = document.createElement("div");
  const base = "max-w-xs p-1.5 rounded-2xl shadow-sm my-1.5 clear-both inline-block";

  div.className = type === "sent" ? `${base} bg-blue-600 float-right` : `${base} bg-gray-200 float-left`;

  const mediaUrl = media.startsWith("http") ? media : `${API}/uploads/${media}`;

  if (mediaType === "image" || (!mediaType && !media.endsWith(".mp4"))) {
    div.innerHTML = `<img src="${mediaUrl}" class="rounded-xl max-w-full max-h-60 object-cover block" loading="lazy" />`;
  } else {
    div.innerHTML = `<video controls class="rounded-xl max-w-full max-h-60 block"><source src="${mediaUrl}"></video>`;
  }

  messagesContainer.appendChild(div);
  scrollBottom();
}

function addVoiceMessage(audio, type) {
  if (!messagesContainer) return;
  const div = document.createElement("div");
  const base = "w-64 p-2 rounded-2xl shadow-sm my-1.5 clear-both inline-block";

  div.className = type === "sent" ? `${base} bg-blue-600 float-right` : `${base} bg-gray-200 float-left`;
  
  const audioUrl = audio.startsWith("data:") || audio.startsWith("http") ? audio : `${API}/uploads/${audio}`;

  div.innerHTML = `<audio controls src="${audioUrl}" class="w-full block focus:outline-none"></audio>`;
  messagesContainer.appendChild(div);
  scrollBottom();
}

function scrollBottom() {
  if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= ASYNC BINARY MULTIMEDIA FILE DISPATCH =================
const mediaInputElement = document.getElementById("mediaInput");
if (mediaInputElement) {
  mediaInputElement.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !receiverId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("senderId", currentUserId);
    formData.append("receiverId", receiverId);

    try {
      const res = await fetch(`${API}/api/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success !== false) {
        const emptyChatPlaceholder = document.getElementById("emptyChat");
        if (emptyChatPlaceholder) emptyChatPlaceholder.remove();

        addMediaMessage(data.media, data.mediaType, "sent");
      } else {
        alert(data.message || "File transmission rejected by storage engine.");
      }
    } catch (err) {
      console.error("❌ CONTENT DISPATCH FAILURE:", err);
    }
  });
}

// ================= AUDIO CAPTURE SYSTEM LAYER =================
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
  if (!receiverId) {
    alert("Please establish an active channel profile target first.");
    return;
  }

  const micBtn = document.getElementById("micBtn");

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = sendVoiceNote;
      
      mediaRecorder.start();
      isRecording = true;
      if (micBtn) micBtn.innerText = "⏹️";
    } catch (err) {
      alert("Microphone hardware channel configuration permission denied.");
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    isRecording = false;
    if (micBtn) micBtn.innerText = "🎤";
  }
}

function sendVoiceNote() {
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  const reader = new FileReader();

  reader.onload = () => {
    const base64Audio = reader.result;
    socket.emit("sendVoice", {
      senderId: currentUserId,
      receiverId: receiverId,
      audio: base64Audio
    });

    const emptyChatPlaceholder = document.getElementById("emptyChat");
    if (emptyChatPlaceholder) emptyChatPlaceholder.remove();

    addVoiceMessage(base64Audio, "sent");
  };
  reader.readAsDataURL(audioBlob);
}

// ================= DIRECTORY DISCOVERY AND ACTIVE USER MANAGEMENT =================
socket.on("onlineUsers", async (usersList) => {
  console.log("🌐 REFRESH DIRECTORY SNAPSHOT:", usersList);
  const targetOutputDiv = document.getElementById("onlineUsers");
  if (!targetOutputDiv) return;

  const fragment = document.createDocumentFragment();

  for (const id of usersList) {
    if (id.toString() === currentUserId) continue;

    let username = "Active Peer";
    let profilePic = "";

    try {
      const res = await fetch(`${API}/api/users/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      
      const profileData = data.user || data;
      username = profileData.username || "Account Profile";
      profilePic = profileData.profilePic || "";
    } catch (err) {
      console.warn("⚠️ Meta data stream incomplete for peer element:", id);
    }

    const itemContainer = document.createElement("div");
    
    // Highlight the item card if it matches our open active chat channel target selection
    const isActive = receiverId && receiverId === id.toString();
    itemContainer.className = `cursor-pointer border p-3 rounded-2xl transition flex items-center gap-3 my-2 ${
      isActive 
        ? "bg-blue-50 border-blue-200 shadow-sm" 
        : "bg-white border-slate-100 hover:bg-slate-50"
    }`;
    
    itemContainer.addEventListener("click", () => startChat(id, username));

    itemContainer.innerHTML = `
      <div class="w-11 h-11 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shadow-inner">
        ${profilePic ? `<img src="${profilePic}" class="w-full h-full object-cover" />` : "👤"}
      </div>
      <div class="flex-1">
        <h3 class="font-bold text-sm text-slate-700">${username}</h3>
        <p class="text-xs text-emerald-500 font-semibold flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Active Now
        </p>
      </div>
    `;
    fragment.appendChild(itemContainer);
  }

  targetOutputDiv.innerHTML = "";
  targetOutputDiv.appendChild(fragment);
});

function startChat(userId, username) {
  receiverId = userId.toString();
  receiverName = username;
  localStorage.setItem("chatUserId", receiverId);
  localStorage.setItem("chatUsername", receiverName);
  
  updateChatHeader();
  loadMessages();

  // Force-trigger an online directory rebuild to shift active color selection borders instantly
  socket.emit("getOnlineUsers"); 
}

// ================= LIVE INSTANT SEARCH FILTER SYSTEM HOOK =================
document.getElementById("searchUser")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  const contacts = document.querySelectorAll("#onlineUsers > div");

  contacts.forEach((card) => {
    const name = card.querySelector("h3")?.innerText.toLowerCase() || "";
    if (name.includes(query)) {
      card.style.setProperty("display", "flex", "important");
    } else {
      card.style.setProperty("display", "none", "important");
    }
  });
});

// ================= WEBRTC CONFERENCING INTERACTIVE CONTROLS =================
if (startCallBtn) {
  startCallBtn.addEventListener("click", async () => {
    if (!receiverId) {
      alert("Please select a user to establish a video connection stream.");
      return;
    }

    if (videoArea) {
      if (videoArea.classList.contains("hidden")) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          const localVideo = document.getElementById("localVideo");
          if (localVideo) localVideo.srcObject = stream;
          
          videoArea.classList.remove("hidden");
          videoArea.classList.add("grid");
          console.log("📹 Local hardware camera stream attached.");
        } catch (err) {
          alert("Unable to open hardware video camera module channel access.");
        }
      } else {
        // Toggle close and release active media source hardware feeds cleanly
        const localVideo = document.getElementById("localVideo");
        if (localVideo && localVideo.srcObject) {
          localVideo.srcObject.getTracks().forEach(track => track.stop());
          localVideo.srcObject = null;
        }
        videoArea.classList.remove("grid");
        videoArea.classList.add("hidden");
      }
    }
  });
}

const res = await fetch(
  `${API}/api/user/friends`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

const data = await res.json();

// ================= ATTACH CORE FUNCTION POOLS ON WINDOW RUNTIME =================
window.toggleRecording = toggleRecording;
window.startChat = startChat;
window.sendMessage = sendMessage;

// Initial execution setup on window frame boot loop
loadMessages();