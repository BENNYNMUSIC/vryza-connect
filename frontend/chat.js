// ================= API =================
const API =
  "https://vryza-connect-backend-production.up.railway.app";

// ================= SOCKET =================
const socket = io(API, {

  transports: [
    "websocket",
    "polling"
  ]
});

// ================= SOCKET DEBUG =================
socket.on(
  "connect",
  () => {

    console.log(
      "🟢 SOCKET CONNECTED:",
      socket.id
    );
  }
);

socket.on(
  "connect_error",
  (err) => {

    console.log(
      "❌ SOCKET ERROR:",
      err.message
    );
  }
);

// ================= USER =================
const user =
  JSON.parse(
    localStorage.getItem("user")
  );

const token =
  localStorage.getItem("token");

// ================= CHECK LOGIN =================
if (!user || !token) {

  alert(
    "Please login first"
  );

  window.location.href =
    "auth.html";
}

// ================= CURRENT USER =================
const currentUserId =
  (
    user._id ||
    user.id
  ).toString();

// ================= CHAT TARGET =================
let receiverId =
  localStorage.getItem(
    "chatUserId"
  );

let receiverName =
  localStorage.getItem(
    "chatUsername"
  );

if (receiverId) {

  receiverId =
    receiverId.toString();
}

// ================= DOM =================
const messagesContainer =
  document.getElementById(
    "messages"
  );

const messageInput =
  document.getElementById(
    "message"
  );

const typingText =
  document.getElementById(
    "typing"
  );

// ================= HEADER =================
if (receiverName) {

  document.getElementById(
    "chatWith"
  ).innerText =
    `Chatting with ${receiverName}`;
}

// ================= JOIN =================
socket.emit(
  "join",
  currentUserId
);

// ================= LOAD OLD MESSAGES =================
async function loadMessages() {

  if (!receiverId)
    return;

  try {

    const res =
      await fetch(
        `${API}/api/messages/${receiverId}`,
        {

          headers: {

            Authorization:
              `Bearer ${token}`,

            userid:
              currentUserId
          }
        }
      );

    const messages =
      await res.json();

    console.log(
      "MESSAGES:",
      messages
    );

    messagesContainer.innerHTML =
      "";

    messages.forEach(
      (msg) => {

        const sender =
          msg.senderId?.toString();

        const type =
          sender === currentUserId
            ? "sent"
            : "received";

        // ================= TEXT =================
        if (msg.text) {

          addMessage(
            msg.text,
            type
          );
        }

        // ================= MEDIA =================
        if (msg.media) {

          addMediaMessage(
            msg.media,
            msg.mediaType,
            type
          );
        }

        // ================= AUDIO =================
        if (msg.audio) {

          addVoiceMessage(
            msg.audio,
            type
          );
        }
      }
    );

    scrollBottom();

  } catch (err) {

    console.log(
      "LOAD ERROR:",
      err
    );
  }
}

loadMessages();

// ================= SEND MESSAGE =================
function sendMessage() {

  const text =
    messageInput.value.trim();

  if (
    !text ||
    !receiverId
  ) {
    return;
  }

  socket.emit(
    "sendMessage",
    {

      senderId:
        currentUserId,

      receiverId,

      message: text
    }
  );

  addMessage(
    text,
    "sent"
  );

  messageInput.value =
    "";
}

// ================= ENTER SEND =================
messageInput.addEventListener(
  "keypress",
  (e) => {

    if (
      e.key === "Enter"
    ) {

      sendMessage();
    }
  }
);

// ================= RECEIVE MESSAGE =================
socket.on(
  "receiveMessage",
  (data) => {

    console.log(
      "RECEIVED:",
      data
    );

    if (
      data.senderId
        .toString() ===
      receiverId
        .toString()
    ) {

      addMessage(
        data.message,
        "received"
      );
    }
  }
);

// ================= TYPING =================
messageInput.addEventListener(
  "input",
  () => {

    if (!receiverId)
      return;

    socket.emit(
      "typing",
      {

        senderId:
          currentUserId,

        receiverId
      }
    );
  }
);

// ================= RECEIVE TYPING =================
socket.on(
  "userTyping",
  (data) => {

    if (
      data.senderId
        .toString() !==
      receiverId
        .toString()
    ) {
      return;
    }

    typingText.innerText =
      `${receiverName} is typing...`;

    clearTimeout(
      window.typingTimeout
    );

    window.typingTimeout =
      setTimeout(() => {

        typingText.innerText =
          "";

      }, 2000);
  }
);

// ================= RECEIVE MEDIA =================
socket.on(
  "receiveMedia",
  (data) => {

    if (
      data.senderId
        .toString() ===
      receiverId
        .toString()
    ) {

      addMediaMessage(
        data.media,
        data.mediaType,
        "received"
      );
    }
  }
);

// ================= RECEIVE VOICE =================
socket.on(
  "receiveVoice",
  (data) => {

    if (
      data.senderId
        .toString() ===
      receiverId
        .toString()
    ) {

      addVoiceMessage(
        data.audio,
        "received"
      );
    }
  }
);

// ================= ADD TEXT =================
function addMessage(
  text,
  type
) {

  const div =
    document.createElement(
      "div"
    );

  const base =
    "max-w-xs px-4 py-3 rounded-2xl text-sm break-words shadow-sm";

  div.className =
    type === "sent"
      ? `${base} bg-blue-600 text-white ml-auto`
      : `${base} bg-gray-200 text-gray-800 mr-auto`;

  div.innerText =
    text;

  messagesContainer.appendChild(
    div
  );

  scrollBottom();
}

