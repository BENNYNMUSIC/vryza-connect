const API_URL =
  "https://vryza-connect-backend-production.up.railway.app";

// ================= TOKEN =================
const token =
  localStorage.getItem("token");

// ================= CHECK LOGIN =================
if (!token) {

  alert("Please login first");

  window.location.href =
    "auth.html";
}

// ================= USERS CONTAINER =================
const container =
  document.getElementById("users");

// ================= FETCH USERS =================
async function fetchUsers() {

  try {

    container.innerHTML = `
      <div class="text-center text-gray-500 py-10">
        Loading users...
      </div>
    `;

    const res = await fetch(
      `${API_URL}/admin/users`,
      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",
          token: token
        }
      }
    );

    // ================= HANDLE ERRORS =================
    if (!res.ok) {

      container.innerHTML = `
        <div class="text-center text-red-500 py-10">
          Failed to load users
        </div>
      `;

      return;
    }

    const users = await res.json();

    // ================= NO USERS =================
    if (!users || users.length === 0) {

      container.innerHTML = `
        <div class="text-center text-gray-500 py-10">
          No users found
        </div>
      `;

      return;
    }

    // ================= CLEAR CONTAINER =================
    container.innerHTML = "";

    // ================= LOOP USERS =================
    users.forEach(user => {

      const div = document.createElement("div");

      div.className =
        "bg-white p-5 rounded-2xl shadow border border-gray-100 mb-4";

      div.innerHTML = `
        <div class="flex items-center justify-between mb-4">

          <div>
            <h3 class="font-bold text-lg text-gray-800">
              ${user.username || "Unknown User"}
            </h3>

            <p class="text-sm text-gray-500">
              ${user.email || "No Email"}
            </p>
          </div>

          <div class="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600 font-semibold">
            USER
          </div>

        </div>

        <div class="flex items-center gap-2">

          <input
            type="number"
            placeholder="Ban minutes"
            id="ban-${user._id}"
            class="
              flex-1
              border
              border-gray-300
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-red-200
            "
          />

          <button
            onclick="banUser('${user._id}')"
            class="
              bg-red-500
              hover:bg-red-600
              text-white
              px-5
              py-3
              rounded-xl
              font-semibold
              transition
            "
          >
            Ban
          </button>

        </div>
      `;

      container.appendChild(div);

    });

  } catch (err) {

    console.log("FETCH USERS ERROR:", err);

    container.innerHTML = `
      <div class="text-center text-red-500 py-10">
        Server error while loading users
      </div>
    `;
  }
}

// ================= BAN USER =================
async function banUser(userId) {

  const input =
    document.getElementById(`ban-${userId}`);

  const minutes =
    input.value.trim();

  // ================= VALIDATION =================
  if (!minutes || minutes <= 0) {

    alert("Enter valid ban minutes");

    return;
  }

  try {

    const res = await fetch(
      `${API_URL}/admin/ban-user`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          token: token
        },

        body: JSON.stringify({
          userId: userId,
          durationMinutes: Number(minutes)
        })
      }
    );

    const data = await res.json();

    // ================= SUCCESS =================
    if (res.ok) {

      alert(data.message || "User banned successfully");

      input.value = "";

    } else {

      alert(data.message || "Failed to ban user");
    }

  } catch (err) {

    console.log("BAN USER ERROR:", err);

    alert("Server error");
  }
}

// ================= START =================
fetchUsers();