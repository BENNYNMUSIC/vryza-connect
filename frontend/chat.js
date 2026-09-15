const API = "https://vryza-connect-backend-1.onrender.com";
const socket = io(API, {
  auth: {
    token: (localStorage.getItem("token") || "")
      .replace(/^Bearer\s+/i, "")
      .trim()
  }
});

const rawToken = localStorage.getItem("token");
const token = rawToken
  ? rawToken.replace(/^Bearer\s+/i, "").trim()
  : "";

const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user || (!user.id && !user._id)) {
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
const contactsAside = document.getElementById("contactsAside");
const chatSection = document.getElementById("chatSection");
const startCallBtn = document.getElementById("startCall");
const endCallBtn = document.getElementById("endCall");

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


// ================= MOBILE NAVIGATION TOGGLES =================

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


// ================= SOCKET JOIN =================

socket.on("connect", () => {
  console.log("CONNECTED:", socket.id);

  // Join authenticated user's room/state
  socket.emit("join", currentUserId);
});

socket.on("connect_error", (err) => {
  console.error("❌ SOCKET CONNECTION ERROR:", err.message);
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

    if (!data.success || !data.friends || !data.friends.length) {
      contactsContainer.innerHTML = `
        <div class="text-center text-slate-400 text-sm py-4">
          No friends yet
        </div>
      `;
      return;
    }

    allFriends = data.friends;

    renderFriends(allFriends);

    const preselectedId = localStorage.getItem("chatUserId");
    const preselectedName = localStorage.getItem("chatUsername");
    const savedActiveChat = localStorage.getItem("activeChatUser");

    if (preselectedId && preselectedName) {

      openChat({
        _id: preselectedId,
        username: preselectedName
      });

      localStorage.removeItem("chatUserId");
      localStorage.removeItem("chatUsername");

    } else if (savedActiveChat) {

      try {
        const lastUser = JSON.parse(savedActiveChat);

        if (lastUser && (lastUser._id || lastUser.id)) {
          openChat(lastUser);
        }

      } catch (e) {
        console.error(
          "Error restoring saved chat session:",
          e
        );
      }
    }

  } catch (err) {
    console.error("Error loading contacts list:", err);

    if (contactsContainer) {
      contactsContainer.innerHTML = `
        <div class="text-center text-red-400 text-sm py-4">
          Failed to load friends
        </div>
      `;
    }
  }
}


function renderFriends(friendsList) {
  if (!contactsContainer) return;

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

    const isActive =
      receiverId &&
      receiverId.toString() === friendId.toString();

    const card = document.createElement("div");

    card.className = `
      p-2.5 sm:p-3
      rounded-xl sm:rounded-2xl
      cursor-pointer
      hover:bg-slate-50
      flex items-center gap-3
      transition-all
      border
      ${
        isActive
          ? "bg-blue-50/80 border-blue-200 shadow-sm"
          : "bg-white border-slate-100"
      }
    `;

    const avatar = friend.profilePic
      ? (
          friend.profilePic.startsWith("http")
            ? friend.profilePic
            : `${API}/uploads/${friend.profilePic}`
        )
      : "images/default-avatar.png";

    card.innerHTML = `
      <img
        src="${avatar}"
        class="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-slate-100"
        alt="avatar"
      >

      <div class="flex-1 overflow-hidden">
        <div class="font-semibold text-slate-700 text-xs sm:text-sm truncate">
          ${friend.username}
        </div>

        <div class="text-[10px] sm:text-[11px] text-slate-400 truncate">
          @${friend.username.toLowerCase()}
        </div>
      </div>
    `;

    card.onclick = () => openChat(friend);

    contactsContainer.appendChild(card);
  });
}


// ================= LIVE SEARCH =================

if (searchInput) {

  searchInput.addEventListener("input", (e) => {

    const term = e.target.value
      .toLowerCase()
      .trim();

    const filtered = allFriends.filter(friend =>
      friend.username &&
      friend.username.toLowerCase().includes(term)
    );

    renderFriends(filtered);
  });

}


// ================= OPEN CHAT =================

