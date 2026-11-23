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

/* ---------------- player (LiveKit) ---------------- */
let room = null;
let connecting = false;
let watchingId = "";

function detachPlayer() {
  if (room) { try { room.disconnect(); } catch (e) {} room = null; }
  video.srcObject = null;
  watchingId = "";
}

async function attachPlayer() {
  if (room || connecting) return;
  const LK = window.LivekitClient;
  if (!LK) { setOverlay("Live video couldn't load. Refresh the page.", false); return; }
  if (!token) { setOverlay("Log in to watch this stream.", false); return; }
  connecting = true;
  setOverlay("Connecting to the stream…", true);
  try {
    const res = await fetch(`${API_URL}/api/live/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: "watch", streamId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) { setOverlay(data.message || "Couldn't join the stream.", false); return; }

    const r = new LK.Room({ adaptiveStream: true });
    r.on(LK.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video" || track.kind === "audio") {
        track.attach(video);
        video.play().catch(() => {});
        setOverlay("", false);
      }
    });
    r.on(LK.RoomEvent.TrackUnsubscribed, (track) => track.detach());
    r.on(LK.RoomEvent.Reconnecting, () => setOverlay("Reconnecting…", true));
    r.on(LK.RoomEvent.Reconnected, () => setOverlay("", false));
    r.on(LK.RoomEvent.Disconnected, () => {
      if (room === r) { room = null; setOverlay("Waiting for the streamer's video…", true); }
    });
    await r.connect(data.url, data.token);
    room = r;
    // pick up tracks that were already published before we joined
    r.remoteParticipants.forEach((p) => p.trackPublications.forEach((pub) => {
      if (pub.track) { pub.track.attach(video); video.play().catch(() => {}); setOverlay("", false); }
    }));
    if (!video.srcObject) setOverlay("Waiting for the streamer's video…", true);
  } catch (err) {
    console.error("Watch failed:", err);
    setOverlay("Couldn't connect. Retrying…", true);
  } finally {
    connecting = false;
  }
}

video.setAttribute("playsinline", "");
video.addEventListener("playing", () => setOverlay("", false));

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
    updateInteractionState();

    if (stream.isLive && stream.streaming) {
      attachPlayer();
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


/* ---------------- comments ---------------- */
const seenComments = new Set();
let commentSending = false;

function isHost() { return !!(stream && stream.user && String(stream.user._id || "") === myId); }

function addComment(c) {
  if (!c || !c._id || seenComments.has(c._id)) return;
  seenComments.add(c._id);
  const list = $("commentList");
  if (!list.querySelector(".comment")) list.replaceChildren();
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  const author = c.user || {};
  const canDelete = !!token && (String(author._id || "") === myId || isHost());
  const avatar = h("img", { class: "c-avatar", src: buildImage(author.profilePic), alt: "", loading: "lazy" });
  avatar.addEventListener("error", () => { avatar.src = DEFAULT_AVATAR; }, { once: true });
  list.append(h("div", { class: "comment", "data-id": c._id },
    avatar,
    h("div", { class: "c-body" }, h("b", { text: author.username || "User" }), h("span", { text: c.text })),
    canDelete ? h("button", { class: "c-del", type: "button", "aria-label": "Delete comment", text: "✕", onclick: () => deleteComment(c._id) }) : null));
  while (list.children.length > 200) { seenComments.delete(list.firstChild.dataset.id); list.firstChild.remove(); }
  if (nearBottom) list.scrollTop = list.scrollHeight;
}

function removeComment(id) {
  const el = $("commentList").querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if (el) el.remove();
  seenComments.delete(String(id));
  const list = $("commentList");
  if (!list.querySelector(".comment")) list.replaceChildren(h("span", { class: "muted", text: "No comments yet. Say something!" }));
}

async function loadComments() {
  try {
    const res = await fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}/comments`);
    const data = await res.json();
    if (!res.ok || !data.success) return;
    data.comments.forEach(addComment);
    const list = $("commentList");
    list.scrollTop = list.scrollHeight;
  } catch (err) { console.warn("Load comments failed:", err); }
}

