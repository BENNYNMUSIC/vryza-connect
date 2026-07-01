const API_URL = "https://vryza-connect-backend-production.up.railway.app";

// Helper function to prevent malicious XSS injections from custom stream titles
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
      console.log(data.stream);
      return data.stream;
    }
  } catch (err) {
    console.error("Failed to fetch stream credentials:", err);
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
    console.error("Failed to start livestream:", err);
  }
}

async function loadLiveStreams() {
  try {
    const res = await fetch(`${API_URL}/api/live`);
    const data = await res.json();
    const container = document.getElementById("liveStreams");

    if (!container) return;
    container.innerHTML = "";

    // Defensive check: handle cases where data or streams array is missing
    if (!data.streams || data.streams.length === 0) {
      container.innerHTML = "<p>No active live streams right now.</p>";
      return;
    }

    data.streams.forEach(stream => {
      // Optional chaining prevents undefined model property crashes
      const safeUsername = escapeHTML(stream.user?.username || "Anonymous Streamer");
      const safeTitle = escapeHTML(stream.title || "Untitled Stream");
      const safePic = stream.user?.profilePic || "default-avatar.png"; 

      const cardHTML = `
        <div class="live-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
          <img src="${safePic}" alt="avatar" style="width: 50px; height: 50px; border-radius: 50%;">
          <h3>${safeUsername}</h3>
          <p>${safeTitle}</p>
          <span>🔴 LIVE</span>
        </div>
      `;
      // insertAdjacentHTML performs drastically better than standard innerHTML updates
      container.insertAdjacentHTML("beforeend", cardHTML);
    });
  } catch (err) {
    console.error("Error loading stream items:", err);
  }
}

// WIRE EVERYTHING TOGETHER ON PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
  const goLiveBtn = document.getElementById("goLiveBtn");

  if (goLiveBtn) {
    goLiveBtn.addEventListener("click", async () => {
      const title = prompt("Enter a title for your live stream:");
      if (!title || !title.trim()) {
        alert("You must provide a title to go live!");
        return;
      }

      // Step 1: Ensure stream credentials / key structure exists
      const stream = await createStream();
      if (!stream) {
        alert("Failed to create stream key. Check auth status.");
        return;
      }

      // Step 2: Set title and change stream status to active live
      const result = await startStream(title.trim());
      if (result && result.success) {
        alert(`Stream configured! Connect your broadcast app (like OBS) using your key: ${stream.streamKey}`);
        loadLiveStreams(); // Refresh the listing layout instantly
      } else {
        alert(`Could not start stream: ${result?.message || "Unknown error"}`);
      }
    });
  }

  // Fetch the active live stream directory immediately when visiting the page
  loadLiveStreams();
});