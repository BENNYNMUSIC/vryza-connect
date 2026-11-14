// ======================================================
// VRYZA+ LIVE STUDIO - go live from your phone or computer camera (no OBS, no port 1935)
// ======================================================
const API_URL = "https://vryza-connect-backend-1.onrender.com";
const HEARTBEAT_MS = 10000;

const rawToken = localStorage.getItem("token");
const token = rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
if (!token) { window.location.replace("auth.html"); throw new Error("Not logged in"); }

const $ = (id) => document.getElementById(id);
const video = $("videoPreview");

let stream = null;        // my stream record from the server
let room = null;          // LiveKit room while broadcasting
let phase = "offline";    // offline | connecting | live | reconnecting
let socket = null;
let heartbeat = null;
let clockTimer = null;
let wakeLock = null;
let busy = false;
let facing = "user";
let micOn = true;
let camOn = true;
let coinsToday = 0;

/* ---------------- helpers ---------------- */
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === "class") el.className = v; else if (k === "text") el.textContent = v; else el.setAttribute(k, v);
  });
  children.flat().forEach((c) => { if (c != null) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}
function toast(message, isError) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = h("div", { class: "toast" + (isError ? " err" : ""), role: "status", text: message });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: headers() });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.replace("auth.html"); throw new Error("Session expired"); }
  let data = {};
  try { data = await res.json(); } catch (e) {}
  return { res, data };
}
const pad = (n) => String(n).padStart(2, "0");
function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/* ---------------- screen state ---------------- */
function render() {
  const el = $("status");
  el.className = "status";
  const live = phase === "live" || phase === "reconnecting";
  if (phase === "live") { el.classList.add("live"); el.textContent = "🔴 LIVE"; }
  else if (phase === "connecting") { el.classList.add("waiting"); el.textContent = "🟡 Starting camera…"; }
  else if (phase === "reconnecting") { el.classList.add("waiting"); el.textContent = "🟡 Reconnecting…"; }
  else el.textContent = stream && stream.isLive ? "🟡 Tap Go live to resume" : "⚫ Offline";

  $("goLiveBtn").disabled = busy || live || phase === "connecting";
  $("stopLiveBtn").disabled = busy || !(live || phase === "connecting" || (stream && stream.isLive));

  ["micBtn", "camBtn", "flipBtn"].forEach((id) => { $(id).disabled = !live; });
  $("micBtn").textContent = micOn ? "🎤 Mic on" : "🔇 Mic off";
  $("micBtn").classList.toggle("off", !micOn);
  $("camBtn").textContent = camOn ? "📷 Camera on" : "🚫 Camera off";
  $("camBtn").classList.toggle("off", !camOn);
  video.classList.toggle("mirror", facing === "user");

  const msg = $("previewMsg");
  if (live && camOn) msg.classList.add("hidden");
  else {
    msg.classList.remove("hidden");
    msg.textContent = phase === "connecting" ? "Starting your camera…" : live ? "Your camera is off." : "Press Go live to start your camera.";
  }

  clearInterval(clockTimer);
  const tick = () => { $("duration").textContent = live && stream && stream.startedAt ? formatDuration(Date.now() - new Date(stream.startedAt).getTime()) : "00:00:00"; };
  tick();
  if (live) clockTimer = setInterval(tick, 1000);
}

/* ---------------- broadcasting ---------------- */
function formBody() {
  return JSON.stringify({ title: $("streamTitle").value.trim(), description: $("streamDescription").value.trim(), category: $("category").value });
}

function stopHeartbeat() { clearInterval(heartbeat); heartbeat = null; }

function startHeartbeat() {
  stopHeartbeat();
  heartbeat = setInterval(async () => {
    try {
      const { data } = await api("/api/live/heartbeat", { method: "PUT", body: "{}" });
      if (data && data.live === false) await teardown(false, "Your stream was ended.");
    } catch (e) {}
  }, HEARTBEAT_MS);
}

async function releaseWakeLock() { try { if (wakeLock) await wakeLock.release(); } catch (e) {} wakeLock = null; }

async function teardown(callServer, message) {
  stopHeartbeat();
  if (room) { try { room.disconnect(); } catch (e) {} room = null; }
  video.srcObject = null;
  await releaseWakeLock();
  phase = "offline";
  micOn = true; camOn = true;
  if (callServer) { try { const { data } = await api("/api/live/end", { method: "PUT", body: "{}" }); if (data.stream) stream = data.stream; } catch (e) {} }
  if (stream) stream.isLive = false;
  if (message) toast(message);
  render();
}

