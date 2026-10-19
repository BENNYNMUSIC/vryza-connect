const socket = io("[https://vryza-connect-backend-1.onrender.com](https://vryza-connect-backend-1.onrender.com)");
const CURRENT_STREAM_KEY = "YOUR_STREAM_KEY_HERE"; // Pass dynamically
const STREAMER_ID = "STREAMER_USER_ID_HERE";       // Pass dynamically

// 1. Connect to live stream socket room
socket.emit('join_stream', CURRENT_STREAM_KEY);

// 2. Send Tip / Gift Function
async function processSupport(type, amount, giftName = null, message = '') {
  const token = localStorage.getItem("token");

  try {
    // Call Backend API to deduct coins and handle database balance
    const res = await fetch(`${API_URL}/api/monetization/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        streamerId: STREAMER_ID,
        streamKey: CURRENT_STREAM_KEY,
        type,
        amount,
        giftName,
        message
      })
    });

    const data = await res.json();

    if (data.success) {
      // Notify all live stream viewers through WebSockets
      socket.emit('send_monetization_event', {
        streamKey: CURRENT_STREAM_KEY,
        senderUsername: currentUser.username,
        type,
        amount,
        giftName,
        message
      });
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Failed to execute monetization transaction:", err);
  }
}

// Trigger Helper Handlers
function sendTip(amount) {
  processSupport('tip', amount);
}

function sendGift(giftName, amount) {
  processSupport('gift', amount, giftName);
}

function sendSuperChat() {
  const msg = document.getElementById("superchatMsg").value;
  const amount = Number(document.getElementById("superchatAmount").value);
  if (!msg || amount < 100) return alert("Super Chats require a valid message and minimum 100 coins.");
  
  processSupport('superchat', amount, null, msg);
}

// 3. Listen for Incoming Live Gifts / Tips / Super Chats
socket.on('new_monetization_alert', (alertData) => {
  const overlay = document.getElementById("giftAnimationOverlay");

  if (alertData.type === 'gift') {
    overlay.innerHTML = `
      <div class="gift-banner animate-bounce">
        🎉 <strong>${escapeHTML(alertData.sender)}</strong> sent a <strong>${escapeHTML(alertData.giftName)}</strong>!
      </div>
    `;
  } else if (alertData.type === 'superchat') {
    // Append pinned message to Chat Feed
    const chatFeed = document.getElementById("chatFeed");
    const superChatElement = document.createElement("div");
    superChatElement.className = "superchat-card";
    superChatElement.style.background = "#ffb703";
    superChatElement.style.color = "#000";
    superChatElement.style.padding = "10px";
    superChatElement.style.borderRadius = "8px";
    superChatElement.innerHTML = `
      <strong>${escapeHTML(alertData.sender)}</strong> ($${alertData.amount}):
      <p>${escapeHTML(alertData.message)}</p>
    `;
    chatFeed.appendChild(superChatElement);
  }

  // Clear visual alert animation after 5 seconds
  setTimeout(() => {
    overlay.innerHTML = "";
  }, 5000);
});