async function sendComment() {
  if (!token) { toast("Log in to comment.", true); return; }
  const input = $("commentInput");
  const text = input.value.trim();
  if (!text || commentSending) return;
  commentSending = true;
  $("commentBtn").disabled = true;
  try {
    const res = await fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok || !data.success) { toast(data.message || "Couldn't send your comment.", true); return; }
    input.value = "";
    addComment(data.comment);
    const list = $("commentList");
    list.scrollTop = list.scrollHeight;
  } catch (err) {
    toast("Couldn't send your comment.", true);
  } finally {
    commentSending = false;
    $("commentBtn").disabled = !!(stream && !stream.isLive);
  }
}

async function deleteComment(id) {
  try {
    const res = await fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}/comments/${encodeURIComponent(id)}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) { toast(data.message || "Couldn't delete that.", true); return; }
    removeComment(id);
  } catch (err) { toast("Couldn't delete that.", true); }
}

function updateInteractionState() {
  const ended = !!(stream && !stream.isLive);
  $("commentInput").disabled = ended;
  $("commentBtn").disabled = ended || commentSending;
  $("commentInput").placeholder = ended ? "This stream has ended" : "Add a comment…";
}

/* ---------------- like / dislike / share ---------------- */
let myReaction = null;
let reacting = false;

function fmt(n) {
  n = Number(n) || 0;
  return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
}

function renderReactions(r) {
  if (!r) return;
  if (r.likes != null) $("likeCount").textContent = fmt(r.likes);
  if (r.dislikes != null) $("dislikeCount").textContent = fmt(r.dislikes);
  if (r.shares != null) $("shareCount").textContent = r.shares > 0 ? fmt(r.shares) : "";
  if ("mine" in r) myReaction = r.mine;
  $("likeBtn").classList.toggle("active", myReaction === "like");
  $("likeBtn").setAttribute("aria-pressed", String(myReaction === "like"));
  $("dislikeBtn").classList.toggle("active", myReaction === "dislike");
  $("dislikeBtn").setAttribute("aria-pressed", String(myReaction === "dislike"));
}

async function loadReactions() {
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}/reactions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok && data.success) renderReactions(data);
  } catch (err) { console.warn("Load reactions failed:", err); }
}

async function react(kind) {
  if (!token) { toast("Log in to react.", true); return; }
  if (reacting) return;
  reacting = true;
  const value = myReaction === kind ? "none" : kind;
  try {
    const res = await fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ value })
    });
    const data = await res.json();
    if (!res.ok || !data.success) { toast(data.message || "Couldn't save that.", true); return; }
    renderReactions(data);
  } catch (err) { toast("Couldn't save that.", true); }
  finally { reacting = false; }
}

async function shareStream() {
  const url = new URL(`live-viewer.html?id=${encodeURIComponent(streamId)}`, window.location.href).href;
  const host = (stream && stream.user && stream.user.username) || "someone";
  const title = (stream && stream.title) || "Live on Vryza+";
  let done = false;

  if (navigator.share) {
    try { await navigator.share({ title, text: `Watch ${host} live on Vryza+: ${title}`, url }); done = true; }
    catch (err) { if (err && err.name === "AbortError") return; }
  }
  if (!done) {
    try { await navigator.clipboard.writeText(url); toast("Live link copied!"); done = true; }
    catch (err) { window.prompt("Copy this link to share:", url); done = true; }
  }
  if (done && token) {
    fetch(`${API_URL}/api/live/${encodeURIComponent(streamId)}/share`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { if (d && d.success) renderReactions({ shares: d.shares }); }).catch(() => {});
  }
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
  socket.on("live_comment", (d) => { if (d && d.streamId === streamId) addComment(d.comment); });
  socket.on("live_comment_deleted", (d) => { if (d && d.streamId === streamId) removeComment(d.commentId); });
  socket.on("live_reactions", (d) => { if (d && d.streamId === streamId) renderReactions({ likes: d.likes, dislikes: d.dislikes, shares: d.shares }); });
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
  $("likeBtn").addEventListener("click", () => react("like"));
  $("dislikeBtn").addEventListener("click", () => react("dislike"));
  $("shareBtn").addEventListener("click", shareStream);
  $("commentBtn").addEventListener("click", sendComment);
  $("commentInput").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendComment(); } });
  loadComments();
  loadReactions();
  buildSupportButtons();
  loadStream();
  loadBalance();
  if (token) connectSocket();

  setInterval(loadStream, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { loadStream(); loadBalance(); } });
  window.addEventListener("beforeunload", () => { if (socket) socket.emit("leave_stream", streamId); detachPlayer(); });
});
