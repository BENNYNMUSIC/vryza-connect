const API = "http://localhost:5000";

const socket = io(API);

// ================= USER SESSION =================
const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  alert("Not logged in");
  window.location.href = "auth.html";
}

// ================= CHAT TARGET =================
let receiverId = localStorage.getItem("chatUserId");
let receiverName = localStorage.getItem("chatUsername");

// ================= CHAT HEADER =================
if (receiverName) {
  document.getElementById(
    "chatWith"
  ).innerText = `Chatting with ${receiverName}`;
}

// ================= SOCKET JOIN =================
socket.emit("join", user._id || user.id);

// ================= LOAD OLD MESSAGES =================
async function loadMessages() {

  if (!receiverId) return;

  try {

    const res = await fetch(
      `${API}/messages/${receiverId}`
    );

    const messages = await res.json();

    const container =
      document.getElementById("messages");

    container.innerHTML = "";

    messages.forEach((msg) => {

      const type =
        msg.senderId === (user._id || user.id)
          ? "sent"
          : "received";

      // TEXT
      if (msg.text) {
        addMessage(msg.text, type);
      }

      // MEDIA
      if (msg.media) {
        addMediaMessage(
          msg.media,
          msg.mediaType,
          type
        );
      }

      // VOICE
      if (msg.audio) {
        addVoiceMessage(
          msg.audio,
          type
        );
      }

    });

  } catch (err) {

    console.log(
      "Failed to load messages",
      err
    );
  }
}

loadMessages();

// ================= SEND MESSAGE =================
function sendMessage() {

  const input =
    document.getElementById("message");

  const text =
    input.value.trim();

  if (!text || !receiverId) return;

  const data = {
    senderId: user._id || user.id,
    receiverId,
    text
  };

  // SOCKET
  socket.emit("sendMessage", data);

  // UI
  addMessage(text, "sent");

  // CLEAR
  input.value = "";
}

// ================= ENTER KEY =================
document
  .getElementById("message")
  .addEventListener("keypress", (e) => {

    if (e.key === "Enter") {
      sendMessage();
    }
  });

// ================= RECEIVE TEXT =================
socket.on("receiveMessage", (data) => {

  if (data.senderId === receiverId) {

    addMessage(
      data.text,
      "received"
    );
  }
});

// ================= TYPING INDICATOR =================
const messageInput =
  document.getElementById("message");

messageInput.addEventListener("input", () => {

  if (!receiverId) return;

  socket.emit("typing", {
    senderId: user._id || user.id,
    receiverId
  });

});

socket.on("userTyping", (data) => {

  if (data.senderId !== receiverId) return;

  const typing =
    document.getElementById("typing");

  typing.innerText =
    `${receiverName} is typing...`;

  clearTimeout(window.typingTimeout);

  window.typingTimeout =
    setTimeout(() => {

      typing.innerText = "";

    }, 2000);
});

// ================= RECEIVE VOICE =================
socket.on("receiveVoice", (data) => {

  if (data.senderId === receiverId) {

    addVoiceMessage(
      data.audio,
      "received"
    );
  }
});

// ================= RECEIVE MEDIA =================
socket.on("receiveMedia", (data) => {

  if (data.senderId === receiverId) {

    addMediaMessage(
      data.media,
      data.mediaType,
      "received"
    );
  }
});

// ================= AUTO SCROLL =================
function scrollBottom() {

  const messages =
    document.getElementById("messages");

  messages.scrollTop =
    messages.scrollHeight;
}

// ================= ADD TEXT MESSAGE =================
function addMessage(text, type) {

  const div =
    document.createElement("div");

  const base =
    "max-w-xs px-4 py-2 rounded-2xl text-sm break-words shadow-sm";

  div.className =
    type === "sent"
      ? `${base} bg-blue-600 text-white ml-auto`
      : `${base} bg-gray-200 text-gray-800 mr-auto`;

  div.innerText = text;

  document
    .getElementById("messages")
    .appendChild(div);

  scrollBottom();
}

// ================= ADD VOICE =================
function addVoiceMessage(audio, type) {

  const div =
    document.createElement("div");

  const base =
    "max-w-xs p-2 rounded-xl shadow-sm";

  div.className =
    type === "sent"
      ? `${base} bg-blue-600 ml-auto`
      : `${base} bg-gray-200 mr-auto`;

  div.innerHTML = `
    <audio
      controls
      src="${audio}"
      class="w-full h-10"
    ></audio>
  `;

  document
    .getElementById("messages")
    .appendChild(div);

  scrollBottom();
}

