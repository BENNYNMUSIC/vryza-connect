// ================= API =================
const API =
  "https://vryza-connect-backend-production.up.railway.app";

// ================= USER SESSION =================
const user =
  JSON.parse(
    localStorage.getItem("user")
  );

const token =
  localStorage.getItem("token");

// ================= CHECK LOGIN =================
if (!user || !token) {

  alert("Please login first");

  window.location.href =
    "auth.html";
}

// ================= SOCKET.IO =================
const socket = io(API, {

  transports: [
    "websocket",
    "polling"
  ],

  secure: true
});

// ================= CURRENT USER =================
const currentUserId =
  user._id || user.id;

// ================= CONNECT SOCKET =================
socket.on(
  "connect",

  () => {

    console.log(
      "✅ Socket Connected:",
      socket.id
    );

    socket.emit(
      "join",
      currentUserId
    );
  }
);

// ================= SOCKET ERROR =================
socket.on(
  "connect_error",

  (err) => {

    console.log(
      "❌ SOCKET ERROR:",
      err.message
    );
  }
);

// ================= PRIVATE CHAT =================

// SEND MESSAGE
function sendMessage() {

  const messageInput =
    document.getElementById(
      "message"
    );

  const receiverInput =
    document.getElementById(
      "receiverId"
    );

  const message =
    messageInput.value.trim();

  const receiverId =
    receiverInput.value;

  if (
    !message ||
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

      message

    }
  );

  addMessage(
    message,
    "sent"
  );

  messageInput.value = "";
}

// RECEIVE MESSAGE
socket.on(
  "receiveMessage",

  (data) => {

    console.log(
      "📩 MESSAGE RECEIVED:",
      data
    );

    const activeUser =
      document.getElementById(
        "receiverId"
      ).value;

    if (
      data.senderId ===
      activeUser
    ) {

      addMessage(
        data.message,
        "received"
      );

    } else {

      showNotification(
        "💬 New message received"
      );
    }
  }
);

// ADD MESSAGE
function addMessage(
  text,
  type
) {

  const container =
    document.getElementById(
      "messages"
    );

  if (!container) return;

  const div =
    document.createElement(
      "div"
    );

  const baseClass =
    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm break-words mb-2";

  div.className =

    type === "sent"

      ? `${baseClass} bg-blue-500 text-white ml-auto`

      : `${baseClass} bg-gray-200 text-gray-800 mr-auto`;

  div.innerText = text;

  container.appendChild(
    div
  );

  container.scrollTop =
    container.scrollHeight;
}

// ENTER KEY SEND
const messageInput =
  document.getElementById(
    "message"
  );

if (messageInput) {

  messageInput.addEventListener(
    "keypress",

    (e) => {

      if (e.key === "Enter") {

        sendMessage();
      }
    }
  );
}

// SELECT USER
function selectUser(id) {

  document.getElementById(
    "receiverId"
  ).value = id;

  document.getElementById(
    "messages"
  ).innerHTML = "";

  showNotification(
    "✅ Chat selected"
  );
}

// ================= GROUP CHAT =================

// RECEIVE GROUP MESSAGE
socket.on(
  "groupMessage",

  (data) => {

    console.log(
      "👥 GROUP MESSAGE:",
      data
    );

    const box =
      document.getElementById(
        "groupMessages"
      );

    if (!box) return;

    box.innerHTML += `

      <div class="bg-white p-3 rounded-xl shadow-sm mb-2">

        <span class="font-bold text-indigo-600">
          ${data.username}
        </span>

        <p class="text-slate-700 mt-1">
          ${data.message}
        </p>

      </div>
    `;

    box.scrollTop =
      box.scrollHeight;
  }
);

// SEND GROUP MESSAGE
function sendGroupMessage() {

  const input =
    document.getElementById(
      "groupMessage"
    );

  if (!input) return;

  const message =
    input.value.trim();

  if (!message) return;

  socket.emit(
    "groupMessage",
    {

      senderId:
        currentUserId,

      username:
        user.username,

      message

    }
  );

  input.value = "";
}

// ================= ONLINE USERS =================
socket.on(
  "onlineUsers",

  (users) => {

    console.log(
      "🟢 ONLINE USERS:",
      users
    );

    const div =
      document.getElementById(
        "onlineUsers"
      );

    if (!div) return;

    div.innerHTML = users

      .filter(
        (id) =>
          id !== currentUserId
      )

      .map(
        (id) => `

        <div
          onclick="selectUser('${id}')"

          class="
            flex
            items-center
            gap-2
            p-3
            hover:bg-gray-100
            rounded-xl
            cursor-pointer
            transition
          "
        >

          <div class="w-2 h-2 bg-green-500 rounded-full"></div>

          <span class="text-sm font-medium text-gray-700">
            User_${id.substring(0, 5)}
          </span>

        </div>
      `
      )

      .join("");
  }
);