async function goLive() {
  const LK = window.LivekitClient;
  if (!LK) { toast("Live video couldn't load. Check your connection and refresh.", true); return; }
  if (!$("streamTitle").value.trim()) { toast("Add a stream title first.", true); $("streamTitle").focus(); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("This browser can't access the camera. Try Chrome or Safari over HTTPS.", true); return; }

  busy = true; phase = "connecting"; coinsToday = 0; $("coinsCount").textContent = "0"; render();

  try {
    // 1. publish the stream to the public list
    let { res, data } = await api("/api/live/start", { method: "PUT", body: formBody() });
    if (!res.ok || data.success === false) throw new Error(data.message || "Couldn't start the stream.");
    stream = data.stream;

    // 2. ask the server for permission to broadcast (only the stream owner gets it)
    ({ res, data } = await api("/api/live/token", { method: "POST", body: JSON.stringify({ role: "publish" }) }));
    if (!res.ok || data.success === false) throw new Error(data.message || "Couldn't get broadcast permission.");

    // 3. connect and turn on camera + mic
    const r = new LK.Room({
      adaptiveStream: false,
      dynacast: true,
      videoCaptureDefaults: { facingMode: facing, resolution: LK.VideoPresets.h720.resolution }
    });
    room = r;
    r.on(LK.RoomEvent.Reconnecting, () => { phase = "reconnecting"; render(); });
    r.on(LK.RoomEvent.Reconnected, () => { phase = "live"; render(); });
    r.on(LK.RoomEvent.Disconnected, () => { if (room === r) { room = null; teardown(true, "Disconnected from the live video service."); } });

    await r.connect(data.url, data.token);
    await r.localParticipant.setMicrophoneEnabled(true);
    await r.localParticipant.setCameraEnabled(true);

    const pub = r.localParticipant.getTrackPublication(LK.Track.Source.Camera);
    if (pub && pub.videoTrack) pub.videoTrack.attach(video);

    phase = "live";
    startHeartbeat();
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then((l) => { wakeLock = l; }).catch(() => {});
    if (socket && stream) socket.emit("host_stream", stream._id);
    toast("You're live! 🎉");
  } catch (err) {
    console.error("Go live failed:", err);
    const denied = err && (err.name === "NotAllowedError" || /permission|denied/i.test(String(err.message)));
    toast(denied ? "Allow camera and microphone access to go live." : (err.message || "Couldn't go live."), true);
    if (err.message !== "Session expired") await teardown(true);
  } finally {
    busy = false; render();
  }
}

async function endStream() {
  if (!confirm("End your stream? Viewers will be disconnected.")) return;
  busy = true; render();
  await teardown(true, "Stream ended.");
  busy = false; render();
}

/* ---------------- in-stream controls ---------------- */
async function toggleMic() {
  if (!room) return;
  try { micOn = !micOn; await room.localParticipant.setMicrophoneEnabled(micOn); } catch (e) { micOn = !micOn; toast("Couldn't change the microphone.", true); }
  render();
}

async function toggleCam() {
  if (!room) return;
  try {
    camOn = !camOn;
    await room.localParticipant.setCameraEnabled(camOn);
    if (camOn) {
      const pub = room.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Camera);
      if (pub && pub.videoTrack) pub.videoTrack.attach(video);
    }
  } catch (e) { camOn = !camOn; toast("Couldn't change the camera.", true); }
  render();
}

async function flipCamera() {
  if (!room) return;
  const pub = room.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Camera);
  if (!pub || !pub.videoTrack) { toast("Turn your camera on first.", true); return; }
  const next = facing === "user" ? "environment" : "user";
  try {
    await pub.videoTrack.restartTrack({ facingMode: next });
    facing = next;
    pub.videoTrack.attach(video);
  } catch (e) {
    toast("This device has only one camera.", true);
  }
  render();
}

/* ---------------- load ---------------- */
async function loadStream() {
  try {
    const { res, data } = await api("/api/live/create", { method: "POST" });
    if (!res.ok || !data.success) { toast(data.message || "Couldn't set up your stream.", true); return; }
    stream = data.stream;
    const keep = 100 - (Number(stream.feePercent) || 0);
    $("feeNote").textContent = stream.feePercent ? `You keep ${keep}% of the tips and gifts viewers send. The platform keeps ${stream.feePercent}%.` : "You keep 100% of the tips and gifts viewers send.";
    $("streamTitle").value = stream.title || "";
    $("streamDescription").value = stream.description || "";
    if (stream.category) $("category").value = stream.category;
    connectSocket();
  } catch (err) {
    if (err.message !== "Session expired") { console.error(err); toast("Couldn't reach the server.", true); }
  }
  render();
}

/* ---------------- viewers + supporters (existing socket events) ---------------- */
function connectSocket() {
  if (socket || typeof io !== "function") return;
  socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
  socket.on("connect", () => { if (stream) socket.emit("host_stream", stream._id); });
  socket.on("viewer_count", (d) => { if (stream && d && d.streamId === stream._id) $("viewerCount").textContent = d.count; });
  socket.on("new_monetization_alert", (alert) => {
    if (!stream || alert.streamId !== stream._id) return;
    coinsToday += Number(alert.net != null ? alert.net : alert.amount) || 0;   // what you actually receive
    $("coinsCount").textContent = coinsToday.toLocaleString();
    const feed = $("feed");
    if (!feed.querySelector(".item")) feed.replaceChildren();
    const text = alert.type === "gift" ? `🎁 ${alert.sender} sent a ${alert.giftName} (${alert.amount})`
      : alert.type === "superchat" ? `⭐ ${alert.sender} (${alert.amount}): ${alert.message}` : `💸 ${alert.sender} tipped ${alert.amount} coins`;
    feed.prepend(h("div", { class: "item", text }));
    while (feed.children.length > 50) feed.lastChild.remove();
  });
}

/* ---------------- init ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  $("goLiveBtn").addEventListener("click", goLive);
  $("stopLiveBtn").addEventListener("click", endStream);
  $("micBtn").addEventListener("click", toggleMic);
  $("camBtn").addEventListener("click", toggleCam);
  $("flipBtn").addEventListener("click", flipCamera);
  $("backBtn").addEventListener("click", () => {
    if ((phase === "live" || phase === "connecting") && !confirm("You're live. Leaving this page will end your stream. Leave anyway?")) return;
    if (document.referrer && history.length > 1) history.back(); else window.location.href = "live.html";
  });
  window.addEventListener("beforeunload", (e) => { if (phase === "live") { e.preventDefault(); e.returnValue = ""; } });
  // Re-take the screen lock if the user comes back to the tab while live.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && phase === "live" && navigator.wakeLock && !wakeLock) {
      navigator.wakeLock.request("screen").then((l) => { wakeLock = l; }).catch(() => {});
    }
  });
  render();
  await loadStream();
});
