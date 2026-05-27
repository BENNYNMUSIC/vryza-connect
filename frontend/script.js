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

const feedDiv =
  document.getElementById(
    "feed"
  );

// ================= CHAT TARGET =================
let selectedUserId =
  null;

// ================= OPEN PROFILE =================
function openProfile(
  userId
) {

  localStorage.setItem(
    "profileUserId",
    userId
  );

  window.location.href =
    "user.html";
}

// ================= ONLINE USERS =================
socket.on(
  "onlineUsers",
  (users) => {

    console.log(
      "ONLINE USERS:",
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
          <div
            class="flex-1"
          >
            <p
              class="
                font-semibold
                text-slate-700
              "
            >
              User ${id.substring(0,6)}
            </p>

            <p
              class="
                text-xs
                text-green-500
              "
            >
              Online
            </p>
          </div>

          <div
            class="
              flex
              items-center
              gap-2
            "
          >

            <button
              class="
                profileBtn
                bg-slate-200
                hover:bg-slate-300
                px-3
                py-1
                rounded-xl
                text-xs
              "
            >
              Profile
            </button>

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

          </div>
        `;

        // ================= CHAT =================
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

        // ================= PROFILE =================
        div.querySelector(
          ".profileBtn"
        )
        .addEventListener(
          "click",
          (e) => {

            e.stopPropagation();

            openProfile(id);
          }
        );

        onlineUsersDiv.appendChild(
          div
        );
      });
  }
);

// ================= LOAD POSTS =================
async function loadPosts() {

  try {

    const res =
      await fetch(
        `${API}/api/posts`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const posts =
      await res.json();

    console.log(
      "POSTS:",
      posts
    );

    feedDiv.innerHTML =
      "";

    posts.reverse().forEach(
      (post) => {

        const div =
          document.createElement(
            "div"
          );

        div.className = `
          bg-white
          rounded-3xl
          border
          border-slate-200
          shadow-sm
          overflow-hidden
        `;

        const image =
          post.image
            ? `
            <img
              src="${API}/uploads/${post.image}"
              class="
                w-full
                max-h-[500px]
                object-cover
              "
            />
          `
            : "";

        div.innerHTML = `
          <div
            class="
              p-5
            "
          >

            <!-- USER -->
            <div
              class="
                flex
                items-center
                justify-between
                mb-4
              "
            >

              <div
                onclick="openProfile('${post.userId}')"
                class="
                  flex
                  items-center
                  gap-3
                  cursor-pointer
                "
              >

                <div
                  class="
                    w-12
                    h-12
                    rounded-full
                    bg-blue-600
                    text-white
                    flex
                    items-center
                    justify-center
                    font-bold
                  "
                >
                  ${
                    post.username
                      ?.charAt(0)
                      ?.toUpperCase() ||
                    "U"
                  }
                </div>

                <div>

                  <p
                    class="
                      font-bold
                      text-slate-800
                    "
                  >
                    ${
                      post.username ||
                      "User"
                    }
                  </p>

                  <p
                    class="
                      text-xs
                      text-slate-400
                    "
                  >
                    Click to view profile
                  </p>

                </div>

              </div>

              <!-- FOLLOW -->
              <button
                onclick="followUser('${post.userId}')"
                class="
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  px-4
                  py-2
                  rounded-xl
                  text-sm
                  font-semibold
                "
              >
                Follow
              </button>

            </div>

            <!-- CAPTION -->
            <p
              class="
                text-slate-700
                mb-4
                whitespace-pre-wrap
              "
            >
              ${
                post.caption ||
                ""
              }
            </p>

          </div>

          ${image}
        `;

        feedDiv.appendChild(
          div
        );
      });

  } catch (err) {

    console.log(
      "LOAD POSTS ERROR:",
      err
    );
  }
}

loadPosts();

// ================= FOLLOW USER =================
async function followUser(
  targetUserId
) {

  try {

    const res =
      await fetch(
        `${API}/api/users/follow/${targetUserId}`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            currentUserId
          })
        }
      );

    const data =
      await res.json();

    console.log(
      "FOLLOW:",
      data
    );

    alert(
      "User followed"
    );

  } catch (err) {

    console.log(
      "FOLLOW ERROR:",
      err
    );
  }
}

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

    messagesDiv.innerHTML =
      "";

    messages.forEach(
      (msg) => {

        const sender =
          msg.senderId?.toString();

        const type =
          sender ===
          currentUserId
            ? "sent"
            : "received";

        addMessage(
          msg.text,
          type
        );
      }
    );

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

  socket.emit(
    "sendMessage",
    data
  );

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

  div.innerText =
    text;

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
    <div
      class="
        text-xs
        font-bold
        mb-1
      "
    >
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

// ================= ENTER SEND =================
document
  .getElementById(
    "message"
  )
  .addEventListener(
    "keypress",
    (e) => {

      if (
        e.key === "Enter"
      ) {

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

      if (
        e.key === "Enter"
      ) {

        sendGroupMessage();
      }
    }
  );

// ================= SCROLL =================
function scrollBottom() {

  messagesDiv.scrollTop =
    messagesDiv.scrollHeight;
}