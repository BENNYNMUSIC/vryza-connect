// ============================================================
// VRYZA CONNECT - ADMIN PANEL CONTROLLER
// ============================================================

const API_URL = "https://vryza-connect-backend-1.onrender.com";

// ================= TOKEN HELPER =================
function getCleanToken() {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return null;
  return rawToken.replace(/^Bearer\s+/i, "").trim();
}

const token = getCleanToken();

if (!token) {
  alert("Please login first.");
  window.location.href = "auth.html";
}

const container = document.getElementById("users");

if (!container) {
  console.error("❌ Admin panel: #users element was not found.");
}

// ================= FETCH ALL USERS =================
async function fetchUsers() {
  if (!container) return;

  try {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-10">
        <div class="animate-pulse font-medium">Loading users...</div>
      </div>
    `;

    const cleanToken = getCleanToken();
    const res = await fetch(`${API_URL}/api/admin/users`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      }
    });

    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      console.error("❌ Could not read server response:", jsonError);
      container.innerHTML = `
        <div class="text-center text-red-500 py-10">Server returned an invalid response.</div>
      `;
      return;
    }

    if (res.status === 401) {
      alert("Your login session has expired. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "auth.html";
      return;
    }

    if (res.status === 403) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
          <div class="text-3xl mb-2">🔒</div>
          <h2 class="font-bold text-lg">Administrator Access Required</h2>
          <p class="text-sm mt-1">Your account does not have administrator permissions.</p>
        </div>
      `;
      return;
    }

    if (!res.ok || data.success === false) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
          ⚠️ ${escapeHtml(data.message || "Failed to load users.")}
        </div>
      `;
      return;
    }

    const usersList = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);

    if (usersList.length === 0) {
      container.innerHTML = `<div class="text-center text-gray-400 py-10">No users found.</div>`;
      return;
    }

    container.innerHTML = "";
    usersList.forEach((user) => {
      container.appendChild(createUserCard(user));
    });

  } catch (err) {
    console.error("❌ ADMIN USERS FETCH ERROR:", err);
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
        <div class="text-2xl mb-2">⚠️</div>
        <p class="font-semibold">Could not connect to the server.</p>
        <p class="text-sm mt-1">Please try refreshing the page.</p>
      </div>
    `;
  }
}

