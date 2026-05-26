// ================= API =================
const API =
  "https://vryza-connect-backend-production.up.railway.app";

// ================= USER SESSION =================
const token =
  localStorage.getItem("token");

const user =
  JSON.parse(
    localStorage.getItem("user")
  );

// ================= CHECK LOGIN =================
if (!token || !user) {

  window.location.href =
    "auth.html";
}

// ================= LOGOUT =================
function logout() {

  // CLEAR STORAGE
  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  localStorage.removeItem(
    "chatUserId"
  );

  localStorage.removeItem(
    "chatUsername"
  );

  localStorage.removeItem(
    "theme"
  );

  alert(
    "Logged out successfully"
  );

  // REDIRECT
  window.location.href =
    "auth.html";
}

// ================= DARK THEME =================
function setDark() {

  // BODY
  document.body.classList.remove(
    "bg-slate-100"
  );

  document.body.classList.add(
    "bg-slate-900",
    "text-white"
  );

  // SAVE THEME
  localStorage.setItem(
    "theme",
    "dark"
  );

  // UPDATE CARDS
  updateThemeUI("dark");
}

// ================= LIGHT THEME =================
function setLight() {

  // BODY
  document.body.classList.remove(
    "bg-slate-900",
    "text-white"
  );

  document.body.classList.add(
    "bg-slate-100"
  );

  // SAVE THEME
  localStorage.setItem(
    "theme",
    "light"
  );

  // UPDATE UI
  updateThemeUI("light");
}

// ================= UPDATE UI =================
function updateThemeUI(theme) {

  const cards =
    document.querySelectorAll(
      ".theme-card"
    );

  cards.forEach((card) => {

    if (theme === "dark") {

      card.classList.remove(
        "bg-white",
        "text-slate-800"
      );

      card.classList.add(
        "bg-slate-800",
        "text-white",
        "border",
        "border-slate-700"
      );

    } else {

      card.classList.remove(
        "bg-slate-800",
        "text-white",
        "border",
        "border-slate-700"
      );

      card.classList.add(
        "bg-white",
        "text-slate-800"
      );
    }
  });
}

// ================= LOAD THEME =================
window.addEventListener(
  "load",
  () => {

    const theme =
      localStorage.getItem(
        "theme"
      );

    if (
      theme === "dark"
    ) {

      setDark();

    } else {

      setLight();
    }
  }
);

// ================= SUPPORT =================
async function sendSupport() {

  try {

    const supportInput =
      document.getElementById(
        "supportMessage"
      );

    if (!supportInput) {

      return alert(
        "Support box missing"
      );
    }

    const message =
      supportInput.value.trim();

    // CHECK EMPTY
    if (!message) {

      return alert(
        "Write a message"
      );
    }

    // BUTTON
    const button =
      document.getElementById(
        "supportBtn"
      );

    if (button) {

      button.disabled = true;

      button.innerText =
        "Sending...";
    }

    // SEND REQUEST
    const res = await fetch(
      `${API}/api/support`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            token
        },

        body: JSON.stringify({
          message
        })
      }
    );

    const data =
      await res.json();

    // SUCCESS
    if (res.ok) {

      alert(
        data.message ||
        "Support message sent"
      );

      // CLEAR
      supportInput.value = "";

    } else {

      alert(
        data.message ||
        "Failed to send"
      );
    }

    // RESET BUTTON
    if (button) {

      button.disabled = false;

      button.innerText =
        "Send";
    }

  } catch (err) {

    console.log(
      "SUPPORT ERROR:",
      err
    );

    alert(
      "Server error"
    );

    // RESET BUTTON
    const button =
      document.getElementById(
        "supportBtn"
      );

    if (button) {

      button.disabled = false;

      button.innerText =
        "Send";
    }
  }
}

// ================= KEYBOARD SEND =================
const supportInput =
  document.getElementById(
    "supportMessage"
  );

if (supportInput) {

  supportInput.addEventListener(
    "keypress",
    (e) => {

      if (
        e.key === "Enter" &&
        !e.shiftKey
      ) {

        e.preventDefault();

        sendSupport();
      }
    }
  );
}