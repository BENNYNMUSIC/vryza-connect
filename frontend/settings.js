// ================= MASTER SERVER PATHWAY LOCATORS =================
const API = "https://vryza-connect-backend-production.up.railway.app";

// ================= USER SESSION SECURITY CHECKS =================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || null);

// Immediate redirect defense loop if token credentials are empty
if (!token || !user) {
  window.location.href = "auth.html";
}

// Helper function to safely format the token with Bearer scheme
function getAuthHeader() {
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// ================= USER DESTROY SESSION (LOGOUT) =================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("chatUserId");
  localStorage.removeItem("chatUsername");
  localStorage.removeItem("profileUserId");
  localStorage.removeItem("theme");

  alert("Logged out successfully");
  window.location.href = "auth.html";
}

// ================= DARK THEME CONVERTER ENGINE =================
function setDark() {
  document.body.classList.remove("bg-slate-100", "text-slate-800");
  document.body.classList.add("bg-slate-900", "text-white");

  localStorage.setItem("theme", "dark");
  updateThemeUI("dark");
}

// ================= LIGHT THEME CONVERTER ENGINE =================
function setLight() {
  document.body.classList.remove("bg-slate-900", "text-white");
  document.body.classList.add("bg-slate-100", "text-slate-800");

  localStorage.setItem("theme", "light");
  updateThemeUI("light");
}

// ================= DYNAMIC BATCH UPDATE THEME CLASSES =================
function updateThemeUI(theme) {
  const cards = document.querySelectorAll(".theme-card");

  cards.forEach((card) => {
    if (theme === "dark") {
      card.classList.remove("bg-white", "text-slate-800", "border-slate-200");
      card.classList.add("bg-slate-800", "text-white", "border-slate-700");
    } else {
      card.classList.remove("bg-slate-800", "text-white", "border-slate-700");
      card.classList.add("bg-white", "text-slate-800", "border-slate-200");
    }
  });
}

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
    // UI Loading feedback transformation
    if (button) {
      button.disabled = true;
      button.innerText = "Sending...";
    }

    // Connects seamlessly with backend payload requirements
    const res = await fetch(`${API}/api/support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getAuthHeader()
      },
      body: JSON.stringify({ message: message })
    });

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
    // Guaranteed reset regardless of operation result state outcomes
    if (button) {
      button.disabled = false;
      button.innerText = "Send";
    }
  }
}

// ================= PROTECTED INITIALIZATION MOUNT LOOP =================
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Load active system preference themes instantly
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    setDark();
  } else {
    setLight();
  }

  // 2. Attach keyboard event listeners safely after DOM trees render
  const supportInput = document.getElementById("supportMessage");
  if (supportInput) {
    supportInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Stop default paragraph breaks
        sendSupport();
      }
    });
  }
});

// ================= EXPORT METHODS FOR DOM INLINE BINDINGS =================
window.logout = logout;
window.setDark = setDark;
window.setLight = setLight;
window.sendSupport = sendSupport;