function openChat(friend) {

  if (!friend) return;

  receiverId = friend._id || friend.id;

  if (!receiverId) {
    console.error("❌ Cannot open chat: friend ID missing.");
    return;
  }

  // Save active conversation
  localStorage.setItem(
    "activeChatUser",
    JSON.stringify({
      _id: receiverId,
      username: friend.username
    })
  );

  // Keep compatibility with existing code
  localStorage.setItem("chatUserId", receiverId);

  if (chatWith) {
    chatWith.innerText =
      `Chatting with ${friend.username}`;
  }

  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div class="text-center text-slate-400 text-xs italic">
        Loading thread...
      </div>
    `;
  }

  renderFriends(allFriends);

  // Tell backend which conversation is currently open
  socket.emit("openChat", {
    userId: currentUserId,
    chattingWith: receiverId
  });

  // Mark messages from this person as read
  openConversation(receiverId);

  // Load conversation
  loadMessages();

  // Show chat on mobile
  showChatView();
}


// ================= MARK CONVERSATION AS READ =================

async function openConversation(senderId) {

  if (!senderId) return;

  localStorage.setItem("chatUserId", senderId);

  try {

    const res = await fetch(
      `${API}/api/messages/read/${senderId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) {
      console.error(
        "❌ Failed to mark messages as read:",
        res.status
      );
      return;
    }

    const data = await res.json();

    console.log(
      "✅ Messages marked as read:",
      data.markedAsRead || 0
    );

    // Refresh unread badge immediately
    if (typeof fetchUnreadChatCount === "function") {
      fetchUnreadChatCount();
    }

  } catch (err) {

    console.error(
      "Failed to mark messages as read:",
      err
    );
  }
}


// ================= LOAD MESSAGES =================

