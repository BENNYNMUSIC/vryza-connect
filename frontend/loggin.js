// ================= API ENDPOINT CONFIGURATION =================
const BASE_URL = "https://vryza-connect-backend-1.onrender.com/api";
const AUTH_API = `${BASE_URL}/auth`;

// ================= ESTABLISH STATE SESSION CACHE =================
const existingToken = localStorage.getItem("token");
const existingUser = localStorage.getItem("user");

// ================= SECURE ACTIVE SESSION ROUTE GUARD =================
if (existingToken && existingUser) {
  console.log("🔄 Active system session discovered. Forwarding to home...");
  if (!window.location.pathname.endsWith("home.html")) {
    window.location.href = "home.html";
  }
}

// ================= WORKFLOW CONTAINER TOGGLES =================
function showSignup() {
  document.getElementById("loginBox")?.classList.add("hidden");
  document.getElementById("signupBox")?.classList.remove("hidden");
}

function showLogin() {
  document.getElementById("signupBox")?.classList.add("hidden");
  document.getElementById("loginBox")?.classList.remove("hidden");
}

// ================= DISPATCH NEW ACCOUNT REGISTRATION =================
async function register() {
  const registerBtn = document.getElementById("registerBtn");

  try {
    const username = document.getElementById("regUser")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const password = document.getElementById("regPass")?.value.trim();

    if (!username || !email || !password) {
      alert("Form submission incomplete. Please fill out all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Invalid email layout structure. Please fix.");
      return;
    }

    if (password.length < 6) {
      alert("Security constraint error: Passwords must contain at least 6 characters.");
      return;
    }

    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.innerText = "Processing...";
    }

    const res = await fetch(`${AUTH_API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    console.log("📥 REGISTER SYSTEM INTERCEPT:", data);

    if (!res.ok || data.success === false) {
      alert(data.message || "Registration operation rejected by server.");
      return;
    }

    alert("✅ Registration successful! Please log into your new profile.");

    document.getElementById("regUser").value = "";
    document.getElementById("regEmail").value = "";
    document.getElementById("regPass").value = "";

    showLogin();
  } catch (err) {
    console.error("❌ REGISTRATION TRANSACTION FAILURE:", err);
    alert("Connection to authentication servers dropped. Please retry.");
  } finally {
    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.innerText = "Register";
    }
  }
}

// ================= EXECUTE USER SESSION AUTHENTICATION =================
async function login() {
  const loginBtn = document.getElementById("loginBtn");

  try {
    const email = document.getElementById("logEmail")?.value.trim();
    const password = document.getElementById("logPass")?.value.trim();

    if (!email || !password) {
      alert("Identity values required. Please provide email and password.");
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerText = "Verifying...";
    }

    const res = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log("📥 LOGIN SYSTEM INTERCEPT:", data);

    if (!res.ok || data.success === false) {
      alert(data.message || "Access denied. Invalid credentials provided.");
      return;
    }

    const targetToken = data.token || data.data?.token;
    const targetUser = data.user || data.data?.user;

    if (!targetToken || !targetUser) {
      throw new Error("Malformed application token structure received from server.");
    }

    localStorage.setItem("token", targetToken);
    localStorage.setItem("user", JSON.stringify(targetUser));

    console.log("🔑 Handshake token cached successfully.");
    alert("✅ Login authorized successfully.");
    window.location.href = "home.html";
  } catch (err) {
    console.error("❌ CLIENT IDENTITY TRANSACTION EXCEPTION:", err);
    alert(err.message || "Internal network portal pipeline failure.");
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  }
}

// ================= MOUNT KEY LISTENERS & DIAGNOSTICS =================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logPass")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });

  document.getElementById("regPass")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") register();
  });
});

async function testBackend() {
  try {
    const rootUrl = BASE_URL.replace("/api", "");
    const res = await fetch(rootUrl);
    const data = await res.json();
    console.log("🌐 System Core Pipeline Status:", data);
  } catch (err) {
    console.warn("⚠️ Pipeline warning: Host connection diagnostic ping failed.", err.message);
  }
}

// Map functions to window object
window.showSignup = showSignup;
window.showLogin = showLogin;
window.register = register;
window.login = login;

testBackend();