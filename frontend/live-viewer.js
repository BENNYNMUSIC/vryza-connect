// ======================================================
// VRYZA+ LIVE VIEWER
// ======================================================
const API_URL = "https://vryza-connect-backend-1.onrender.com";
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' fill='%23334155'/><path fill='%2394a3b8' d='M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z'/></svg>";
const TIPS = [10, 50, 100, 500];
const GIFTS = [
  { emoji: "🌹", name: "Rose", cost: 10 },
  { emoji: "❤️", name: "Heart", cost: 50 },
  { emoji: "👑", name: "Crown", cost: 500 },
  { emoji: "🚀", name: "Rocket", cost: 1000 }
];

const params = new URLSearchParams(window.location.search);
const streamId = params.get("id");
const rawToken = localStorage.getItem("token");
const token = rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
let me = {};
try { me = JSON.parse(localStorage.getItem("user") || "{}") || {}; } catch (e) {}
const myId = String(me._id || me.id || "");

const $ = (id) => document.getElementById(id);
const video = $("player");
let stream = null;
let hls = null;
let attachedUrl = "";
let socket = null;
let sending = false;
let giftTimer = null;

if (!streamId) { window.location.replace("live.html"); }

/* ---------------- helpers ---------------- */
function buildImage(src) {
  if (!src || src === "undefined" || src === "null") return DEFAULT_AVATAR;
  if (/^(https?:|data:)/.test(src)) return src;
  return `${API_URL}/uploads/${String(src).replace(/^\/?(uploads\/)?/, "")}`;
}
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  });
  children.flat().forEach((c) => { if (c != null) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}
function toast(message, isError) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = h("div", { class: "toast" + (isError ? " err" : ""), role: "status", text: message });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function setOverlay(text, spinning) {
  $("overlay").classList.toggle("hidden", !text);
  $("overlayText").textContent = text || "";
  $("spin").style.display = spinning ? "block" : "none";
}

/* ---------------- player ---------------- */
function detachPlayer() {
  if (hls) { hls.destroy(); hls = null; }
  video.removeAttribute("src");
  video.load();
  attachedUrl = "";
}

function attachPlayer(url) {
  if (attachedUrl === url) return;
  detachPlayer();
  attachedUrl = url;
  setOverlay("Connecting to the stream…", true);

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;                       // Safari / iPhone play HLS natively
    video.play().catch(() => {});
  } else if (window.Hls && Hls.isSupported()) {
    hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hls.on(Hls.Events.ERROR, (_, d) => {
      if (!d.fatal) return;
      setOverlay("Waiting for the streamer's video…", true);
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR) setTimeout(() => hls && hls.startLoad(), 3000);
      else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
    });
  } else {
    setOverlay("Your browser can't play live video.", false);
  }
}

video.addEventListener("playing", () => setOverlay("", false));
video.addEventListener("waiting", () => { if (attachedUrl) setOverlay("Buffering…", true); });
video.addEventListener("error", () => { if (attachedUrl) setOverlay("Waiting for the streamer's video…", true); });

/* ---------------- stream info ---------------- */
async function loadStream() {
  try {
    const res = await fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      setOverlay(res.status === 404 ? "This stream doesn't exist." : "Couldn't load this stream.", false);
      return;
    }
    stream = data.stream;
    renderInfo();

    if (stream.isLive && stream.streaming) {
      attachPlayer(`${API_URL}${stream.hlsUrl}`);
    } else if (stream.isLive) {
      detachPlayer();
      setOverlay("The streamer is getting ready…", true);
    } else {
      detachPlayer();
      $("liveBadge").hidden = true;
      setOverlay("This stream has ended.", false);
    }
  } catch (err) {
    console.error("Load stream failed:", err);
  }
}

function renderInfo() {
  const user = stream.user || {};
  document.title = `${stream.title} - Vryza+ Live`;
  $("pageTitle").textContent = stream.title || "Live";
  $("streamTitle").textContent = stream.title || "Untitled stream";
  $("streamDesc").textContent = stream.description || "";
  $("category").textContent = stream.category || "";
  $("hostName").textContent = user.username || "Streamer";
  if (user._id) $("hostName").href = `user.html?id=${encodeURIComponent(user._id)}`;
  const pic = $("hostPic");
  pic.src = buildImage(user.profilePic);
  pic.addEventListener("error", () => { pic.src = DEFAULT_AVATAR; }, { once: true });
  $("liveBadge").hidden = !(stream.isLive && stream.streaming);

  const own = String(user._id || "") === myId;
  const canSupport = !own && stream.isLive;
  document.querySelectorAll("#supportCard button, #supportCard input").forEach((el) => { el.disabled = !canSupport; });
  const note = $("supportNote");
  note.hidden = canSupport;
  note.textContent = own ? "This is your own stream." : "Support is available while the stream is live.";
}

