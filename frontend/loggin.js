// ================= API =================
const API =
  "https://vryza-connect-backend-production.up.railway.app/api/auth";

// ================= CHECK EXISTING LOGIN =================
const existingToken =
  localStorage.getItem("token");

const existingUser =
  localStorage.getItem("user");

// ================= AUTO LOGIN =================
if (
  existingToken &&
  existingUser
) {

  console.log(
    "User already logged in"
  );

  // Uncomment if needed
  // window.location.href = "home.html";
}

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

    // ================= INPUTS =================
    const username =
      document
        .getElementById("regUser")
        .value
        .trim();

    const email =
      document
        .getElementById("regEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("regPass")
        .value
        .trim();

    // ================= VALIDATION =================
    if (
      !username ||
      !email ||
      !password
    ) {

      alert(
        "Please fill all fields"
      );

      return;
    }

    // ================= EMAIL VALIDATION =================
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(email)
    ) {

      alert(
        "Enter valid email"
      );

      return;
    }

    // ================= PASSWORD VALIDATION =================
    if (
      password.length < 6
    ) {

      alert(
        "Password must be at least 6 characters"
      );

      return;
    }

    // ================= BUTTON =================
    const registerBtn =
      document.getElementById(
        "registerBtn"
      );

    if (registerBtn) {

      registerBtn.disabled = true;

      registerBtn.innerText =
        "Creating...";
    }

    // ================= API REQUEST =================
    const res = await fetch(
      `${API}/register`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          username,
          email,
          password

        })
      }
    );

    // ================= RESPONSE =================
    const data =
      await res.json();

    console.log(
      "REGISTER RESPONSE:",
      data
    );

    // ================= FAILED =================
    if (!res.ok) {

      alert(
        data.message ||
        "Registration failed"
      );

      if (registerBtn) {

        registerBtn.disabled = false;

        registerBtn.innerText =
          "Register";
      }

      return;
    }

    // ================= SUCCESS =================
    alert(
      "✅ Account created successfully"
    );

    // ================= CLEAR INPUTS =================
    document.getElementById(
      "regUser"
    ).value = "";

    document.getElementById(
      "regEmail"
    ).value = "";

    document.getElementById(
      "regPass"
    ).value = "";

    // ================= RESET BUTTON =================
    if (registerBtn) {

      registerBtn.disabled = false;

      registerBtn.innerText =
        "Register";
    }

    // ================= SWITCH TO LOGIN =================
    showLogin();

  } catch (err) {

    console.log(
      "REGISTER SERVER ERROR:",
      err
    );

    alert(
      err.message ||
      "Server error"
    );
  }
}

// ================= LOGIN =================
async function login() {

  try {

    // ================= INPUTS =================
    const email =
      document
        .getElementById("logEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("logPass")
        .value
        .trim();

    // ================= VALIDATION =================
    if (
      !email ||
      !password
    ) {

      alert(
        "Please fill all fields"
      );

      return;
    }

    // ================= BUTTON =================
    const loginBtn =
      document.getElementById(
        "loginBtn"
      );

    if (loginBtn) {

      loginBtn.disabled = true;

      loginBtn.innerText =
        "Logging in...";
    }

    // ================= API REQUEST =================
    const res = await fetch(
      `${API}/login`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          email,
          password

        })
      }
    );

    // ================= RESPONSE =================
    const data =
      await res.json();

    console.log(
      "LOGIN RESPONSE:",
      data
    );

    // ================= LOGIN FAILED =================
    if (!res.ok) {

      alert(
        data.message ||
        "Login failed"
      );

      if (loginBtn) {

        loginBtn.disabled = false;

        loginBtn.innerText =
          "Login";
      }

      return;
    }

    // ================= SAVE TOKEN =================
    localStorage.setItem(
      "token",
      data.token
    );

    // ================= SAVE USER =================
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    console.log(
      "TOKEN SAVED:",
      data.token
    );

    console.log(
      "USER SAVED:",
      data.user
    );

    // ================= SUCCESS =================
    alert(
      "✅ Login successful"
    );

    // ================= REDIRECT =================
    window.location.href =
      "home.html";

  } catch (err) {

    console.log(
      "LOGIN SERVER ERROR:",
      err
    );

    alert(
      err.message ||
      "Server error"
    );
  }
}

// ================= ENTER KEY LOGIN =================
const logPass =
  document.getElementById(
    "logPass"
  );

if (logPass) {

  logPass.addEventListener(
    "keypress",

    (e) => {

      if (
        e.key === "Enter"
      ) {

        login();
      }
    }
  );
}

// ================= ENTER KEY REGISTER =================
const regPass =
  document.getElementById(
    "regPass"
  );

if (regPass) {

  regPass.addEventListener(
    "keypress",

    (e) => {

      if (
        e.key === "Enter"
      ) {

        register();
      }
    }
  );
}

// ================= CONNECTION TEST =================
async function testBackend() {

  try {

    const res = await fetch(
      "https://vryza-connect-backend-production.up.railway.app"
    );

    const data =
      await res.json();

    console.log(
      "BACKEND CONNECTED:",
      data
    );

  } catch (err) {

    console.log(
      "BACKEND CONNECTION FAILED:",
      err
    );
  }
}

// ================= RUN TEST =================
testBackend();
