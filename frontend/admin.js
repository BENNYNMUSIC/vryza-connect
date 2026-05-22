const API_URL = "https://vryza-connect-backend.onrender.com";

const token = localStorage.getItem("token");


// ================= FETCH USERS =================
async function fetchUsers() {

  try {

    const res = await fetch(`${API_URL}/admin/users`, {
      headers: {
        token: token
      }
    });

    const users = await res.json();

    const container = document.getElementById("users");

    container.innerHTML = "";

    users.forEach(user => {

      const div = document.createElement("div");

      div.className =
        "bg-white p-4 rounded-xl shadow mb-4";

      div.innerHTML = `
        <h3 style="font-weight:bold;">
          ${user.username}
        </h3>

        <p>${user.email}</p>

        <input
          type="number"
          placeholder="Ban minutes"
          id="ban-${user._id}"
          style="
            padding:8px;
            margin-top:10px;
            border:1px solid gray;
            border-radius:8px;
          "
        />

        <button
          onclick="banUser('${user._id}')"
          style="
            background:red;
            color:white;
            padding:8px 14px;
            border:none;
            border-radius:8px;
            margin-left:8px;
            cursor:pointer;
          "
        >
          Ban
        </button>
      `;

      container.appendChild(div);

    });

  } catch (err) {

    console.log(err);

  }

}


// ================= BAN USER =================
async function banUser(userId) {

  const minutes =
    document.getElementById(`ban-${userId}`).value;

  if (!minutes) {
    alert("Enter minutes");
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
          userId,
          durationMinutes: minutes
        })
      }
    );

    const data = await res.json();

    alert(data.message);

  } catch (err) {

    console.log(err);

  }

}

fetchUsers();