// ================= ADD MEDIA =================
function addMediaMessage(
  media,
  mediaType,
  type
) {

  const div =
    document.createElement(
      "div"
    );

  const base =
    "max-w-xs p-2 rounded-xl shadow-sm";

  div.className =
    type === "sent"
      ? `${base} bg-blue-600 ml-auto`
      : `${base} bg-gray-200 mr-auto`;

  const mediaUrl =
    media.startsWith("http")
      ? media
      : `${API}/uploads/${media}`;

  if (
    mediaType === "image"
  ) {

    div.innerHTML = `
      <img
        src="${mediaUrl}"
        class="rounded-xl max-w-full"
      />
    `;

  } else {

    div.innerHTML = `
      <video
        controls
        class="rounded-xl max-w-full"
      >
        <source src="${mediaUrl}">
      </video>
    `;
  }

  messagesContainer.appendChild(
    div
  );

  scrollBottom();
}

// ================= ADD VOICE =================
function addVoiceMessage(
  audio,
  type
) {

  const div =
    document.createElement(
      "div"
    );

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
      class="w-full"
    ></audio>
  `;

  messagesContainer.appendChild(
    div
  );

  scrollBottom();
}

// ================= SCROLL =================
function scrollBottom() {

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}

// ================= MEDIA UPLOAD =================
document
  .getElementById(
    "mediaInput"
  )
  ?.addEventListener(
    "change",
    async (e) => {

      const file =
        e.target.files[0];

      if (
        !file ||
        !receiverId
      ) {
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "senderId",
        currentUserId
      );

      formData.append(
        "receiverId",
        receiverId
      );

      try {

        const res =
          await fetch(
            `${API}/api/upload`,
            {

              method: "POST",

              headers: {

                Authorization:
                  `Bearer ${token}`
              },

              body:
                formData
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
          "UPLOAD ERROR:",
          err
        );
      }
    }
  );

// ================= VOICE =================
let mediaRecorder;

let audioChunks = [];

let isRecording =
  false;

// ================= TOGGLE RECORD =================
async function toggleRecording() {

  if (!receiverId) {

    alert(
      "Select a user first"
    );

    return;
  }

  if (!isRecording) {

    try {

      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: true
          });

      mediaRecorder =
        new MediaRecorder(
          stream
        );

      audioChunks = [];

      mediaRecorder.ondataavailable =
        (e) => {

          audioChunks.push(
            e.data
          );
        };

      mediaRecorder.onstop =
        sendVoiceNote;

      mediaRecorder.start();

      isRecording = true;

      document.getElementById(
        "micBtn"
      ).innerText =
        "⏹️";

    } catch (err) {

      console.log(err);

      alert(
        "Microphone denied"
      );
    }

  } else {

    mediaRecorder.stop();

    isRecording = false;

    document.getElementById(
      "micBtn"
    ).innerText =
      "🎤";
  }
}

// ================= SEND VOICE =================
function sendVoiceNote() {

  const audioBlob =
    new Blob(
      audioChunks,
      {
        type:
          "audio/webm"
      }
    );

  const reader =
    new FileReader();

  reader.onload = () => {

    const base64Audio =
      reader.result;

    socket.emit(
      "sendVoice",
      {

        senderId:
          currentUserId,

        receiverId,

        audio:
          base64Audio
      }
    );

    addVoiceMessage(
      base64Audio,
      "sent"
    );
  };

  reader.readAsDataURL(
    audioBlob
  );
}

// ================= ONLINE USERS =================
socket.on(
  "onlineUsers",

  async (users) => {

    console.log(
      "ONLINE USERS:",
      users
    );

    const div =
      document.getElementById(
        "onlineUsers"
      );

    if (!div) return;

    div.innerHTML = "";

    for (const id of users) {

      if (
        id.toString() ===
        currentUserId
      ) {
        continue;
      }

      let username =
        "Unknown User";

      let profilePic = "";

      try {

        const res =
          await fetch(
            `${API}/api/users/${id}`,
            {

              headers: {

                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        const data =
          await res.json();

        username =
          data.username ||
          "User";

        profilePic =
          data.profilePic || "";

      } catch (err) {

        console.log(
          "USER FETCH ERROR:",
          err
        );
      }

      div.innerHTML += `

        <div
          onclick="startChat('${id}','${username}')"

          class="
            cursor-pointer
            bg-white
            border
            border-green-200
            p-3
            rounded-2xl
            hover:bg-green-50
            transition
            flex
            items-center
            gap-3
          "
        >

          <div
            class="
              w-12
              h-12
              rounded-full
              overflow-hidden
              bg-slate-200
              flex
              items-center
              justify-center
            "
          >

            ${
              profilePic
              ? `<img src="${profilePic}" class="w-full h-full object-cover" />`
              : "👤"
            }

          </div>

          <div>

            <h3 class="font-bold text-slate-700">
              ${username}
            </h3>

            <p class="text-xs text-green-500">
              🟢 Online
            </p>

          </div>

        </div>
      `;
    }
  }
);

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

// ================= VIDEO CALL =================
const startCallBtn =
  document.getElementById(
    "startCall"
  );

if (startCallBtn) {

  startCallBtn.onclick =
    async () => {

      try {

        const videoArea =
          document.getElementById(
            "videoArea"
          );

        const localVideo =
          document.getElementById(
            "localVideo"
          );

        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({

              video: true,

              audio: true
            });

        localVideo.srcObject =
          stream;

        videoArea.classList.remove(
          "hidden"
        );

      } catch (err) {

        console.log(
          "CAMERA ERROR:",
          err
        );
      }
    };
}