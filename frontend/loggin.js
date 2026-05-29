// ================= API ENDPOINT PATHWAY MARKERS =================
const API = "https://vryza-connect-backend-production.up.railway.app/api/auth";

// ================= ESTABLISH STATE SESSION CACHE =================
const existingToken = localStorage.getItem("token");
const existingUser = localStorage.getItem("user");

// ================= SECURE ACTIVE SESSION ROUTE GUARD =================
if (existingToken && existingUser) {
  console.log("🔄 Active system session discovered. Forwarding to timeline...");
  // Safe redirect guard: checks to ensure the client is not already viewing the dashboard path
  if (!window.location.href.includes("home.html")) {
     window.location.href = "home.html";
  }
}

// ================= WORKFLOW CONTAINER TOGGLES =================
function showSignup() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("signupBox").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("signupBox").classList.add("hidden");
  document.getElementById("loginBox").classList.remove("hidden");
}

// ================= DISPATCH NEW ACCOUNT REGISTRATION =================
async function register() {
  const registerBtn = document.getElementById("registerBtn");
  
  try {
    // Gather and trim layout input fields
    const username = document.getElementById("regUser").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPass").value.trim();

    // 1. Mandatory Presence Data Guards
    if (!username || !email || !password) {
      alert("Form submission incomplete. Please fill out all fields.");
      return;
    }

    // 2. Client Side Format Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Invalid email layout structure. Please fix.");
      return;
    }

    if (password.length < 6) {
      alert("Security constraint error: Passwords must contain at least 6 characters.");
      return;
    }

    // 3. UI State Preservation Loading Feedback
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.innerText = "Processing...";
    }

    // 4. Dispatch Network Request
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    console.log("📥 REGISTER SYSTEM INTERCEPT:", data);

    // 5. Handle Network Error and Logical Rejections Synchronously
    if (!res.ok || data.success === false) {
      alert(data.message || "Registration operation rejected by validation cluster.");
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.innerText = "Register";
      }
      return;
    }

    // 6. Complete Success Execution Pipeline
    alert("✅ Registration successful! Please log into your new profile.");
    
    // Clear registration fields completely
    document.getElementById("regUser").value = "";
    document.getElementById("regEmail").value = "";
    document.getElementById("regPass").value = "";

    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.innerText = "Register";
    }

    showLogin();

  } catch (err) {
    console.error("❌ REGISTRATION TRANSACTION CRITICAL FAILURE:", err);
    alert("Connection to authentication servers dropped. Please retry.");
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
    const email = document.getElementById("logEmail").value.trim();
    const password = document.getElementById("logPass").value.trim();

    if (!email || !password) {
      alert("Identity values required. Please provide email and password.");
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerText = "Verifying...";
    }

    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log("📥 LOGIN SYSTEM INTERCEPT:", data);

    // Core validation check maps response states accurately
    if (!res.ok || data.success === false) {
      alert(data.message || "Access denied. Invalid credentials provided.");
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerText = "Login";
      }
      return;
    }

    // Extract values safely, supporting both direct wrapping and explicit 'data' containers
    const targetToken = data.token || (data.data && data.data.token);
    const targetUser = data.user || (data.data && data.data.user);

    if (!targetToken || !targetUser) {
      throw new Error("Malformed application token authentication structure received from cluster.");
    }

    // 7. Write Verification Keys to Client Storage
    localStorage.setItem("token", targetToken);
    localStorage.setItem("user", JSON.stringify(targetUser));

    console.log("🔑 Handshake token cached successfully.");

    alert("✅ Login authorized successfully.");
    window.location.href = "home.html";

  } catch (err) {
    console.error("❌ CLIENT IDENTITY TRANSACTION EXCEPTION:", err);
    alert(err.message || "Internal network portal pipeline failure.");
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerText = "Login";
    }
  }
}

// ================= MOUNT INTERACTIVE KEY LISTENERS =================
const logPassElement = document.getElementById("logPass");
if (logPassElement) {
  logPassElement.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
}

const regPassElement = document.getElementById("regPass");
if (regPassElement) {
  regPassElement.addEventListener("keypress", (e) => {
    if (e.key === "Enter") register();
  });
}

// ================= INTEGRITY MONITOR CONNECTION TEST =================
async function testBackend() {
  try {
    const rootUrl = API.replace("/api/auth", "");
    const res = await fetch(rootUrl);
    const data = await res.json();
    console.log("🌐 System Core Pipeline Status:", data);
  } catch (err) {
    console.warn("⚠️ Pipeline warning: Host connection diagnostic ping failed.", err.message);
  }
}

// Map workflow targets onto the global browser window runtime layout
window.showSignup = showSignup;
window.showLogin = showLogin;
window.register = register;
window.login = login;

// Run diagnostics on load
testBackend();