/* ---------------- wallet ---------------- */
async function loadBalance() {
  if (!token) { $("balancePill").textContent = "Log in to support"; return; }
  try {
    const res = await fetch(`${API_URL}/api/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) $("balancePill").textContent = `💰 ${Number(data.balance).toLocaleString()} coins`;
  } catch (e) {}
}

/* ---------------- support ---------------- */
async function sendSupport(type, amount, giftName, message) {
  if (!token) { window.location.href = "auth.html"; return; }
  if (sending) return;
  sending = true;
  document.querySelectorAll("#supportCard button").forEach((b) => (b.disabled = true));

  try {
    const res = await fetch(`${API_URL}/api/monetization/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ streamId, type, amount, giftName, message })
    });
    const data = await res.json();
    if (data.success) {
      $("balancePill").textContent = `💰 ${Number(data.balance).toLocaleString()} coins`;
      toast(type === "gift" ? `${giftName} sent! 🎉` : type === "superchat" ? "Super Chat sent!" : `Tip of ${amount} coins sent!`);
      if (type === "superchat") { $("scMsg").value = ""; $("scAmt").value = ""; }
    } else {
      toast(data.message || "Could not send support.", true);
    }
  } catch (err) {
    console.error("Support failed:", err);
    toast("Network problem. You were not charged.", true);
  } finally {
    sending = false;
    if (stream) renderInfo();
  }
}

function buildSupportButtons() {
  $("tips").replaceChildren(...TIPS.map((n) =>
    h("button", { type: "button", text: `${n}`, "aria-label": `Tip ${n} coins`, onclick: () => sendSupport("tip", n) })));
  $("gifts").replaceChildren(...GIFTS.map((g) =>
    h("button", { type: "button", "aria-label": `Send ${g.name} for ${g.cost} coins`, onclick: () => sendSupport("gift", g.cost, g.name) },
      h("span", { text: g.emoji }), h("span", { text: g.name }), h("span", { class: "muted", text: `${g.cost}` }))));
  $("scBtn").addEventListener("click", () => {
    const message = $("scMsg").value.trim();
    const amount = Number($("scAmt").value);
    if (!message || !Number.isInteger(amount) || amount < 100) { toast("Write a message and enter at least 100 coins.", true); return; }
    sendSupport("superchat", amount, null, message);
  });
}

/* ---------------- live alerts ---------------- */
function addFeedItem(alert) {
  const feed = $("feed");
  if (!feed.querySelector(".item")) feed.replaceChildren();
  let text;
  if (alert.type === "gift") text = `🎁 ${alert.sender} sent a ${alert.giftName} (${alert.amount})`;
  else if (alert.type === "superchat") text = `⭐ ${alert.sender} (${alert.amount}): ${alert.message}`;
  else text = `💸 ${alert.sender} tipped ${alert.amount} coins`;
  feed.prepend(h("div", { class: "item" + (alert.type === "superchat" ? " super" : ""), text }));
  while (feed.children.length > 50) feed.lastChild.remove();
}

function showGiftBanner(alert) {
  const label = alert.type === "gift" ? `🎉 ${alert.sender} sent a ${alert.giftName}!`
    : alert.type === "superchat" ? `⭐ ${alert.sender}: ${alert.message}` : `💸 ${alert.sender} tipped ${alert.amount} coins`;
  $("giftBanner").replaceChildren(h("div", { class: "gift", text: label }));
  clearTimeout(giftTimer);
  giftTimer = setTimeout(() => $("giftBanner").replaceChildren(), 5000);
}

function connectSocket() {
  if (typeof io !== "function") return;
  socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
  socket.on("connect", () => socket.emit("join_stream", streamId));
  socket.on("viewer_count", (d) => { if (d && d.streamId === streamId) $("viewerPill").textContent = `👁 ${d.count}`; });
  socket.on("new_monetization_alert", (alert) => {
    if (!alert || alert.streamId !== streamId) return;
    addFeedItem(alert);
    showGiftBanner(alert);
  });
}

/* ---------------- init ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  $("backBtn").addEventListener("click", () => {
    if (document.referrer && history.length > 1) history.back(); else window.location.href = "live.html";
  });
  buildSupportButtons();
  loadStream();
  loadBalance();
  if (token) connectSocket();

  setInterval(loadStream, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { loadStream(); loadBalance(); } });
  window.addEventListener("beforeunload", () => { if (socket) socket.emit("leave_stream", streamId); });
});