// ================= CREATE USER CARD =================
function createUserCard(user) {
  const card = document.createElement("div");
  card.className = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 transition hover:shadow-md";

  const userId = String(user._id || user.id);
  const isAdmin = user.role === "admin";
  const isBanned = Boolean(user.isBanned);

  const roleBadge = isAdmin
    ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">👑 ADMIN</span>`
    : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">USER</span>`;

  let banStatus = "";
  if (isBanned) {
    const bannedDate = new Date(user.bannedUntil);
    banStatus = `
      <div class="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p class="text-sm font-semibold text-red-700">🚫 Currently Banned</p>
          <p class="text-xs text-red-600 mt-0.5">Until: ${formatDate(bannedDate)}</p>
        </div>
        <button
          type="button"
          class="unban-button bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition self-start sm:self-auto"
          data-user-id="${userId}"
        >
          Unban User
        </button>
      </div>
    `;
  } else {
    banStatus = `
      <div class="mt-3 p-3 rounded-xl bg-green-50 border border-green-100">
        <p class="text-sm font-semibold text-green-700">✓ Account Active</p>
      </div>
    `;
  }

  // Resolve profile picture URL
  let avatar = "images/default-avatar.png";
  const rawPic = user.profilePic || user.avatar;
  if (rawPic) {
    avatar = rawPic.startsWith("http") || rawPic.startsWith("data:")
      ? rawPic
      : `${API_URL}/uploads/${rawPic}`;
  }

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        <img
          src="${escapeHtml(avatar)}"
          alt="Profile"
          class="w-14 h-14 rounded-full object-cover border border-gray-200 bg-gray-100"
          onerror="this.src='images/default-avatar.png'"
        >
        <div>
          <h3 class="font-bold text-lg text-gray-800">
            ${escapeHtml(user.username || "Anonymous Account")}
          </h3>
          <p class="text-sm text-gray-500 break-all">
            ${escapeHtml(user.email || "No email provided")}
          </p>
          <div class="mt-2">
            ${roleBadge}
          </div>
        </div>
      </div>

      <div class="text-sm text-gray-400">
        Joined: ${formatDate(user.createdAt)}
      </div>
    </div>

    ${banStatus}

    <div class="mt-4 pt-4 border-t border-gray-100">
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          id="ban-${userId}"
          min="1"
          step="1"
          placeholder="Ban duration (minutes)"
          class="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
          ${isAdmin ? "disabled" : ""}
        />
        <button
          type="button"
          class="ban-button bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-semibold transition"
          data-user-id="${userId}"
          ${isAdmin ? "disabled" : ""}
        >
          ${isAdmin ? "Admin Protected" : "Ban User"}
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 mt-2">
        ${
          !isAdmin
            ? `
              <button
                type="button"
                class="admin-button flex-1 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-semibold transition"
                data-user-id="${userId}"
              >
                👑 Make Admin
              </button>
            `
            : `
              <div class="flex-1 text-center text-sm text-purple-600 bg-purple-50 rounded-xl py-3 font-semibold">
                Administrator Account
              </div>
            `
        }
      </div>
    </div>
  `;

  const banButton = card.querySelector(".ban-button");
  if (banButton && !isAdmin) {
    banButton.addEventListener("click", () => banUser(userId));
  }

  const unbanButton = card.querySelector(".unban-button");
  if (unbanButton) {
    unbanButton.addEventListener("click", () => unbanUser(userId));
  }

  const adminButton = card.querySelector(".admin-button");
  if (adminButton) {
    adminButton.addEventListener("click", () => makeAdmin(userId, user.username));
  }

  return card;
}

// ================= BAN USER =================
async function banUser(userId) {
  try {
    const inputElement = document.getElementById(`ban-${userId}`);
    if (!inputElement) {
      alert("Ban duration input could not be found.");
      return;
    }

    const rawMinutes = inputElement.value.trim();
    const minutes = Number(rawMinutes);

    if (!rawMinutes || !Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(minutes)) {
      alert("Please enter a valid whole number of minutes greater than 0.");
      return;
    }

    const confirmed = confirm(`Are you sure you want to ban this user for ${minutes} minute(s)?`);
    if (!confirmed) return;

    const cleanToken = getCleanToken();
    const res = await fetch(`${API_URL}/api/admin/ban-user`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, durationMinutes: minutes })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      alert("The server returned an invalid response.");
      return;
    }

    if (!res.ok || data.success === false) {
      alert(data.message || "The user could not be banned.");
      return;
    }

    alert(data.message || "User successfully banned.");
    inputElement.value = "";
    await fetchUsers();

  } catch (err) {
    console.error("❌ BAN USER FRONTEND ERROR:", err);
    alert("Could not connect to the server. Please try again.");
  }
}

// ================= UNBAN USER =================
async function unbanUser(userId) {
  try {
    const confirmed = confirm("Are you sure you want to lift the ban for this user?");
    if (!confirmed) return;

    const cleanToken = getCleanToken();
    const res = await fetch(`${API_URL}/api/admin/unban-user`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      alert("The server returned an invalid response.");
      return;
    }

    if (!res.ok || data.success === false) {
      alert(data.message || "Failed to unban user.");
      return;
    }

    alert(data.message || "User ban lifted successfully.");
    await fetchUsers();

  } catch (err) {
    console.error("❌ UNBAN USER FRONTEND ERROR:", err);
    alert("Could not connect to the server. Please try again.");
  }
}

// ================= MAKE ADMIN =================
async function makeAdmin(userId, username) {
  try {
    const confirmed = confirm(`Are you sure you want to make "${username || "this user"}" an administrator?`);
    if (!confirmed) return;

    const cleanToken = getCleanToken();
    const res = await fetch(`${API_URL}/api/admin/make-admin`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      alert("The server returned an invalid response.");
      return;
    }

    if (!res.ok || data.success === false) {
      alert(data.message || "Could not make this user an administrator.");
      return;
    }

    alert(data.message || "User is now an administrator.");
    await fetchUsers();

  } catch (err) {
    console.error("❌ MAKE ADMIN FRONTEND ERROR:", err);
    alert("Could not connect to the server. Please try again.");
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "Unknown";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.fetchUsers = fetchUsers;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.makeAdmin = makeAdmin;

fetchUsers();