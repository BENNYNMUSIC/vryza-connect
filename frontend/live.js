const API_URL = "https://vryza-connect-backend-production.up.railway.app";

// Helper function to safely escape strings to prevent basic XSS injections
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

async function createStream() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/live/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (data.success) {
      console.log("Stream layout configured:", data.stream);
      return data.stream;
    }
  } catch (err) {
    console.error("Failed to create stream key layout:", err);
  }
}

async function startStream(title) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/live/start`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });

    return await res.json();
  } catch (err) {
    console.error("Failed to transition stream status to live:", err);
  }
}

async function loadLiveStreams() {
  try {
    const res = await fetch(`${API_URL}/api/live`);
    const data = await res.json();
    const container = document.getElementById("liveStreams");

    if (!container) return;
    container.innerHTML = ""; // Clear existing content once safely

    if (!data.streams || data.streams.length === 0) {
      container.innerHTML = "<p>No active live streams right now.</p>";
      return;
    }

    data.streams.forEach(stream => {
      // Escape dynamic string properties to secure DOM insertion points
      const safeUsername = escapeHTML(stream.user?.username || "Unknown User");
      const safeTitle = escapeHTML(stream.title || "Untitled Stream");
      const safePic = stream.user?.profilePic || "default-avatar.png"; 

      const cardHTML = `
        <div class="live-card">
          <img src="${safePic}" alt="${safeUsername}'s avatar" style="width:50px; height:50px; border-radius:50%;">
          <h3>${safeUsername}</h3>
          <p>${safeTitle}</p>
          <span>🔴 LIVE</span>
        </div>
      `;
      // insertAdjacentHTML keeps existing DOM states fully intact
      container.insertAdjacentHTML("beforeend", cardHTML);
    });
  } catch (err) {
    console.error("Error loading livestreams:", err);
  }
}

// Wire everything up automatically when DOM parses
document.addEventListener("DOMContentLoaded", () => {
  const goLiveBtn = document.getElementById("goLiveBtn");
  
  if (goLiveBtn) {
    goLiveBtn.addEventListener("click", async () => {
      const title = prompt("Enter a title for your live stream:");
      if (!title || !title.trim()) {
        alert("A stream title is required to go live!");
        return;
      }

      // 1. Ensure stream structure / streamKey exists
      const stream = await createStream();
      if (!stream) {
        alert("Could not register stream credentials with server.");
        return;
      }

      // 2. Alert server stream state is shifting to active active
      const result = await startStream(title.trim());
      if (result && result.success) {
        alert("Stream initialized! Connect your encoder software (OBS) using your stream key.");
        loadLiveStreams(); // Refresh local overview
      } else {
        alert(`Failed to activate stream: ${result?.message || 'Unknown error'}`);
      }
    });
  }

  // Initial load execution
  loadLiveStreams();
});