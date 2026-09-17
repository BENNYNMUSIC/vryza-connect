// ================= MASTER SERVER PATHWAY LOCATORS =================
const API = "https://vryza-connect-backend-1.onrender.com";

// Helper for clean token acquisition
function getCleanToken() {
  const raw = localStorage.getItem("token");
  return raw ? raw.replace(/^Bearer\s+/i, "").trim() : null;
}

// ================= ACCOUNT PROFILE STATE VALIDATION =================
let user = null;
try {
  const storedUser = localStorage.getItem("user");
  user = storedUser ? JSON.parse(storedUser) : null;
} catch (err) {
  console.error("❌ Failed to parse stored user data:", err);
}

const token = getCleanToken();
const currentUserId = user ? String(user._id || user.id || "") : "";

if (!user || !token || !currentUserId || currentUserId === "undefined") {
  console.warn("⚠️ Identity handshake missing or invalid. Redirecting to auth...");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "auth.html";
}

// ================= ESTABLISH REALTIME NETWORK CONDUIT =================
const socket = io(API, {
  transports: ["websocket", "polling"],
  secure: true,
  auth: { token: token }
});

socket.on("connect", () => {
  console.log("🟢 ENGINE: Realtime synchronization terminal online. ID:", socket.id);
  socket.emit("join", currentUserId);
});

