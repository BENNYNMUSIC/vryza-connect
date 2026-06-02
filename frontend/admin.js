// ================= API CONFIGURATION =================
const API_URL = "https://vryza-connect-backend-production.up.railway.app";

// ================= SECURITY HANDSHAKE TOKEN =================
const token = localStorage.getItem("token");

// ================= SECURE ROUTE GUARD CHECK =================
if (!token) {
  alert("Please login first");
  window.location.href = "auth.html";
}

// ================= UI DOM CONTAINER REFERENCE =================
const container = document.getElementById("users");

// ================= FETCH ALL USERS (SYNCED WITH BACKEND) =================
async function fetchUsers() {
  try {
    // 1. Render Loading State
    container.innerHTML = `
      <div class="text-center text-gray-500 py-10">
        <span class="animate-pulse">Loading users...</span>
      </div>
    `;

    // 2. Dispatch Fetch Request
    const res = await fetch(`${API_URL}/admin/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("📥 USERS NETWORK RESPONSE:", data);

    // 3. Handle Network and Backend Validation Failures
    if (!res.ok || data.success === false) {
      container.innerHTML = `
        <div class="text-center text-red-500 py-10 font-medium">
          ⚠️ ${data.message || "Failed to load users"}
        </div>
      `;
      return;
    }

    // Extract the users array from the backend payload object safely
    const usersList = data.users || [];

    // 4. Handle Empty Database Conditions Safely
    if (usersList.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-400 py-10">
          No users found in system directories.
        </div>
      `;
      return;
    }

    // 5. Clear Out Existing HTML Content Nodes Before Injecting
    container.innerHTML = "";

    // 6. Build and Append Dynamic User Profiles to the Feed Container
    usersList.forEach((user) => {
      const card = document.createElement("div");
      card.className = "bg-white p-5 rounded-2xl shadow border border-gray-100 mb-4 transition hover:shadow-md";

      // Dynamically style the user badge based on their system security roles
      const isAdminRole = user.role === "admin";
      const badgeStyles = isAdminRole 
        ? "bg-purple-100 text-purple-700 font-bold" 
        : "bg-blue-100 text-blue-600 font-semibold";

      card.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-lg text-gray-800">
              ${user.username || "Anonymous Account"}
            </h3>
            <p class="text-sm text-gray-500">
              ${user.email || "No Email Provided"}
            </p>
          </div>
          <div class="text-xs px-3 py-1 rounded-full uppercase tracking-wider ${badgeStyles}">
            ${user.role || "user"}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="number"
            placeholder="Ban duration (minutes)"
            id="ban-${user._id}"
            min="1"
            class="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-red-200 focus:border-red-400"
          />
          <button
            onclick="banUser('${user._id}')"
            class="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl font-semibold tracking-wide transition transform active:scale-95"
          >
            Ban User
          </button>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("❌ CRITICAL FRONTEND FETCH ERROR:", err);
    container.innerHTML = `
      <div class="text-center text-red-500 py-10 font-semibold">
        Server connection lost. Please try refreshing.
      </div>
    `;
  }
}

// ================= DISPATCH BAN ACTION (SYNCED WITH BACKEND) =================
async function banUser(userId) {
  try {
    const inputElement = document.getElementById(`ban-${userId}`);
    if (!inputElement) return;

    const rawMinutes = inputElement.value.trim();

    // 1. Client-Side Input Validation Guard
    if (!rawMinutes || Number(rawMinutes) <= 0) {
      alert("Please specify a valid number of minutes greater than 0.");
      return;
    }

    // 2. Dispatch Ban Action to the Refactored Admin Endpoint Route
    const res = await fetch(`${API_URL}/admin/ban-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        durationMinutes: Number(rawMinutes)
      })
    });

    const data = await res.json();
    console.log("📤 BAN NETWORK DISPATCH RESPONSE:", data);

    // 3. Handle Backend Response States Accurately
    if (res.ok && data.success !== false) {
      alert(data.message || "User was successfully locked out.");
      inputElement.value = ""; // Flush the input box on successful operation
    } else {
      alert(data.message || "Administrative ban execution failed.");
    }

  } catch (err) {
    console.error("❌ CRITICAL FRONTEND BAN ACTION TRANSACTION ERROR:", err);
    alert("Connection error. Could not contact administration cluster.");
  }
}

// Make sure functions are mounted globally on window so your inline string templates can execute them
window.banUser = banUser;

// ================= INITIAL RUN ON LOAD =================
fetchUsers();