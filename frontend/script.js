// ================= API =================
const API =
  "https://vryza-connect-backend-production.up.railway.app";

// ================= SOCKET =================
const socket = io(API, {
  transports: ["websocket", "polling"]
});

// ================= USER =================
const user =
  JSON.parse(
    localStorage.getItem("user")
  );

const token =
  localStorage.getItem("token");

// ================= LOGIN CHECK =================
if (!user || !token) {

  alert("Please login");

  window.location.href =
    "auth.html";
}

// ================= USER ID =================
const currentUserId =
  (
    user._id ||
    user.id
  ).toString();

console.log(
  "CURRENT USER:",
  currentUserId
);

// ================= SOCKET JOIN =================
socket.emit(
  "join",
  currentUserId
);

// ================= DOM =================
const onlineUsersDiv =
  document.getElementById(
    "onlineUsers"
  );

const messagesDiv =
  document.getElementById(
    "messages"
  );

const groupMessagesDiv =
  document.getElementById(
    "groupMessages"
  );

const receiverInput =
  document.getElementById(
    "receiverId"
  );

// ================= CHAT TARGET =================
let selectedUserId = null;

// ================= ONLINE USERS =================
socket.on(
  "onlineUsers",
  (users) => {

    console.log(
      "ONLINE:",
      users
    );

    onlineUsersDiv.innerHTML =
      "";

    users
      .filter(
        (id) =>
          id.toString() !==
          currentUserId
      )
      .forEach((id) => {

        const div =
          document.createElement(
            "div"
          );

        div.className = `
          flex
          items-center
          justify-between
          bg-slate-50
          hover:bg-blue-50
          border
          border-slate-100
          px-4
          py-3
          rounded-2xl
          cursor-pointer
          transition
        `;

        div.innerHTML = `
          <div>
            <p class="font-semibold text-slate-700">
              User ${id.substring(0,6)}
            </p>

            <p class="text-xs text-green-500">
              Online
            </p>
          </div>

          <button
            class="
              bg-blue-600
              text-white
              px-3
              py-1
              rounded-xl
              text-xs
            "
          >
            Chat
          </button>
        `;

        // ================= CLICK =================
        div.addEventListener(
          "click",
          () => {

            selectedUserId =
              id.toString();

            receiverInput.value =
              `User ${id.substring(0,6)}`;

            messagesDiv.innerHTML =
              "";

            loadMessages();
          }
        );

        onlineUsersDiv.appendChild(
          div
        );
      });
  }
);

// ================= LOAD MESSAGES =================
async function loadMessages() {

  if (!selectedUserId)
    return;

  try {

    const res =
      await fetch(
        `${API}/api/messages/${selectedUserId}`,
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

    messagesDiv.innerHTML =
      "";

    messages.forEach((msg) => {

      const sender =
        msg.senderId?.toString();

      const type =
        sender === currentUserId
          ? "sent"
          : "received";

      addMessage(
        msg.text,
        type
      );
    });

    scrollBottom();

  } catch (err) {

    console.log(
      "LOAD MESSAGE ERROR:",
      err
    );
  }
}

// ================= SEND MESSAGE =================
function sendMessage() {

  const input =
    document.getElementById(
      "message"
    );

  const text =
    input.value.trim();

  if (
    !text ||
    !selectedUserId
  ) {

    alert(
      "Select a user first"
    );

    return;
  }

  const data = {

    senderId:
      currentUserId,

    receiverId:
      selectedUserId,

    text
  };

  console.log(
    "SEND:",
    data
  );

  // ================= SOCKET =================
  socket.emit(
    "sendMessage",
    data
  );

  // ================= UI =================
  addMessage(
    text,
    "sent"
  );

  input.value = "";
}

// ================= RECEIVE PRIVATE =================
socket.on(
  "receiveMessage",
  (data) => {

    console.log(
      "PRIVATE MESSAGE:",
      data
    );

    if (
      data.senderId
        .toString() ===
      selectedUserId
        ?.toString()
    ) {

      addMessage(
        data.text,
        "received"
      );
    }
  }
);

// ================= ADD MESSAGE =================
function addMessage(
  text,
  type
) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    type === "sent"
      ? `
        ml-auto
        bg-blue-600
        text-white
        px-4
        py-2
        rounded-2xl
        max-w-[80%]
        text-sm
      `
      : `
        mr-auto
        bg-white
        border
        border-slate-200
        text-slate-700
        px-4
        py-2
        rounded-2xl
        max-w-[80%]
        text-sm
      `;

  div.innerText = text;

  messagesDiv.appendChild(
    div
  );

  scrollBottom();
}

// ================= GROUP CHAT =================
function sendGroupMessage() {

  const input =
    document.getElementById(
      "groupMessage"
    );

  const text =
    input.value.trim();

  if (!text) return;

  const data = {

    senderId:
      currentUserId,

    username:
      user.username ||
      "User",

    text,

    group: true
  };

  socket.emit(
    "groupMessage",
    data
  );

  addGroupMessage(
    data,
    true
  );

  input.value = "";
}

// ================= RECEIVE GROUP =================
socket.on(
  "receiveGroupMessage",
  (data) => {

    addGroupMessage(
      data,
      false
    );
  }
);

// ================= ADD GROUP =================
function addGroupMessage(
  data,
  own
) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    own
      ? `
        bg-indigo-600
        text-white
        p-3
        rounded-2xl
        ml-auto
        max-w-[85%]
      `
      : `
        bg-white
        border
        border-slate-200
        text-slate-700
        p-3
        rounded-2xl
        mr-auto
        max-w-[85%]
      `;

  div.innerHTML = `
    <div class="text-xs font-bold mb-1">
      ${data.username}
    </div>

    <div>
      ${data.text}
    </div>
  `;

  groupMessagesDiv.appendChild(
    div
  );

  groupMessagesDiv.scrollTop =
    groupMessagesDiv.scrollHeight;
}

// ================= ENTER SEND =================
document
  .getElementById("message")
  .addEventListener(
    "keypress",
    (e) => {

      if (e.key === "Enter") {

        sendMessage();
      }
    }
  );

// ================= GROUP ENTER =================
document
  .getElementById(
    "groupMessage"
  )
  .addEventListener(
    "keypress",
    (e) => {

      if (e.key === "Enter") {

        sendGroupMessage();
      }
    }
  );

// ================= CREATE POST =================
async function createPost() {

  const caption =
    document
      .getElementById(
        "caption"
      )
      .value.trim();

  const image =
    document
      .getElementById(
        "imageFile"
      )
      .files[0];

  if (
    !caption &&
    !image
  ) {
    return;
  }

  const formData =
    new FormData();

  formData.append(
    "caption",
    caption
  );

  formData.append(
    "userId",
    currentUserId
  );

  if (image) {

    formData.append(
      "image",
      image
    );
  }

  try {

    const res =
      await fetch(
        `${API}/api/posts`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`
          },

          body: formData
        }
      );

    const data =
      await res.json();

    console.log(
      "POST CREATED:",
      data
    );

    alert(
      "Post uploaded"
    );

    location.reload();

  } catch (err) {

    console.log(
      "POST ERROR:",
      err
    );
  }
}

// ================= SCROLL =================
function scrollBottom() {

  messagesDiv.scrollTop =
    messagesDiv.scrollHeight;
}