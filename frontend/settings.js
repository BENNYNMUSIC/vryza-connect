// ================= MASTER SERVER PATHWAY LOCATORS =================
const API = "https://vryza-connect-backend-1.onrender.com";

// ================= USER SESSION SECURITY CHECKS =================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "auth.html";
}

function getAuthHeader() {
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// ================= USER DESTROY SESSION (LOGOUT) =================
function logout() {
  localStorage.clear();
  alert("Logged out successfully");
  window.location.href = "auth.html";
}

// ================= THEME (shared with every page via theme.js) =================
function refreshThemeButtons() {
  const mode = window.VryzaTheme ? window.VryzaTheme.get() : (localStorage.getItem("theme") || "light");
  document.querySelectorAll("#themeChoices [data-theme]").forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.theme === mode));
  });
}

function applyTheme(mode) {
  if (window.VryzaTheme) {
    window.VryzaTheme.set(mode);
  } else {
    localStorage.setItem("theme", mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }
  refreshThemeButtons();
}

function setDark() { applyTheme("dark"); }
function setLight() { applyTheme("light"); }
function setSystem() { applyTheme("system"); }

// ================= SUPPORT COMMUNICATIONS TRANSLATOR =================
async function sendSupport() {
  const supportInput = document.getElementById("supportMessage");
  const button = document.getElementById("supportBtn");

  if (!supportInput) {
    return alert("Support field missing on active interface rendering tree.");
  }

  const message = supportInput.value.trim();

  if (!message) {
    return alert("Please write a message before requesting connection.");
  }

  try {
    if (button) {
      button.disabled = true;
      button.innerText = "Sending...";
    }

    let res = await fetch(`${API}/api/support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getAuthHeader()
      },
      body: JSON.stringify({ message })
    });

    if (res.status === 404) {
      res = await fetch(`${API}/api/user/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getAuthHeader()
        },
        body: JSON.stringify({ message })
      });
    }

    const data = await res.json();

    if (res.ok) {
      alert(data.message || "Support request dispatched successfully.");
      supportInput.value = "";
    } else {
      alert(data.message || "Transmission rejected by security layer validation.");
    }

  } catch (err) {
    console.error("❌ CRITICAL SUPPORT BUS FAULT:", err);
    alert("Pipeline timeout routing communication dispatch packet.");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerText = "Submit Ticket";
    }
  }
}

// ================= INITIALIZATION =================
// ================= INSTALL APP (PWA) =================
function refreshInstallUI() {
  const pwa = window.VryzaPWA;
  const btn = document.getElementById("pwaInstallBtn");
  const text = document.getElementById("pwaText");
  if (!pwa || !btn || !text) return;

  btn.classList.add("hidden");
  if (pwa.isInstalled()) {
    text.textContent = "✓ Vryza+ is installed on this device.";
  } else if (pwa.canInstall()) {
    text.textContent = "Add Vryza+ to your home screen for a faster, full-screen experience.";
    btn.classList.remove("hidden");
  } else if (pwa.needsIosHint()) {
    text.textContent = "On iPhone/iPad: tap the Share button in Safari, then choose \u201cAdd to Home Screen\u201d.";
  } else {
    text.textContent = "To install, open your browser menu and choose \u201cInstall app\u201d or \u201cAdd to Home Screen\u201d.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const installBtn = document.getElementById("pwaInstallBtn");
  if (installBtn) installBtn.addEventListener("click", async () => {
    if (window.VryzaPWA) await window.VryzaPWA.install();
    refreshInstallUI();
  });
  window.addEventListener("vryza:installable", refreshInstallUI);
  window.addEventListener("vryza:installed", refreshInstallUI);
  refreshInstallUI();

  refreshThemeButtons();
  window.addEventListener("vryza:theme", refreshThemeButtons);

  const supportInput = document.getElementById("supportMessage");
  if (supportInput) {
    supportInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendSupport();
      }
    });
  }
});



// ================= EXPORT METHODS FOR DOM BINDINGS =================
window.logout = logout;
window.setDark = setDark;
window.setLight = setLight;
window.setSystem = setSystem;
window.sendSupport = sendSupport;