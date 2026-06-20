const API_URL = "https://vryza-connect-backend-production.up.railway.app";

async function createStream() {
  const token = localStorage.getItem("token");

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
}

async function startStream(title) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/live/start`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title
    })
  });

  return res.json();
}

async function loadLiveStreams() {
  const res = await fetch(`${API_URL}/api/live`);

  const data = await res.json();

  const container = document.getElementById("liveStreams");

  container.innerHTML = "";

  data.streams.forEach(stream => {
    container.innerHTML += `
      <div class="live-card">
        <img src="${stream.user.profilePic}">
        <h3>${stream.user.username}</h3>
        <p>${stream.title}</p>
        <span>🔴 LIVE</span>
      </div>
    `;
  });
}