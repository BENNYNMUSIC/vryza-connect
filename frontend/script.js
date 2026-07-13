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

const currentUserId = String(user._id || user.id);

// ================= INITIALIZE CONVERSATION CHANNEL ROUTE =================
socket.emit("join", currentUserId);

// ================= UI DOM ELEMENT POOL HOOKS =================
const onlineUsersDiv = document.getElementById("onlineUsers");
const messagesDiv = document.getElementById("messages");
const groupMessagesDiv = document.getElementById("groupMessages");
const feedDiv = document.getElementById("feed");
const receiverInput = document.getElementById("receiverId");

// ================= GLOBAL STATE =================
let selectedUserId = null;
let selectedUsername = "";

// ================= PROFILE NAVIGATION HANDLER =================
function openProfile(userId) {
  if (!userId || userId === "undefined" || userId === "null") {
    alert("Invalid user profile configuration.");
    return;
  }
  localStorage.setItem("profileUserId", String(userId));
  window.location.href = "user.html";
}

// ================= DIRECTORY DISCOVERY AND ACTIVE USER MANAGEMENT =================
socket.on("onlineUsers", async (usersList) => {
  console.log("🌐 REFRESH DIRECTORY SNAPSHOT:", usersList);
  if (!onlineUsersDiv) return;

  const fragment = document.createDocumentFragment();

  for (const id of usersList) {
    if (String(id) === currentUserId) continue;

    let username = `User ${String(id).substring(0, 6)}`;
    let profilePic = "";

    try {
      const res = await fetch(`${API}/api/users/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      
      const profileData = data.user || data;
      username = profileData.username || username;
      profilePic = profileData.profilePic || "";
    } catch (err) {
      console.warn("⚠️ Metadata stream incomplete for peer element:", id);
    }

    const div = document.createElement("div");
    const isActive = selectedUserId && selectedUserId === String(id);

    div.className = `
      flex items-center justify-between border px-4 py-3 rounded-2xl cursor-pointer transition-all my-1.5
      ${isActive ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-blue-50/50"}
    `;

    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shadow-inner text-sm font-bold text-slate-600">
          ${profilePic ? `<img src="${profilePic}" class="w-full h-full object-cover" />` : username.charAt(0).toUpperCase()}
        </div>
        <div>
          <p class="font-semibold text-sm text-slate-700">${username}</p>
          <p class="text-xs text-emerald-500 flex items-center gap-1">
            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Online
          </p>
        </div>
      </div>
      <button class="profileBtn bg-white hover:bg-slate-100 border border-slate-200 shadow-sm px-3 py-1 rounded-xl text-xs font-medium text-slate-600 transition">
        Profile
      </button>
    `;

    div.addEventListener("click", () => {
      selectedUserId = String(id);
      selectedUsername = username;
      
      if (receiverInput) receiverInput.value = `Chatting with ${selectedUsername}`;
      
      loadMessages();
      socket.emit("getOnlineUsers"); 
    });

    div.querySelector(".profileBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      openProfile(String(id));
    });

    fragment.appendChild(div);
  }

  onlineUsersDiv.innerHTML = "";
  onlineUsersDiv.appendChild(fragment);
});

// ================= DISCOVER TIMELINE POST FEED MANAGEMENT =================
async function loadPosts() {
  if (!feedDiv) return;

  try {
    const res = await fetch(`${API}/api/posts`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    const posts = data.posts || data;
    feedDiv.innerHTML = "";

    if (!Array.isArray(posts) || posts.length === 0) {
      feedDiv.innerHTML = `<div class="text-center text-slate-400 py-8 italic text-sm">No activity inside the local feed cluster yet.</div>`;
      return;
    }

    posts.reverse().forEach(post => {
      const userData = post.userId || post.user || {};
      const targetAuthorId = String(userData._id || userData.id || post.userId);
      const div = document.createElement("div");
      div.className = "bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm my-4";

      const imageElement = post.image
        ? `<div class="border-t border-slate-100 bg-slate-50"><img src="${API}/uploads/${post.image}" class="w-full max-h-[500px] object-cover block" loading="lazy"/></div>`
        : "";

      div.innerHTML = `
        <div class="p-5">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3 cursor-pointer group" onclick="openProfile('${targetAuthorId}')">
              <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center rounded-full font-bold shadow-md">
                ${(userData.username || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p class="font-bold text-slate-800 group-hover:text-blue-600 transition">${userData.username || "Anonymous User"}</p>
                <p class="text-[11px] text-slate-400">Vryza Network Member</p>
              </div>
            </div>

            ${targetAuthorId !== currentUserId ? `
              <button onclick="followUser('${targetAuthorId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition">
                Follow
              </button>
            ` : ""}
          </div>
          <p class="text-slate-700 text-sm leading-relaxed">${post.caption || ""}</p>
        </div>
        ${imageElement}
      `;

      feedDiv.appendChild(div);
    });

  } catch (err) {
    console.error("❌ CRITICAL SOCIAL TIMELINE EXTRACTION ERROR:", err);
  }
}

// ================= CREATE POST SYSTEM ENGINE =================
async function createPost() {
  const captionInput = document.getElementById("caption");
  const fileInput = document.getElementById("imageFile");
  if (!captionInput) return;

  const caption = captionInput.value.trim();
  const file = fileInput?.files[0];

  if (!caption && !file) {
    alert("Please provide either a caption or a media element before uploading.");
    return;
  }

  const formData = new FormData();
  formData.append("caption", caption);
  if (file) formData.append("image", file);

  try {
    const res = await fetch(`${API}/api/posts`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      captionInput.value = "";
      if (fileInput) fileInput.value = "";
      
      const previewBox = document.getElementById("mediaDisplayPreview");
      const placeholderTxt = document.getElementById("uploadPlaceholderText");
      if (previewBox) { previewBox.innerHTML = ""; previewBox.classList.add("hidden"); }
      if (placeholderTxt) placeholderTxt.innerText = "Click to upload image";

      loadPosts();
    } else {
      alert(data.message || "Post transmission processing rejected by storage engine.");
    }
  } catch (err) {
    console.error("❌ CRITICAL FEED POST COMPILING FAULT:", err);
  }
}

// ================= SOCIAL GRAPH RELATIONSHIPS =================
async function followUser(targetUserId) {
  if (!targetUserId || targetUserId === "undefined") return;

  try {
    const res = await fetch(`${API}/api/user/follow/${targetUserId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || "Social relationship status updated successfully!");
    } else {
      alert(data.message || "Unable to adjust follow tracking targets.");
    }
  } catch (err) {
    console.error("❌ RELATIONSHIP TRANSIT FAULT:", err);
  }
}

// ================= BACKEND STORAGE RESYNC LOGIC =================
async function loadMessages() {
  if (!selectedUserId || !messagesDiv) return;

  try {
    messagesDiv.innerHTML = `<div class="text-center text-slate-400 py-4 italic text-xs animate-pulse">Loading conversation...</div>`;

    const res = await fetch(`${API}/api/messages/${selectedUserId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "userid": currentUserId,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    const historicalFeed = data.messages || data;
    messagesDiv.innerHTML = "";

    if (!Array.isArray(historicalFeed) || historicalFeed.length === 0) {
      messagesDiv.innerHTML = `<div class="text-center text-slate-400 py-6 italic text-xs">Empty Log.</div>`;
      return;
    }

    historicalFeed.forEach((msg) => {
      const sender = (msg.senderId || msg.sender)?.toString();
      const type = sender === currentUserId ? "sent" : "received";
      if (msg.text || msg.message) addMessage(msg.text || msg.message, type);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (err) {
    console.error("❌ MESSAGES TIMELINE EXTRACTION ERROR:", err);
  }
}

// ================= TRANSIT CHAT CONTENT BLOCKS =================
function sendMessage() {
  const input = document.getElementById("message");
  if (!input) return;

  const text = input.value.trim();
  if (!text || !selectedUserId) return;

  socket.emit("sendMessage", {
    senderId: currentUserId,
    receiverId: selectedUserId,
    message: text,
    text: text
  });

  addMessage(text, "sent");
  input.value = "";
}

// ================= REALTIME BROADCAST DISPATCH GROUP CONDUIT =================
function sendGroupMessage() {
  const input = document.getElementById("groupMessage");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  socket.emit("sendGroupMessage", {
    senderId: currentUserId,
    username: user.username || "Peer",
    message: text,
    text: text
  });

  input.value = "";
}

// ================= DOM ELEMENT INJECTION BUILDERS =================
function addMessage(text, type) {
  if (!messagesDiv) return;

  const div = document.createElement("div");
  const base = "max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm my-1.5 clear-both break-words transition-all";

  if (type === "sent") {
    div.className = `${base} ml-auto bg-blue-600 text-white rounded-tr-none`;
  } else {
    div.className = `${base} mr-auto bg-white text-slate-700 border border-slate-100 rounded-tl-none`;
  }

  div.innerText = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ================= REALTIME CALLS & NOTIFICATIONS ENGINE INTERCEPTORS =================

// 1. Catch Unified Schema Database Notifications (Messages, Likes, System)
socket.on("notificationReceived", async (notif) => {
  console.log("🔔 ALARM INTERCEPT: Received a new database event:", notif);
  
  // If we are currently actively typing/chatting with this sender, do not throw a toast alert
  if (selectedUserId && selectedUserId === String(notif.from)) return;

  let originName = "Someone";
  try {
    const res = await fetch(`${API}/api/users/${notif.from}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    originName = (data.user || data).username || originName;
  } catch (e) {
    console.warn("Unable to resolve username for alert.");
  }

  showGlobalToastAlert(originName, notif.type);
});

// 2. Catch Live WebRTC Incoming Phone/Video Calling Signals
socket.on("incomingCall", async (data) => {
  console.log("📞 INCOMING TELEPHONY SIGNAL INTERCEPT:", data);
  
  let callerName = "Unknown Connection";
  try {
    const res = await fetch(`${API}/api/users/${data.from}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const dataRes = await res.json();
    callerName = (dataRes.user || dataRes).username || callerName;
  } catch (e) {}

  showFullScreenCallModal(callerName, data.signal, data.from);
});

// ================= NOTIFICATION INTERFACE INJECTION UTILITIES =================

function showGlobalToastAlert(senderName, type) {
  let toastContainer = document.getElementById("global-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "global-toast-container";
    toastContainer.className = "fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl p-4 rounded-2xl flex items-center gap-3 transition-all transform translate-x-12 opacity-0 duration-300 pointer-events-auto max-w-sm";
  
  let label = "Interacted with you.";
  let badgeColor = "bg-blue-500";
  
  if (type === "message") { label = "sent you a direct message."; badgeColor = "bg-indigo-500"; }
  if (type === "incoming_call") { label = "is trying to call you."; badgeColor = "bg-emerald-500"; }
  if (type === "like") { label = "liked your post."; badgeColor = "bg-rose-500"; }
  if (type === "comment") { label = "commented on your timeline."; badgeColor = "bg-amber-500"; }

  toast.innerHTML = `
    <div class="w-2.5 h-2.5 rounded-full ${badgeColor} shrink-0"></div>
    <div class="flex-1">
      <p class="text-xs font-bold text-slate-800">${senderName}</p>
      <p class="text-[11px] text-slate-500">${label}</p>
    </div>
  `;

  toastContainer.appendChild(toast);
  
  // Trigger slide animation
  setTimeout(() => { toast.classList.remove("translate-x-12", "opacity-0"); }, 10);
  
  // Clean up element automatically after expiration delay
  setTimeout(() => {
    toast.classList.add("translate-x-12", "opacity-0");
    setTimeout(() => { toast.remove(); }, 300);
  }, 4500);
}

function showFullScreenCallModal(callerName, signalData, callerId) {
  // Prevent duplicate interface layering stack issues
  if (document.getElementById("telephony-overlay-modal")) return;

  const modal = document.createElement("div");
  modal.id = "telephony-overlay-modal";
  modal.className = "fixed inset-0 bg-slate-900/80 backdrop-blur-lg z-[99999] flex items-center justify-center p-4 animate-fade-in";
  
  modal.innerHTML = `
    <div class="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 transform transition-all scale-95 duration-300">
      <div class="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg shadow-emerald-200">
        ${callerName.charAt(0).toUpperCase()}
        <span class="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-75"></span>
      </div>
      
      <h3 class="text-xl font-black text-slate-800 tracking-tight mb-1">${callerName}</h3>
      <p class="text-xs text-slate-400 font-medium mb-8">Incoming Communication Link...</p>
      
      <div class="flex gap-4 justify-center">
        <button id="declineCallBtn" class="bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md transition flex items-center gap-2">
          Decline
        </button>
        <button id="acceptCallBtn" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md transition flex items-center gap-2">
          Accept Call
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Hook operational controller events inside layouts
  modal.querySelector("#declineCallBtn").addEventListener("click", () => {
    socket.emit("endCall", { to: callerId });
    modal.remove();
  });

  modal.querySelector("#acceptCallBtn").addEventListener("click", () => {
    console.log("Accepting call line...");
    socket.emit("answerCall", { to: callerId, signal: signalData });
    
    // Redirect context variables or reveal local communication layout components here
    modal.remove();
    alert("Connection linking sequence running via signaling bridge setup...");
  });

  // Handle call terminating externally while window remains open
  socket.on("callEnded", () => {
    modal.remove();
  });
}

// ================= SOCKET EVENT HOOK RECEIVERS =================
socket.on("receiveMessage", (data) => {
  const incomingSender = (data.senderId || data.sender)?.toString();
  if (incomingSender === selectedUserId) {
    addMessage(data.message || data.text, "received");
  }
});

socket.on("receiveGroupMessage", (data) => {
  console.log("🌍 GROUP CHAT OVERLAY INTERCEPT:", data);
  if (!groupMessagesDiv) return;

  const div = document.createElement("div");
  const isMe = String(data.senderId || data.sender) === currentUserId;
  
  const base = "max-w-[80%] px-3 py-2 rounded-2xl text-xs my-1 clear-both break-words shadow-sm flex flex-col";
  
  if (isMe) {
    div.className = `${base} ml-auto bg-indigo-600 text-white rounded-tr-none`;
    div.innerHTML = `<span class="text-[10px] text-indigo-200 font-bold">You</span><span>${data.message || data.text}</span>`;
  } else {
    div.className = `${base} mr-auto bg-white text-slate-700 border border-slate-100 rounded-tl-none`;
    div.innerHTML = `<span class="text-[10px] text-indigo-500 font-bold">${data.username || "Global Peer"}</span><span>${data.message || data.text}</span>`;
  }

  groupMessagesDiv.appendChild(div);
  groupMessagesDiv.scrollTop = groupMessagesDiv.scrollHeight;
});

// ================= KEY BIND INTERCEPT LISTENER INITIALIZATION =================
document.getElementById("message")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

document.getElementById("groupMessage")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendGroupMessage();
});

// ================= ATTACH GLOBAL RUNTIME HOOKS =================
window.openProfile = openProfile;
window.followUser = followUser;
window.sendMessage = sendMessage;
window.sendGroupMessage = sendGroupMessage;
window.createPost = createPost;
window.loadPosts = loadPosts;

// Execute timeline extraction loop on boot sequence load
loadPosts();