socket.on("connect_error", (err) => {
  console.warn("❌ ENGINE: Synchronization terminal dropped connection.", err.message);
});

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
  if (!onlineUsersDiv) return;

  const fragment = document.createDocumentFragment();

  for (const id of usersList) {
    const peerId = String(id);
    if (peerId === currentUserId) continue;

    let username = `User ${peerId.substring(0, 6)}`;
    let profilePic = "";

    try {
      let res = await fetch(`${API}/api/user/${peerId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`${API}/api/users/${peerId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        const profileData = data.user || data;
        username = profileData.username || username;
        profilePic = profileData.profilePic || "";
      }
    } catch (err) {
      console.warn("⚠️ Metadata stream incomplete for peer element:", peerId);
    }

    const div = document.createElement("div");
    const isActive = selectedUserId && selectedUserId === peerId;

    div.className = `
      flex items-center justify-between border px-3 py-2 rounded-2xl cursor-pointer transition-all my-1.5
      ${isActive ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-blue-50/50"}
    `;

    const avatarHtml = profilePic 
      ? `<img src="${profilePic.startsWith('http') ? profilePic : `${API}/uploads/${profilePic}`}" class="w-full h-full object-cover" onerror="this.src='images/default-avatar.png'"/>`
      : escapeHTML(username.charAt(0).toUpperCase());

    div.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shadow-inner text-xs font-bold text-slate-600">
          ${avatarHtml}
        </div>
        <div>
          <p class="font-semibold text-xs text-slate-700">${escapeHTML(username)}</p>
          <p class="text-[10px] text-emerald-500 flex items-center gap-1">
            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Online
          </p>
        </div>
      </div>
      <button class="profileBtn bg-white hover:bg-slate-100 border border-slate-200 shadow-sm px-2.5 py-1 rounded-xl text-[10px] font-medium text-slate-600 transition">
        Profile
      </button>
    `;

    div.addEventListener("click", () => {
      selectedUserId = peerId;
      selectedUsername = username;
      
      if (receiverInput) receiverInput.value = `Chatting with ${selectedUsername}`;
      
      loadMessages();
    });

    const profBtn = div.querySelector(".profileBtn");
    if (profBtn) {
      profBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openProfile(peerId);
      });
    }

    fragment.appendChild(div);
  }

  onlineUsersDiv.innerHTML = "";
  if (!fragment.hasChildNodes()) {
    onlineUsersDiv.innerHTML = `<p class="text-xs text-slate-400 italic">No other users online right now.</p>`;
  } else {
    onlineUsersDiv.appendChild(fragment);
  }
});

// ================= DISCOVER TIMELINE POST FEED MANAGEMENT =================
async function loadPosts() {
  if (!feedDiv) return;

  try {
    const res = await fetch(`${API}/api/posts`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

    const data = await res.json();
    const posts = data.posts || data;
    feedDiv.innerHTML = "";

    if (!Array.isArray(posts) || posts.length === 0) {
      feedDiv.innerHTML = `<div class="text-center text-slate-400 py-8 italic text-sm">No activity inside the local feed cluster yet.</div>`;
      return;
    }

    posts.forEach(post => {
      const postId = String(post._id || post.id || "");
      const userData = post.userId || post.user || {};
      const targetAuthorId = String(userData._id || userData.id || post.userId || "");
      const div = document.createElement("div");
      div.className = "bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm my-4";

      const imageElement = post.image
        ? `<div class="border-t border-slate-100 bg-slate-50"><img src="${post.image.startsWith('http') ? post.image : `${API}/uploads/${post.image}`}" class="w-full max-h-[500px] object-cover block" loading="lazy" onerror="this.parentElement.style.display='none'"/></div>`
        : "";

      const profilePic = userData.profilePic;
      const avatarContent = profilePic
        ? `<img src="${profilePic.startsWith('http') ? profilePic : `${API}/uploads/${profilePic}`}" class="w-full h-full object-cover rounded-full" onerror="this.src='images/default-avatar.png'"/>`
        : escapeHTML((userData.username || "U").charAt(0).toUpperCase());

      const isOwner = targetAuthorId === currentUserId;

      div.innerHTML = `
        <div class="p-5">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3 cursor-pointer group" onclick="openProfile('${targetAuthorId}')">
              <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center rounded-full font-bold shadow-md overflow-hidden">
                ${avatarContent}
              </div>
              <div>
                <p class="font-bold text-slate-800 group-hover:text-blue-600 transition">${escapeHTML(userData.username || "Anonymous User")}</p>
                <p class="text-[11px] text-slate-400">Vryza Network Member</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${!isOwner ? `
                <button onclick="followUser('${targetAuthorId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition">
                  Follow
                </button>
              ` : `
                <button onclick="deletePost('${postId}')" class="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm">
                  🗑️ Delete
                </button>
              `}
            </div>
          </div>
          <p class="text-slate-700 text-sm leading-relaxed">${escapeHTML(post.caption || "")}</p>
        </div>
        ${imageElement}
      `;

      feedDiv.appendChild(div);
    });

  } catch (err) {
    console.error("❌ CRITICAL SOCIAL TIMELINE EXTRACTION ERROR:", err);
  }
}

// ================= DELETE POST ENGINE =================
async function deletePost(postId) {
  if (!postId) return;
  if (!confirm("Are you sure you want to delete this post?")) return;

  try {
    const res = await fetch(`${API}/api/posts/${postId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
      loadPosts();
    } else {
      alert(data.message || "Unable to delete post.");
    }
  } catch (err) {
    console.error("❌ DELETE POST ERROR:", err);
    alert("Server connection failed while attempting to delete post.");
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
      if (placeholderTxt) placeholderTxt.innerHTML = `<span class="text-blue-600 font-semibold">Tap to upload media</span> (Image / Video)`;

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
      const sender = String(msg.senderId || msg.sender?._id || msg.sender?.id || msg.sender || "");
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
  const base = "max-w-[75%] px-4 py-2 rounded-2xl text-xs font-medium shadow-sm my-1 clear-both break-words transition-all";

  if (type === "sent") {
    div.className = `${base} ml-auto bg-blue-600 text-white rounded-tr-none`;
  } else {
    div.className = `${base} mr-auto bg-white text-slate-700 border border-slate-100 rounded-tl-none`;
  }

  div.innerText = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ================= SOCKET RECEIVERS =================
socket.on("receiveMessage", (data) => {
  const incomingSender = String(data.senderId || data.sender?._id || data.sender?.id || data.sender || "");
  if (incomingSender === selectedUserId) {
    addMessage(data.message || data.text, "received");
  }
});

socket.on("receiveGroupMessage", (data) => {
  if (!groupMessagesDiv) return;

  const div = document.createElement("div");
  const senderId = String(data.senderId || data.sender?._id || data.sender?.id || data.sender || "");
  const isMe = senderId === currentUserId;
  
  const base = "max-w-[80%] px-3 py-2 rounded-2xl text-xs my-1 clear-both break-words shadow-sm flex flex-col";
  
  if (isMe) {
    div.className = `${base} ml-auto bg-indigo-600 text-white rounded-tr-none`;
    div.innerHTML = `<span class="text-[10px] text-indigo-200 font-bold">You</span><span>${escapeHTML(data.message || data.text)}</span>`;
  } else {
    div.className = `${base} mr-auto bg-white text-slate-700 border border-slate-100 rounded-tl-none`;
    div.innerHTML = `<span class="text-[10px] text-indigo-500 font-bold">${escapeHTML(data.username || "Global Peer")}</span><span>${escapeHTML(data.message || data.text)}</span>`;
  }

  groupMessagesDiv.appendChild(div);
  groupMessagesDiv.scrollTop = groupMessagesDiv.scrollHeight;
});

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

// Listeners
document.getElementById("message")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

document.getElementById("groupMessage")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendGroupMessage();
});
// ================= GLOBAL THEME ENGINE =================
function applyGlobalTheme(theme) {
  const body = document.body || document.getElementById("body");
  if (!body) return;

  if (theme === "dark") {
    body.classList.remove("bg-slate-100", "text-slate-800", "bg-slate-50");
    body.classList.add("bg-slate-900", "text-white");
  } else {
    body.classList.remove("bg-slate-900", "text-white");
    body.classList.add("bg-slate-100", "text-slate-800");
  }

  // Update all cards / containers dynamically across the page
  const cards = document.querySelectorAll(".theme-card, .bg-white");
  cards.forEach((card) => {
    if (theme === "dark") {
      card.classList.remove("bg-white", "text-slate-800", "border-slate-200");
      card.classList.add("bg-slate-800", "text-white", "border-slate-700");
    } else {
      card.classList.remove("bg-slate-800", "text-white", "border-slate-700");
      card.classList.add("bg-white", "text-slate-800", "border-slate-200");
    }
  });
}

function setDark() {
  localStorage.setItem("theme", "dark");
  applyGlobalTheme("dark");
}

function setLight() {
  localStorage.setItem("theme", "light");
  applyGlobalTheme("light");
}

// Auto-initialize theme on every page load immediately
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyGlobalTheme(savedTheme);
});

// Expose globally
window.setDark = setDark;
window.setLight = setLight;
window.applyGlobalTheme = applyGlobalTheme;


// Global hooks
window.openProfile = openProfile;
window.followUser = followUser;
window.sendMessage = sendMessage;
window.sendGroupMessage = sendGroupMessage;
window.createPost = createPost;
window.deletePost = deletePost;
window.loadPosts = loadPosts;

// Execute initial load
loadPosts();