async function loadMessages() {

  if (!receiverId) return;

  try {

    const res = await fetch(
      `${API}/api/messages/${receiverId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (!messagesContainer) return;

    messagesContainer.innerHTML = "";

    if (
      !data.messages ||
      !data.messages.length
    ) {

      messagesContainer.innerHTML = `
        <div
          id="emptyChat"
          class="text-center text-slate-400 text-sm mt-10 italic"
        >
          No messages yet. Say hello!
        </div>
      `;

      return;
    }

    data.messages.forEach(msg => {

      if (!msg.text) return;

      const senderId =
        msg.senderId?.toString();

      const mine =
        senderId === currentUserId.toString();

      addMessage(
        msg.text,
        mine ? "sent" : "received"
      );
    });

  } catch (err) {

    console.error(
      "Error fetching message records:",
      err
    );
  }
}


// ================= SEND MESSAGE =================

function sendMessage() {

  const text =
    messageInput.value.trim();

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

  socket.emit("stopTyping", {
    senderId: currentUserId,
    receiverId: receiverId
  });
}


// ================= RECEIVE MESSAGE =================

socket.on("receiveMessage", (msg) => {

  if (!msg) return;

  const senderId =
    msg.senderId?.toString();

  const msgReceiverId =
    msg.receiverId?.toString();

  const myId =
    currentUserId?.toString();

  const activeReceiverId =
    receiverId?.toString();

  const targetElement =
    document.getElementById("emptyChat");

  if (targetElement) {
    targetElement.remove();
  }

  const mine =
    senderId === myId;

  /*
    Only display the message if it belongs
    to the currently open conversation.
  */
  if (
    senderId === activeReceiverId ||
    msgReceiverId === activeReceiverId
  ) {

    if (msg.text) {
      addMessage(
        msg.text,
        mine ? "sent" : "received"
      );
    }
  }
});


// ================= TYPING EVENT HANDLERS =================

let typingTimeout;

if (messageInput) {

  messageInput.addEventListener(
    "input",
    () => {

      if (!receiverId) return;

      socket.emit("typing", {
        senderId: currentUserId,
        receiverId: receiverId
      });

      clearTimeout(typingTimeout);

      typingTimeout = setTimeout(() => {

        socket.emit("stopTyping", {
          senderId: currentUserId,
          receiverId: receiverId
        });

      }, 2000);
    }
  );
}


socket.on("userTyping", (data) => {

  if (
    data.senderId?.toString() ===
    receiverId?.toString()
  ) {

    if (typingText) {
      typingText.innerText = "Typing...";
    }
  }
});


socket.on("userStopTyping", (data) => {

  if (
    data.senderId?.toString() ===
    receiverId?.toString()
  ) {

    if (typingText) {
      typingText.innerText = "";
    }
  }
});


// ================= ADD MESSAGE TO DOM =================

function addMessage(text, type) {

  if (!messagesContainer) return;

  const div =
    document.createElement("div");

  div.className =
    type === "sent"
      ? "bg-blue-600 text-white ml-auto max-w-[80%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl shadow-sm text-xs sm:text-sm break-words"
      : "bg-slate-200 text-slate-800 mr-auto max-w-[80%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl shadow-sm text-xs sm:text-sm break-words";

  div.innerText = text;

  messagesContainer.appendChild(div);

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// ================= ENTER KEY =================

if (messageInput) {

  messageInput.addEventListener(
    "keypress",
    (e) => {

      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    }
  );
}


// ================= VOICE RECORDING LOGIC =================

async function toggleRecording() {

  const micBtn =
    document.getElementById("micBtn");

  if (!receiverId) {
    alert(
      "Select a friend first before recording."
    );
    return;
  }

  if (!isRecording) {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      mediaRecorder =
        new MediaRecorder(stream);

      audioChunks = [];

      mediaRecorder.ondataavailable =
        (e) => {

          if (e.data.size > 0) {
            audioChunks.push(e.data);
          }
        };

      mediaRecorder.onstop = () => {

        const audioBlob =
          new Blob(
            audioChunks,
            {
              type: "audio/webm"
            }
          );

        const reader =
          new FileReader();

        reader.readAsDataURL(audioBlob);

        reader.onloadend = () => {

          const base64Audio =
            reader.result;

          socket.emit("sendVoice", {
            senderId: currentUserId,
            receiverId: receiverId,
            audio: base64Audio
          });
        };

        stream
          .getTracks()
          .forEach(track => track.stop());
      };

      mediaRecorder.start();

      isRecording = true;

      if (micBtn) {

        micBtn.className =
          "w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-500 text-white transition shadow-md flex items-center justify-center text-sm sm:text-lg animate-pulse";

        micBtn.innerText = "🛑";
      }

    } catch (err) {

      console.error(
        "Failed to access mic stream:",
        err
      );

      alert(
        "Microphone permission denied or device unavailable."
      );
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


// ================= RECEIVE VOICE =================

socket.on("receiveVoice", (data) => {

  if (!data) return;

  const senderId =
    data.senderId?.toString();

  const receiver =
    data.receiverId?.toString();

  const active =
    receiverId?.toString();

  if (
    senderId === active ||
    receiver === active
  ) {

    const targetElement =
      document.getElementById("emptyChat");

    if (targetElement) {
      targetElement.remove();
    }

    const mine =
      senderId === currentUserId.toString();

    if (data.audio) {

      addVoiceMessageToDOM(
        data.audio,
        mine ? "sent" : "received"
      );
    }
  }
});


function addVoiceMessageToDOM(
  base64Audio,
  type
) {

  if (!messagesContainer) return;

  const div =
    document.createElement("div");

  div.className =
    type === "sent"
      ? "bg-blue-600 text-white ml-auto max-w-[85%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl flex flex-col gap-1 shadow-sm"
      : "bg-slate-200 text-slate-800 mr-auto max-w-[85%] sm:max-w-xs p-2.5 sm:p-3 rounded-2xl flex flex-col gap-1 shadow-sm";

  const label =
    document.createElement("span");

  label.className =
    "text-[9px] sm:text-[10px] opacity-70 font-semibold uppercase tracking-wider";

  label.innerText =
    type === "sent"
      ? "Your Voice Note"
      : "Voice Note";

  const audio =
    document.createElement("audio");

  audio.src = base64Audio;
  audio.controls = true;
  audio.className =
    "w-40 sm:w-48 h-8 filter mt-1 rounded";

  div.appendChild(label);
  div.appendChild(audio);

  messagesContainer.appendChild(div);

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// ================= WEBRTC CALLING ENGINE =================

async function setupWebRTC(isCaller) {

  peerConnection =
    new RTCPeerConnection(rtcConfig);

  if (!localStream) {
    throw new Error(
      "Local media stream is not available."
    );
  }

  localStream
    .getTracks()
    .forEach(track => {
      peerConnection.addTrack(
        track,
        localStream
      );
    });

  peerConnection.ontrack =
    (event) => {

      const remoteVideo =
        document.getElementById(
          "remoteVideo"
        );

      if (
        remoteVideo &&
        event.streams[0]
      ) {

        remoteVideo.srcObject =
          event.streams[0];
      }
    };

  peerConnection.onicecandidate =
    (event) => {

      if (
        event.candidate &&
        receiverId
      ) {

        socket.emit(
          "iceCandidate",
          {
            to: receiverId,
            candidate: event.candidate
          }
        );
      }
    };
}


// ================= START CALL =================

if (startCallBtn) {

  startCallBtn.addEventListener(
    "click",
    async () => {

      if (!receiverId) {
        alert(
          "Select a friend to call first!"
        );
        return;
      }

      try {

        localStream =
          await navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: true
            });

        const localVideo =
          document.getElementById(
            "localVideo"
          );

        if (localVideo) {
          localVideo.srcObject =
            localStream;
        }

        const videoArea =
          document.getElementById(
            "videoArea"
          );

        if (videoArea) {
          videoArea.classList.remove(
            "hidden"
          );
        }

        startCallBtn.classList.add(
          "hidden"
        );

        if (endCallBtn) {
          endCallBtn.classList.remove(
            "hidden"
          );
        }

        await setupWebRTC(true);

        const offer =
          await peerConnection.createOffer();

        await peerConnection
          .setLocalDescription(offer);

        socket.emit("callUser", {
          userToCall: receiverId,
          signalData: offer,
          from: currentUserId
        });

        if (chatWith) {
          chatWith.innerText =
            "Calling friend...";
        }

      } catch (err) {

        console.error(
          "Camera/Mic access failure:",
          err
        );

        alert(
          "Could not start call. Make sure camera and microphone permissions are granted."
        );
      }
    }
  );
}


// ================= END CALL =================

function triggerEndCall() {

  if (receiverId) {

    socket.emit("endCall", {
      to: receiverId
    });
  }

  endActiveStream();
}


if (endCallBtn) {
  endCallBtn.addEventListener(
    "click",
    triggerEndCall
  );
}


// ================= INCOMING CALL =================

socket.on(
  "incomingCall",
  async (data) => {

    const accept =
      confirm(
        "Incoming call! Would you like to accept?"
      );

    if (!accept) {

      socket.emit("endCall", {
        to: data.from
      });

      return;
    }

    receiverId = data.from;

    localStorage.setItem(
      "chatUserId",
      receiverId
    );

    const videoArea =
      document.getElementById(
        "videoArea"
      );

    if (videoArea) {
      videoArea.classList.remove(
        "hidden"
      );
    }

    if (startCallBtn) {
      startCallBtn.classList.add(
        "hidden"
      );
    }

    if (endCallBtn) {
      endCallBtn.classList.remove(
        "hidden"
      );
    }

    try {

      localStream =
        await navigator.mediaDevices
          .getUserMedia({
            video: true,
            audio: true
          });

      const localVideo =
        document.getElementById(
          "localVideo"
        );

      if (localVideo) {
        localVideo.srcObject =
          localStream;
      }

      await setupWebRTC(false);

      await peerConnection
        .setRemoteDescription(
          new RTCSessionDescription(
            data.signal
          )
        );

      const answer =
        await peerConnection.createAnswer();

      await peerConnection
        .setLocalDescription(answer);

      socket.emit("answerCall", {
        signal: answer,
        to: data.from
      });

      if (chatWith) {
        chatWith.innerText =
          "Call Connected";
      }

    } catch (err) {

      console.error(
        "Error answering incoming connection:",
        err
      );

      alert(
        "Error accessing hardware devices to bridge video call."
      );
    }
  }
);


// ================= CALL ACCEPTED =================

socket.on(
  "callAccepted",
  async (signal) => {

    try {

      if (peerConnection) {

        await peerConnection
          .setRemoteDescription(
            new RTCSessionDescription(
              signal
            )
          );

        if (chatWith) {
          chatWith.innerText =
            "Call Connected";
        }
      }

    } catch (err) {

      console.error(
        "Error syncing remote session configurations:",
        err
      );
    }
  }
);


// ================= ICE CANDIDATE =================

socket.on(
  "iceCandidate",
  async (data) => {

    try {

      if (
        peerConnection &&
        data.candidate
      ) {

        await peerConnection
          .addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );
      }

    } catch (err) {

      console.error(
        "Error appending incoming ICE Candidate info:",
        err
      );
    }
  }
);


// ================= CALL ENDED =================

socket.on(
  "callEnded",
  () => {

    alert(
      "The call has ended."
    );

    endActiveStream();
  }
);


// ================= END ACTIVE STREAM =================

function endActiveStream() {

  if (peerConnection) {

    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => track.stop());

    localStream = null;
  }

  const localVideo =
    document.getElementById(
      "localVideo"
    );

  const remoteVideo =
    document.getElementById(
      "remoteVideo"
    );

  const videoArea =
    document.getElementById(
      "videoArea"
    );

  if (localVideo) {
    localVideo.srcObject = null;
  }

  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }

  if (videoArea) {
    videoArea.classList.add(
      "hidden"
    );
  }

  if (startCallBtn) {
    startCallBtn.classList.remove(
      "hidden"
    );
  }

  if (endCallBtn) {
    endCallBtn.classList.add(
      "hidden"
    );
  }

  if (chatWith) {

    if (receiverId) {
      chatWith.innerText =
        "Conversation Active";
    } else {
      chatWith.innerText =
        "Select a conversation";
    }
  }
}


// ================= INITIALIZE CONTACT RETRIEVAL =================

loadFriends();


// ================= GLOBAL WINDOW BINDINGS =================

window.sendMessage =
  sendMessage;

window.toggleRecording =
  toggleRecording;

window.showContactsView =
  showContactsView;

window.triggerEndCall =
  triggerEndCall;

window.openConversation =
  openConversation;