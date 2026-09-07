const API = "https://vryza-connect-backend-1.onrender.com";
const socket = io(API);

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user) {
  location.href = "auth.html";
}

const currentUserId = user.id || user._id;
let receiverId = null;
let allFriends = [];

// DOM Selectors
const contactsContainer = document.getElementById("onlineUsers");
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("message");
const chatWith = document.getElementById("chatWith");
const typingText = document.getElementById("typing");
const searchInput = document.getElementById("searchUser");

// Voice Recording Global Variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// WebRTC Video Call Global Variables
let localStream = null;
let peerConnection = null;
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

// ================= SOCKET JOIN =================
socket.on("connect", () => {
  console.log("CONNECTED:", socket.id);
  socket.emit("join", currentUserId);
});

// ================= LOAD & RENDER FRIENDS =================
async function loadFriends() {
  try {
    const res = await fetch(`${API}/api/friends`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    contactsContainer.innerHTML = "";

    if (!data.success || !data.friends.length) {
      contactsContainer.innerHTML = `
        <div class="text-center text-slate-400 text-sm py-4">
          No friends yet
        </div>
      `;
      return;
    }

    allFriends = data.friends;
    renderFriends(allFriends);

    // 1. Check for routing parameters from friends.html redirect
    const preselectedId = localStorage.getItem("chatUserId");
    const preselectedName = localStorage.getItem("chatUsername");

    // 2. Check for previously active saved chat session
    const savedActiveChat = localStorage.getItem("activeChatUser");

    if (preselectedId && preselectedName) {
      openChat({ _id: preselectedId, username: preselectedName });
      localStorage.removeItem("chatUserId");
      localStorage.removeItem("chatUsername");
    } else if (savedActiveChat) {
      try {
        const lastUser = JSON.parse(savedActiveChat);
        openChat(lastUser);
      } catch (e) {
        console.error("Error restoring saved chat session:", e);
      }
    }

  } catch (err) {
    console.error("Error loading contacts list:", err);
  }
}

function renderFriends(friendsList) {
  contactsContainer.innerHTML = "";

  if (!friendsList.length) {
    contactsContainer.innerHTML = `
      <div class="text-center text-slate-400 text-xs py-4">
        No contacts found
      </div>
    `;
    return;
  }

  friendsList.forEach(friend => {
    const friendId = friend._id || friend.id;
    const isActive = receiverId && receiverId.toString() === friendId.toString();

    const card = document.createElement("div");
    card.className = `p-3 rounded-2xl cursor-pointer hover:bg-slate-50 flex items-center gap-3 transition-all border ${
      isActive ? "bg-blue-50/80 border-blue-200 shadow-sm" : "bg-white border-slate-100"
    }`;

    const avatar = friend.profilePic 
      ? (friend.profilePic.startsWith("http") ? friend.profilePic : `${API}/uploads/${friend.profilePic}`)
      : "images/default-avatar.png";

    card.innerHTML = `
      <img src="${avatar}" class="w-10 h-10 rounded-full object-cover bg-slate-100" alt="avatar">
      <div class="flex-1 overflow-hidden">
        <div class="font-semibold text-slate-700 text-sm truncate">${friend.username}</div>
        <div class="text-[11px] text-slate-400 truncate">@${friend.username.toLowerCase()}</div>
      </div>
    `;

    card.onclick = () => openChat(friend);
    contactsContainer.appendChild(card);
  });
}

// Live Search Interceptor
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = allFriends.filter(f => f.username.toLowerCase().includes(term));
    renderFriends(filtered);
  });
}

// ================= OPEN CHAT =================
function openChat(friend) {
  receiverId = friend._id || friend.id;

  // Persist session locally to keep conversation state across reloads/navigation
  localStorage.setItem("activeChatUser", JSON.stringify({ _id: receiverId, username: friend.username }));

  chatWith.innerText = `Chatting with ${friend.username}`;
  messagesContainer.innerHTML = '<div class="text-center text-slate-400 text-xs italic">Loading thread...</div>';

  renderFriends(allFriends);
  loadMessages();
}

