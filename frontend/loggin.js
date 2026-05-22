const API = "http://localhost:5000/api/auth";

// ================= TOGGLE FORMS =================
function showSignup() {

  document
    .getElementById("loginBox")
    .classList.add("hidden");

  document
    .getElementById("signupBox")
    .classList.remove("hidden");
}

function showLogin() {

  document
    .getElementById("signupBox")
    .classList.add("hidden");

  document
    .getElementById("loginBox")
    .classList.remove("hidden");
}

// ================= REGISTER =================
async function register() {

  try {

    const username =
      document.getElementById("regUser").value.trim();

    const email =
      document.getElementById("regEmail").value.trim();

    const password =
      document.getElementById("regPass").value.trim();

    // VALIDATION
    if (!username || !email || !password) {

      return alert("Please fill all fields");
    }

    const res = await fetch(
      `${API}/signup`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          username,
          email,
          password
        })
      }
    );

    const data = await res.json();

    // ERROR
    if (!res.ok) {

      return alert(
        data.message || "Signup failed"
      );
    }

    alert("✅ Account created successfully");

    // CLEAR FIELDS
    document.getElementById("regUser").value = "";
    document.getElementById("regEmail").value = "";
    document.getElementById("regPass").value = "";

    // SWITCH TO LOGIN
    showLogin();

  } catch (err) {

    console.log(err);

    alert("Server error");
  }
}

// ================= LOGIN =================
async function login() {

  try {

    const email =
      document.getElementById("logEmail").value.trim();

    const password =
      document.getElementById("logPass").value.trim();

    // VALIDATION
    if (!email || !password) {

      return alert("Please fill all fields");
    }

    const res = await fetch(
      `${API}/login`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await res.json();

    // LOGIN FAILED
    if (!res.ok) {

      return alert(
        data.message || "Login failed"
      );
    }

    // SAVE TOKEN
    localStorage.setItem(
      "token",
      data.token
    );

    // SAVE USER
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    alert("✅ Login successful");

    // REDIRECT
    window.location.href = "home.html";

  } catch (err) {

    console.log(err);

    alert("Server error");
  }
}