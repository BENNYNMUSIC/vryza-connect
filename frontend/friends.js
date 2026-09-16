// ============================================================
// VRYZA CONNECT - FRIENDS RENDER HELPER MODULE
// ============================================================

const API_BASE_URL = "https://vryza-connect-backend-1.onrender.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveAvatarUrl(picPath) {
  if (!picPath) return "images/default-avatar.png";
  if (picPath.startsWith("http") || picPath.startsWith("data:")) return picPath;
  return `${API_BASE_URL}/uploads/${picPath}`;
}

export function renderFriendsList(data, containerElement) {
  if (!containerElement) {
    console.error("❌ renderFriendsList: Target container element is missing.");
    return;
  }

  const friendsList = data && data.success && Array.isArray(data.friends)
    ? data.friends
    : (Array.isArray(data) ? data : []);

  containerElement.innerHTML = "";

  if (friendsList.length === 0) {
    console.warn("No friends found or response data array is empty.");
    containerElement.innerHTML = `
      <div class="text-center text-gray-400 py-6">
        No friends found.
      </div>
    `;
    return;
  }

  friendsList.forEach(friend => {
    const friendId = String(friend._id || friend.id || "");
    const username = friend.username || "User";
    const avatar = resolveAvatarUrl(friend.profilePic || friend.avatar);

    const card = document.createElement("div");
    card.className = "friend-card flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition";
    
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <img
          src="${escapeHtml(avatar)}"
          alt="${escapeHtml(username)}"
          class="w-10 h-10 rounded-full object-cover border border-gray-200"
          onerror="this.src='images/default-avatar.png'"
        />
        <div>
          <h4 class="font-bold text-sm text-gray-800">${escapeHtml(username)}</h4>
          <p class="text-xs text-gray-400">@${escapeHtml(username.toLowerCase())}</p>
        </div>
      </div>
      <button
        type="button"
        class="chat-btn bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
        data-user-id="${friendId}"
        data-username="${escapeHtml(username)}"
      >
        Chat
      </button>
    `;

    const chatBtn = card.querySelector(".chat-btn");
    if (chatBtn) {
      chatBtn.addEventListener("click", () => {
        localStorage.setItem("chatUserId", friendId);
        localStorage.setItem("chatUsername", username);
        window.location.href = "chat.html";
      });
    }

    containerElement.appendChild(card);
  });
}