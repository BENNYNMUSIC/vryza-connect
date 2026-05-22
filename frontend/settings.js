// ================= API =================
const API = "http://localhost:5000";

// ================= LOGOUT =================
function logout() {

  localStorage.clear();

  alert("Logged out successfully");

  window.location.href = "auth.html";
}

// ================= DARK THEME =================
function setDark() {

  document.body.classList.remove(
    "bg-slate-100"
  );

  document.body.classList.add(
    "bg-slate-900",
    "text-white"
  );

  localStorage.setItem("theme", "dark");
}

// ================= LIGHT THEME =================
function setLight() {

  document.body.classList.remove(
    "bg-slate-900",
    "text-white"
  );

  document.body.classList.add(
    "bg-slate-100"
  );

  localStorage.setItem("theme", "light");
}

// ================= LOAD THEME =================
window.onload = () => {

  const theme =
    localStorage.getItem("theme");

  if (theme === "dark") {

    setDark();

  } else {

    setLight();
  }
};

// ================= SUPPORT =================
async function sendSupport() {

  const message =
    document
      .getElementById("supportMessage")
      .value
      .trim();

  // CHECK EMPTY
  if (!message) {

    return alert("Write a message");
  }

  try {

    const token =
      localStorage.getItem("token");

    const res = await fetch(
      `${API}/api/support`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization: token
        },

        body: JSON.stringify({
          message
        })
      }
    );

    const data = await res.json();

    // SUCCESS
    if (res.ok) {

      alert(
        data.message ||
        "Support message sent"
      );

      // CLEAR TEXTAREA
      document.getElementById(
        "supportMessage"
      ).value = "";

    } else {

      alert(
        data.message ||
        "Failed to send"
      );
    }

  } catch (err) {

    console.log(err);

    alert("Server error");
  }
}