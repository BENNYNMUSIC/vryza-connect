const API = "https://vryza-connect-backend.onrender.com";
// ================= USER SESSION =================
const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "auth.html";
}

// ================= SOCKET =================
const socket = io(API);

const currentUserId = user._id || user.id;

// JOIN SOCKET
socket.emit("join", currentUserId);

// ================= PRIVATE CHAT =================

// SEND MESSAGE
function sendMessage() {
  const messageInput = document.getElementById("message");
  const receiverInput = document.getElementById("receiverId");

  const message = messageInput.value.trim();
  const receiverId = receiverInput.value;

  if (!message || !receiverId) return;

  socket.emit("sendMessage", {
    senderId: currentUserId,
    receiverId,
    message
  });

  addMessage(message, "sent");

  messageInput.value = "";
}

// RECEIVE MESSAGE
socket.on("receiveMessage", (data) => {
  const activeUser =
    document.getElementById("receiverId").value;

  if (data.senderId === activeUser) {
    addMessage(data.message, "received");
  } else {
    showNotification("💬 New message received");
  }
});

// ADD MESSAGE TO UI
function addMessage(text, type) {
  const container =
    document.getElementById("messages");

  const div = document.createElement("div");

  const baseClass =
    "max-w-[80%] p-2 rounded-lg text-sm shadow-sm break-words";

  div.className =
    type === "sent"
      ? `${baseClass} bg-blue-500 text-white ml-auto`
      : `${baseClass} bg-gray-200 text-gray-800 mr-auto`;

  div.innerText = text;

  container.appendChild(div);

  container.scrollTop =
    container.scrollHeight;
}

// SELECT USER
function selectUser(id) {
  document.getElementById("receiverId").value = id;

  document.getElementById("messages").innerHTML = "";
}

// ================= GROUP CHAT =================

// RECEIVE GROUP MESSAGE
socket.on("groupMessage", (data) => {
  const box =
    document.getElementById("groupMessages");

  box.innerHTML += `
    <div class="bg-white p-3 rounded-xl shadow-sm">
      <span class="font-bold text-indigo-600">
        ${data.username}
      </span>

      <p class="text-slate-700 mt-1">
        ${data.message}
      </p>
    </div>
  `;

  box.scrollTop = box.scrollHeight;
});

// SEND GROUP MESSAGE
function sendGroupMessage() {
  const input =
    document.getElementById("groupMessage");

  const message = input.value.trim();

  if (!message) return;

  socket.emit("groupMessage", {
    username: user.username,
    message
  });

  input.value = "";
}

// ================= ONLINE USERS =================

socket.on("onlineUsers", (users) => {
  const div =
    document.getElementById("onlineUsers");

  div.innerHTML = users
    .filter((id) => id !== currentUserId)

    .map(
      (id) => `
      <div
        onclick="selectUser('${id}')"
        class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition"
      >
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>

        <span class="text-sm font-medium text-gray-700">
          User_${id.substring(0, 5)}
        </span>
      </div>
    `
    )
    .join("");
});

// ================= POSTS =================

// LOAD POSTS
async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);

    const posts = await res.json();

    renderPosts(posts);

  } catch (err) {
    console.log(err);
  }
}

