const API =
  "https://vryza-connect-backend-production.up.railway.app";

const socket = io(API);

const token =
  localStorage.getItem("token");

const user =
  JSON.parse(
    localStorage.getItem("user") || "{}"
  );

if (!token || !user) {
  location.href = "auth.html";
}

const currentUserId =
  user.id || user._id;

let receiverId = null;

const contactsContainer =
  document.getElementById("onlineUsers");

const messagesContainer =
  document.getElementById("messages");

const messageInput =
  document.getElementById("message");

const chatWith =
  document.getElementById("chatWith");

const typingText =
  document.getElementById("typing");


// ================= SOCKET JOIN =================

socket.on("connect", () => {

  console.log(
    "CONNECTED:",
    socket.id
  );

  socket.emit(
    "join",
    currentUserId
  );
});


// ================= LOAD FRIENDS =================

async function loadFriends() {

  try {

    const res =
      await fetch(
        `${API}/api/friends`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await res.json();

    contactsContainer.innerHTML = "";

    if (
      !data.success ||
      !data.friends.length
    ) {

      contactsContainer.innerHTML =
        `
        <div class="text-center text-slate-400">
          No friends yet
        </div>
      `;

      return;
    }

    data.friends.forEach(friend => {

      const card =
        document.createElement("div");

      card.className =
        "p-3 bg-white border rounded-xl cursor-pointer hover:bg-slate-50 flex items-center gap-3";

      card.innerHTML =
        `
        <img
          src="${
            friend.profilePic
              ? API + "/uploads/" + friend.profilePic
              : "images/default-avatar.png"
          }"
          class="w-10 h-10 rounded-full object-cover"
        >

        <div>
          <div class="font-semibold">
            ${friend.username}
          </div>
        </div>
      `;

      card.onclick =
        () => openChat(friend);

      contactsContainer.appendChild(card);

    });

  } catch (err) {

    console.error(err);

  }
}


// ================= OPEN CHAT =================

function openChat(friend) {

  receiverId =
    friend._id;

  localStorage.setItem(
    "chatUserId",
    friend._id
  );

  chatWith.innerText =
    `Chatting with ${friend.username}`;

  loadMessages();
}


// ================= LOAD MESSAGES =================

async function loadMessages() {

  if (!receiverId) return;

  try {

    const res =
      await fetch(
        `${API}/api/messages/${receiverId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const data =
      await res.json();

    messagesContainer.innerHTML = "";

    if (
      !data.messages ||
      !data.messages.length
    ) {

      messagesContainer.innerHTML =
        `
        <div class="text-center text-slate-400">
          No messages yet
        </div>
      `;

      return;
    }

    data.messages.forEach(msg => {

      const mine =
        msg.senderId.toString() ===
        currentUserId.toString();

      addMessage(
        msg.text,
        mine ? "sent" : "received"
      );

    });

  } catch (err) {

    console.error(err);

  }
}


// ================= SEND MESSAGE =================

function sendMessage() {

  const text =
    messageInput.value.trim();

  if (!text) return;

  if (!receiverId) {

    alert(
      "Select a friend first"
    );

    return;
  }

  socket.emit(
    "sendMessage",
    {
      senderId:
        currentUserId,

      receiverId:
        receiverId,

      text
    }
  );

  messageInput.value = "";
}


// ================= RECEIVE MESSAGE =================

socket.on(
  "receiveMessage",
  (msg) => {

    const mine =
      msg.senderId.toString() ===
      currentUserId.toString();

    if (
      msg.senderId === receiverId ||
      msg.receiverId === receiverId
    ) {

      addMessage(
        msg.text,
        mine
          ? "sent"
          : "received"
      );
    }

  }
);


// ================= TYPING =================

messageInput.addEventListener(
  "input",
  () => {

    if (!receiverId) return;

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

socket.on(
  "userTyping",
  () => {

    typingText.innerText =
      "Typing...";

    setTimeout(() => {

      typingText.innerText = "";

    }, 2000);
  }
);


// ================= ADD MESSAGE =================

function addMessage(
  text,
  type
) {

  const div =
    document.createElement("div");

  div.className =
    type === "sent"
      ? "bg-blue-600 text-white ml-auto max-w-xs p-3 rounded-xl"
      : "bg-slate-200 text-slate-800 mr-auto max-w-xs p-3 rounded-xl";

  div.innerText = text;

  messagesContainer.appendChild(div);

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// ================= ENTER KEY =================

messageInput.addEventListener(
  "keypress",
  (e) => {

    if (e.key === "Enter") {

      sendMessage();

    }
  }
);


// ================= START =================

loadFriends();

window.sendMessage =
  sendMessage;