// ================= ADD MEDIA =================
function addMediaMessage(
  media,
  mediaType,
  type
) {

  const div =
    document.createElement("div");

  const base =
    "max-w-xs p-2 rounded-xl shadow-md";

  div.className =
    type === "sent"
      ? `${base} bg-blue-600 ml-auto`
      : `${base} bg-gray-200 mr-auto`;

  const mediaUrl =
    media.startsWith("http")
      ? media
      : `${API}/uploads/${media}`;

  // IMAGE
  if (mediaType === "image") {

    div.innerHTML = `
      <img
        src="${mediaUrl}"
        class="rounded-lg max-w-full block"
      >
    `;

  } else {

    // VIDEO
    div.innerHTML = `
      <video
        controls
        class="rounded-lg max-w-full"
      >
        <source src="${mediaUrl}">
      </video>
    `;
  }

  document
    .getElementById("messages")
    .appendChild(div);

  scrollBottom();
}

// ================= MEDIA UPLOAD =================
document
  .getElementById("mediaInput")
  .addEventListener("change", async (e) => {

    const file = e.target.files[0];

    if (!file || !receiverId) return;

    const formData =
      new FormData();

    formData.append("file", file);
    formData.append(
      "senderId",
      user._id || user.id
    );
    formData.append(
      "receiverId",
      receiverId
    );

    try {

      const res = await fetch(
        `${API}/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const data =
        await res.json();

      addMediaMessage(
        data.media,
        data.mediaType,
        "sent"
      );

    } catch (err) {

      console.log(
        "Upload failed",
        err
      );
    }
  });

// ================= VOICE RECORDING =================
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ================= TOGGLE RECORDING =================
async function toggleRecording() {

  if (!isRecording) {

    try {

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true
          });

      mediaRecorder =
        new MediaRecorder(stream);

      audioChunks = [];

      mediaRecorder.ondataavailable =
        (e) => {
          audioChunks.push(e.data);
        };

      mediaRecorder.onstop =
        sendVoiceNote;

      mediaRecorder.start();

      isRecording = true;

      document.getElementById(
        "micBtn"
      ).innerText = "⏹️";

    } catch (err) {

      alert(
        "Microphone access denied"
      );
    }

  } else {

    mediaRecorder.stop();

    isRecording = false;

    document.getElementById(
      "micBtn"
    ).innerText = "🎤";
  }
}

// ================= SEND VOICE =================
function sendVoiceNote() {

  const audioBlob =
    new Blob(audioChunks, {
      type: "audio/webm"
    });

  const reader =
    new FileReader();

  reader.onload = () => {

    const base64Audio =
      reader.result;

    socket.emit("sendVoice", {
      senderId: user._id || user.id,
      receiverId,
      audio: base64Audio
    });

    addVoiceMessage(
      base64Audio,
      "sent"
    );
  };

  reader.readAsDataURL(audioBlob);
}

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {

  const div =
    document.getElementById(
      "onlineUsers"
    );

  div.innerHTML = users
    .filter(
      (id) =>
        id !== (user._id || user.id)
    )
    .map((id) => `
      <span
        onclick="startChat('${id}', 'User ${id.substring(0,4)}')"
        class="
          cursor-pointer
          bg-white
          border
          border-green-200
          px-3
          py-1
          rounded-full
          text-green-600
          font-medium
          hover:bg-green-50
          transition
        "
      >
        ● Online:
        ${id.substring(0,8)}...
      </span>
    `)
    .join("");
});

// ================= START CHAT =================
function startChat(
  userId,
  username
) {

  localStorage.setItem(
    "chatUserId",
    userId
  );

  localStorage.setItem(
    "chatUsername",
    username
  );

  location.reload();
}

// ================= VIDEO CALL PREVIEW =================
const startCallBtn =
  document.getElementById("startCall");

if (startCallBtn) {

  startCallBtn.onclick =
    async () => {

      try {

        const localVideo =
          document.getElementById(
            "localVideo"
          );

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: true
            });

        localVideo.srcObject =
          stream;

      } catch (err) {

        console.log(
          "Camera error",
          err
        );
      }
    };
}