// ================= LOAD POSTS =================
async function loadPosts() {

  try {

    const feed =
      document.getElementById(
        "feed"
      );

    if (feed) {

      feed.innerHTML = `

        <div class="bg-white p-6 rounded-2xl text-center text-gray-400 shadow-sm">

          Loading posts...

        </div>
      `;
    }

    const res =
      await fetch(
        `${API}/api/posts`,
        {

          method: "GET",

          headers: {

            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const posts =
      await res.json();

    console.log(
      "📦 POSTS:",
      posts
    );

    renderPosts(posts);

  } catch (err) {

    console.log(
      "LOAD POSTS ERROR:",
      err
    );

    showNotification(
      "❌ Failed to load posts"
    );
  }
}

// ================= RENDER POSTS =================
function renderPosts(posts) {

  const feed =
    document.getElementById(
      "feed"
    );

  if (!feed) return;

  if (
    !posts ||
    posts.length === 0
  ) {

    feed.innerHTML = `

      <div class="bg-white p-10 rounded-2xl text-center text-gray-400 shadow-sm">

        No posts available

      </div>
    `;

    return;
  }

  feed.innerHTML = "";

  posts.forEach((post) => {

    const div =
      document.createElement(
        "div"
      );

    div.className =
      "bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-5";

    div.innerHTML = `

      <div class="mb-3">

        <p class="font-bold text-gray-800">
          ${
            post.userId?.username ||
            "Anonymous"
          }
        </p>

        <p class="text-xs text-gray-400">
          ${new Date(
            post.createdAt
          ).toLocaleString()}
        </p>

      </div>

      <p class="text-gray-700 mb-3">
        ${post.caption || ""}
      </p>

      ${
        post.image

          ? `
            <img
              src="${API}/uploads/${post.image}"
              class="rounded-xl w-full max-h-[500px] object-cover"
            >
          `

          : ""
      }
    `;

    feed.appendChild(div);
  });
}

// ================= CREATE POST =================
async function createPost() {

  const fileInput =
    document.getElementById(
      "imageFile"
    );

  const captionInput =
    document.getElementById(
      "caption"
    );

  if (
    !captionInput.value.trim() &&
    !fileInput.files[0]
  ) {
    return;
  }

  const formData =
    new FormData();

  if (
    fileInput.files[0]
  ) {

    formData.append(
      "image",
      fileInput.files[0]
    );
  }

  formData.append(
    "caption",
    captionInput.value
  );

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
      "✅ CREATE POST:",
      data
    );

    captionInput.value = "";

    fileInput.value = "";

    loadPosts();

    showNotification(
      "✅ Post created"
    );

  } catch (err) {

    console.log(
      "CREATE POST ERROR:",
      err
    );

    showNotification(
      "❌ Failed to post"
    );
  }
}

// ================= LIKE POST =================
async function likePost(id) {

  try {

    await fetch(
      `${API}/api/posts/${id}/like`,
      {

        method: "PUT",

        headers: {

          Authorization:
            `Bearer ${token}`
        }
      }
    );

    loadPosts();

  } catch (err) {

    console.log(
      "LIKE ERROR:",
      err
    );
  }
}

// ================= COMMENT POST =================
async function commentPost(id) {

  const input =
    document.getElementById(
      `c-${id}`
    );

  if (
    !input.value.trim()
  ) {
    return;
  }

  try {

    await fetch(
      `${API}/api/posts/${id}/comment`,
      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`
        },

        body: JSON.stringify({

          text:
            input.value
        })
      }
    );

    input.value = "";

    loadPosts();

  } catch (err) {

    console.log(
      "COMMENT ERROR:",
      err
    );
  }
}

// ================= NOTIFICATIONS =================
function showNotification(text) {

  const container =
    document.getElementById(
      "notifications"
    );

  if (!container) return;

  const div =
    document.createElement(
      "div"
    );

  div.className =
    "fixed top-5 right-5 bg-black text-white px-4 py-3 rounded-xl shadow-lg z-50";

  div.innerText = text;

  container.appendChild(
    div
  );

  setTimeout(() => {

    div.remove();

  }, 3000);
}

// ================= LOGOUT =================
function logout() {

  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  alert(
    "Logged out"
  );

  window.location.href =
    "auth.html";
}

// ================= START =================
loadPosts();