// RENDER POSTS
function renderPosts(posts) {
  const feed =
    document.getElementById("feed");

  feed.innerHTML = "";

  posts.forEach((post) => {

    const isOwner =
      (post.userId?._id || post.userId) === currentUserId;

    const div =
      document.createElement("div");

    div.className =
      "bg-white p-5 rounded-2xl shadow-sm border border-gray-200";

    div.innerHTML = `
      
      <!-- TOP -->
      <div class="flex items-center justify-between mb-3">

        <div class="flex items-center gap-3">

          <img
            src="${API}/uploads/${post.userId?.profilePic || "default.png"}"
            class="w-10 h-10 rounded-full object-cover border"
          >

          <div>

            <p class="font-bold text-gray-800">
              ${post.userId?.username || "Anonymous"}
            </p>

            <p class="text-xs text-gray-400">
              ${new Date(post.createdAt).toLocaleString()}
            </p>

          </div>

        </div>

        ${
          isOwner
            ? `
          <button
            onclick="deletePost('${post._id}')"
            class="text-red-500 hover:text-red-700 text-sm font-bold"
          >
            🗑 Delete
          </button>
        `
            : ""
        }

      </div>

      <!-- CAPTION -->
      <p class="text-gray-700 mb-3">
        ${post.caption || ""}
      </p>

      <!-- MEDIA -->
      ${
        post.image
          ? post.mediaType === "video"
            ? `
          <video
            controls
            class="rounded-xl mb-3 w-full max-h-[500px]"
          >
            <source
              src="${API}/uploads/${post.image}"
              type="video/mp4"
            >
          </video>
        `
            : `
          <img
            src="${API}/uploads/${post.image}"
            class="rounded-xl mb-3 w-full object-cover max-h-[500px]"
          >
        `
          : ""
      }

      <!-- ACTIONS -->
      <div class="flex items-center gap-5 border-t pt-3">

        <button
          onclick="likePost('${post._id}')"
          class="text-gray-600 hover:text-blue-500 flex items-center gap-1"
        >
          ❤️ ${post.likes?.length || 0}
        </button>

        <button
          class="text-gray-600 flex items-center gap-1"
        >
          💬 ${post.comments?.length || 0}
        </button>

      </div>

      <!-- COMMENTS -->
      <div class="mt-4 space-y-2 bg-gray-50 p-3 rounded-xl">

        ${
          post.comments
            ?.map(
              (c) => `
            <p class="text-sm">
              <b class="text-gray-800">
                ${c.userId?.username || "User"}:
              </b>

              ${c.text}
            </p>
          `
            )
            .join("") || ""
        }

        <div class="flex gap-2 mt-2">

          <input
            id="c-${post._id}"
            placeholder="Comment..."
            class="flex-1 text-sm border p-2 rounded-lg outline-none"
          >

          <button
            onclick="commentPost('${post._id}')"
            class="text-blue-500 font-bold text-sm"
          >
            Send
          </button>

        </div>

      </div>
    `;

    feed.appendChild(div);
  });
}

// CREATE POST
async function createPost() {
  const fileInput =
    document.getElementById("imageFile");

  const captionInput =
    document.getElementById("caption");

  if (
    !captionInput.value &&
    !fileInput.files[0]
  ) {
    return;
  }

  const formData = new FormData();

  if (fileInput.files[0]) {
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
    const res = await fetch(
      `${API}/api/posts`,
      {
        method: "POST",

        headers: {
          Authorization: token
        },

        body: formData
      }
    );

    if (!res.ok) {
      throw new Error("Failed");
    }

    captionInput.value = "";
    fileInput.value = "";

    loadPosts();

    showNotification("✅ Post created");

  } catch (err) {
    console.log(err);

    showNotification("❌ Failed to post");
  }
}

// LIKE POST
async function likePost(id) {
  try {
    await fetch(
      `${API}/api/posts/${id}/like`,
      {
        method: "PUT",

        headers: {
          Authorization: token
        }
      }
    );

    loadPosts();

  } catch (err) {
    console.log(err);
  }
}

// COMMENT POST
async function commentPost(id) {
  const input =
    document.getElementById(`c-${id}`);

  if (!input.value.trim()) return;

  try {
    await fetch(
      `${API}/api/posts/${id}/comment`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },

        body: JSON.stringify({
          text: input.value
        })
      }
    );

    input.value = "";

    loadPosts();

  } catch (err) {
    console.log(err);
  }
}

// DELETE POST
async function deletePost(postId) {

  const confirmDelete =
    confirm("Delete this post?");

  if (!confirmDelete) return;

  try {

    const res = await fetch(
      `${API}/api/posts/${postId}`,
      {
        method: "DELETE",

        headers: {
          Authorization: token
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return alert(data.message);
    }

    showNotification("🗑 Post deleted");

    loadPosts();

  } catch (err) {

    console.log(err);

    alert("Failed to delete post");
  }
}

// ================= NOTIFICATIONS =================

function showNotification(text) {

  const container =
    document.getElementById("notifications");

  const div =
    document.createElement("div");

  div.className =
    "fixed top-5 right-5 bg-black text-white px-4 py-3 rounded-xl shadow-lg z-50";

  div.innerText = text;

  container.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 3000);
}

// ================= LOGOUT =================

function logout() {

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("chatUserId");
  localStorage.removeItem("chatUsername");

  alert("Logged out");

  window.location.href = "auth.html";
}

// ================= START =================

loadPosts();