// ================= LOAD MESSAGES =================
async function loadMessages() {
  if (!receiverId) return;

  try {
    const res = await fetch(`${API}/api/messages/${receiverId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    messagesContainer.innerHTML = "";

    if (!data.messages || !data.messages.length) {
      messagesContainer.innerHTML = `
        <div id="emptyChat" class="text-center text-slate-400 text-sm mt-10 italic">
          No messages yet. Say hello!
        </div>
      `;
      return;
    }

    data.messages.forEach(msg => {
      const mine = msg.senderId.toString() === currentUserId.toString();
      addMessage(msg.text, mine ? "sent" : "received");
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
    text
  });

  messageInput.value = "";
  socket.emit("stopTyping", { senderId: currentUserId, receiverId });
}

// ================= RECEIVE MESSAGE =================
socket.on("receiveMessage", (msg) => {
  const targetElement = document.getElementById("emptyChat");
  if (targetElement) targetElement.remove();

  const mine = msg.senderId.toString() === currentUserId.toString();

  if (msg.senderId === receiverId || msg.receiverId === receiverId) {
    addMessage(msg.text, mine ? "sent" : "received");
  }
});

// ================= TYPING EVENT HANDLERS =================
let typingTimeout;
messageInput.addEventListener("input", () => {
  if (!receiverId) return;

  socket.emit("typing", { senderId: currentUserId, receiverId });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { senderId: currentUserId, receiverId });
  }, 2000);
});

socket.on("userTyping", (data) => {
  if (data.senderId === receiverId) {
    typingText.innerText = "Typing...";
  }
});

socket.on("userStopTyping", (data) => {
  if (data.senderId === receiverId) {
    typingText.innerText = "";
  }
});

// ================= ADD MESSAGE TO DOM =================
function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = type === "sent"
    ? "bg-blue-600 text-white ml-auto max-w-xs p-3 rounded-2xl shadow-sm text-sm"
    : "bg-slate-200 text-slate-800 mr-auto max-w-xs p-3 rounded-2xl shadow-sm text-sm";

  div.innerText = text;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= ENTER KEY INTERCEPTOR =================
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// ================= VOICE RECORDING LOGIC =================
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
          const base64Audio = reader.result;
          socket.emit("sendVoice", {
            senderId: currentUserId,
            receiverId: receiverId,
            audio: base64Audio
          });
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      micBtn.className = "w-11 h-11 rounded-xl bg-red-500 text-white transition shadow-md flex items-center justify-center text-lg animate-pulse";
      micBtn.innerText = "🛑";

    } catch (err) {
      console.error("Failed to access mic stream:", err);
      alert("Microphone permission denied or device unavailable.");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.className = "w-11 h-11 rounded-xl bg-white hover:bg-red-50 hover:text-red-500 text-slate-500 transition shadow-sm flex items-center justify-center text-lg";
    micBtn.innerText = "🎙️";
  }
}

socket.on("receiveVoice", (data) => {
  if (data.senderId === receiverId || data.receiverId === receiverId) {
    const targetElement = document.getElementById("emptyChat");
    if (targetElement) targetElement.remove();
    
    const mine = data.senderId.toString() === currentUserId.toString();
    addVoiceMessageToDOM(data.audio, mine ? "sent" : "received");
  }
});

function addVoiceMessageToDOM(base64Audio, type) {
  const div = document.createElement("div");
  div.className = type === "sent"
    ? "bg-blue-600 text-white ml-auto max-w-xs p-3 rounded-2xl flex flex-col gap-1 shadow-sm"
    : "bg-slate-200 text-slate-800 mr-auto max-w-xs p-3 rounded-2xl flex flex-col gap-1 shadow-sm";

  const label = document.createElement("span");
  label.className = "text-[10px] opacity-70 font-semibold uppercase tracking-wider";
  label.innerText = type === "sent" ? "Your Voice Note" : "Voice Note";

  const audio = document.createElement("audio");
  audio.src = base64Audio;
  audio.controls = true;
  audio.className = "w-48 h-8 filter mt-1 invert brightness-90 rounded";

  div.appendChild(label);
  div.appendChild(audio);
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ================= WEBRTC CALLING ENGINE =================
async function setupWebRTC(isCaller) {
  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo && event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && receiverId) {
      socket.emit("iceCandidate", { to: receiverId, candidate: event.candidate });
    }
  };
}

document.getElementById("startCall").addEventListener("click", async () => {
  if (!receiverId) {
    alert("Select a friend to call first!");
    return;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;
    document.getElementById("videoArea").classList.remove("hidden");

    await setupWebRTC(true);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("callUser", {
      userToCall: receiverId,
      signalData: offer,
      from: currentUserId
    });

    chatWith.innerText = "Calling friend...";

  } catch (err) {
    console.error("Camera/Mic access failure:", err);
    alert("Could not start call. Make sure camera and microphone permissions are granted.");
  }
});

socket.on("incomingCall", async (data) => {
  const accept = confirm("Incoming call! Would you like to accept?");
  if (!accept) {
    socket.emit("endCall", { to: data.from });
    return;
  }

  receiverId = data.from;
  document.getElementById("videoArea").classList.remove("hidden");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;

    await setupWebRTC(false);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answerCall", { signal: answer, to: data.from });
    chatWith.innerText = "Call Connected";

  } catch (err) {
    console.error("Error answering incoming connection:", err);
    alert("Error accessing hardware devices to bridge video call.");
  }
});

socket.on("callAccepted", async (signal) => {
  try {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
      chatWith.innerText = "Call Connected";
    }
  } catch (err) {
    console.error("Error syncing remote session configurations:", err);
  }
});

socket.on("iceCandidate", async (data) => {
  try {
    if (peerConnection && data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  } catch (err) {
    console.error("Error appending incoming ICE Candidate info:", err);
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
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  document.getElementById("localVideo").srcObject = null;
  document.getElementById("remoteVideo").srcObject = null;
  document.getElementById("videoArea").classList.add("hidden");
  
  if (receiverId) {
    chatWith.innerText = "Conversation Active";
  } else {
    chatWith.innerText = "Select a conversation";
  }
}

// Initialize Contact Retrieval
loadFriends();

// Global Window Bindings
window.sendMessage = sendMessage;
window.toggleRecording = toggleRecording;