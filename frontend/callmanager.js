/*!
 * callmanager.js - Vryza+ calls that work on EVERY page
 *
 * Add to every page (before </body>):   <script src="callmanager.js"></script>
 *
 *  - Incoming calls ring on any page (home, profile, friends, settings...) with Accept / Decline.
 *  - Full-screen call view: the person you're talking to fills the screen,
 *    your own camera is a small draggable picture-in-picture.
 *  - Mute, camera on/off, flip camera, call timer, screen stays awake.
 *
 *  API:  VryzaCall.start(userId, { name, pic, type: "video" | "audio" })
 *        VryzaCall.end()      VryzaCall.state()
 *
 *  Optional (recommended for mobile data): define your own TURN servers BEFORE this script:
 *    window.VRYZA_ICE_SERVERS = [{ urls: "stun:..." }, { urls: "turn:...", username: "...", credential: "..." }];
 */
(function () {
  "use strict";
  if (window.VryzaCall) return;

  var API = window.VRYZA_API || "https://vryza-connect-backend-1.onrender.com";
  var RING_TIMEOUT_MS = 45000;

  var rawToken = "";
  var me = "";
  try {
    rawToken = (localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "").trim();
    var u = JSON.parse(localStorage.getItem("user") || "null");
    me = u ? String(u._id || u.id || "") : "";
  } catch (e) {}
  if (!rawToken) return; // logged out: nothing to do

  var ICE = {
    iceServers: window.VRYZA_ICE_SERVERS || [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  var DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><rect width='24' height='24' fill='%231e293b'/><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.33-2.55 5.05-2.55 1.71 0 5.02.89 5.05 2.55C15.8 19.15 14.03 20 12 20z'/></svg>";

  /* ---------------- state ---------------- */
  var st = fresh();
  var socket = null;
  var els = {};
  var ringTimer = null, ringCtx = null, ringInterval = null, vibInterval = null;
  var clockTimer = null, idleTimer = null, wakeLock = null, toastTimer = null;
  var baseTitle = document.title;

  function fresh() {
    return {
      phase: "idle",        // idle | outgoing | incoming | connecting | connected
      peerId: "", peerName: "", peerPic: "",
      type: "video",        // video | audio
      pc: null, local: null, remote: null,
      offer: null, pending: [],
      startedAt: 0, facing: "user",
      micOn: true, camOn: true
    };
  }

  /* ---------------- helpers ---------------- */
  function buildImage(src) {
    if (!src || src === "undefined" || src === "null") return DEFAULT_AVATAR;
    if (/^(https?:|data:)/.test(src)) return src;
    return API + "/uploads/" + String(src).replace(/^\/?(uploads\/)?/, "");
  }
  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------------- UI ---------------- */
  var CSS =
    ".vzc{position:fixed;inset:0;z-index:2147483000;display:none;background:#05080f;color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent;user-select:none}" +
    ".vzc.show{display:block;animation:vzc-in .22s ease-out}" +
    "@keyframes vzc-in{from{opacity:0;transform:scale(1.02)}to{opacity:1;transform:none}}" +
    ".vzc-bg{position:absolute;inset:-30px;background-size:cover;background-position:center;filter:blur(40px) brightness(.45);transform:scale(1.1)}" +
    ".vzc-remote{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;opacity:0;transition:opacity .3s}" +
    ".vzc.hasvideo .vzc-remote{opacity:1}" +
    ".vzc-top{position:absolute;left:0;right:0;top:0;padding:calc(16px + env(safe-area-inset-top,0px)) 20px 40px;background:linear-gradient(rgba(0,0,0,.6),transparent);display:flex;flex-direction:column;align-items:center;gap:2px;transition:opacity .3s;z-index:3;pointer-events:none}" +
    ".vzc-name{font-size:18px;font-weight:800;max-width:80vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".vzc-status{font-size:13px;font-weight:600;opacity:.85;font-variant-numeric:tabular-nums}" +
    ".vzc-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:0 24px;z-index:2;transition:opacity .3s}" +
    ".vzc.hasvideo .vzc-center{opacity:0;pointer-events:none}" +
    ".vzc-avatar{position:relative;width:132px;height:132px;border-radius:50%;object-fit:cover;background:#1e293b;border:3px solid rgba(255,255,255,.25);box-shadow:0 14px 40px rgba(0,0,0,.5)}" +
    ".vzc-ring{position:absolute;width:132px;height:132px;border-radius:50%;border:2px solid rgba(255,255,255,.35);animation:vzc-pulse 2s ease-out infinite;opacity:0}" +
    ".vzc-ring.r2{animation-delay:1s}" +
    ".vzc.connected .vzc-ring{display:none}" +
    "@keyframes vzc-pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.9);opacity:0}}" +
    ".vzc-avatar-wrap{position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center}" +
    ".vzc-pip{position:absolute;z-index:4;width:clamp(86px,24vw,140px);aspect-ratio:3/4;right:14px;top:calc(76px + env(safe-area-inset-top,0px));border-radius:16px;overflow:hidden;background:#111827;border:2px solid rgba(255,255,255,.35);box-shadow:0 10px 30px rgba(0,0,0,.55);touch-action:none;cursor:grab;display:none;transition:left .2s ease,top .2s ease,right .2s ease,bottom .2s ease}" +
    ".vzc-pip.dragging{transition:none;cursor:grabbing}" +
    ".vzc.video.outgoing .vzc-pip,.vzc.video.connecting .vzc-pip,.vzc.video.connected .vzc-pip{display:block}" +
    ".vzc-pip video{width:100%;height:100%;object-fit:cover;display:block}" +
    ".vzc-pip.mirror video{transform:scaleX(-1)}" +
    ".vzc-pip .off{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#111827;font-size:22px}" +
    ".vzc-pip.camoff .off{display:flex}" +
    ".vzc-controls{position:absolute;left:0;right:0;bottom:0;padding:40px 16px calc(22px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,rgba(0,0,0,.65));display:flex;justify-content:center;align-items:center;gap:16px;z-index:5;transition:opacity .3s,transform .3s}" +
    ".vzc.idle .vzc-controls,.vzc.idle .vzc-top{opacity:0;pointer-events:none}" +
    ".vzc.idle .vzc-controls{transform:translateY(12px)}" +
    ".vzc-btn{width:60px;height:60px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(10px);transition:transform .15s,background .15s}" +
    ".vzc-btn:active{transform:scale(.92)}" +
    ".vzc-btn.off{background:#fff;color:#111827}" +
    ".vzc-btn.end,.vzc-btn.decline{background:#ef4444}" +
    ".vzc-btn.accept{background:#22c55e;animation:vzc-glow 1.4s ease-out infinite}" +
    "@keyframes vzc-glow{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}100%{box-shadow:0 0 0 18px rgba(34,197,94,0)}}" +
    ".vzc-lbl{font-size:12px;font-weight:700;opacity:.85;margin-top:6px;text-align:center}" +
    ".vzc-col{display:flex;flex-direction:column;align-items:center}" +
    ".vzc .only-incoming,.vzc .only-active{display:none}" +
    ".vzc.incoming .only-incoming{display:flex}" +
    ".vzc.outgoing .only-active,.vzc.connecting .only-active,.vzc.connected .only-active{display:flex}" +
    ".vzc.audio .video-only{display:none !important}" +
    ".vzc-toast{position:fixed;left:50%;top:calc(18px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483100;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.15);padding:11px 18px;border-radius:999px;font:600 13px Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);max-width:90vw;text-align:center}" +
    "@media (min-width:768px){.vzc-pip{right:24px;top:90px}.vzc-avatar,.vzc-avatar-wrap,.vzc-ring{width:160px;height:160px}.vzc-btn{width:64px;height:64px}}" +
    "@media (prefers-reduced-motion:reduce){.vzc,.vzc-ring,.vzc-btn.accept{animation:none!important}}";

  var HTML =
    '<div class="vzc-bg" id="vzcBg"></div>' +
    '<video class="vzc-remote" id="vzcRemote" autoplay playsinline></video>' +
    '<div class="vzc-top"><div class="vzc-name" id="vzcName"></div><div class="vzc-status" id="vzcStatus"></div></div>' +
    '<div class="vzc-center"><div class="vzc-avatar-wrap"><span class="vzc-ring"></span><span class="vzc-ring r2"></span><img class="vzc-avatar" id="vzcAvatar" alt="" /></div></div>' +
    '<div class="vzc-pip mirror" id="vzcPip"><video id="vzcLocal" autoplay playsinline muted></video><div class="off">📷</div></div>' +
    '<div class="vzc-controls">' +
      '<div class="only-incoming" style="gap:56px;align-items:flex-start">' +
        '<div class="vzc-col"><button class="vzc-btn decline" id="vzcDecline" aria-label="Decline">✕</button><span class="vzc-lbl">Decline</span></div>' +
        '<div class="vzc-col"><button class="vzc-btn accept" id="vzcAccept" aria-label="Accept">📞</button><span class="vzc-lbl">Accept</span></div>' +
      '</div>' +
      '<div class="only-active" style="gap:16px;align-items:center">' +
        '<button class="vzc-btn" id="vzcMic" aria-label="Mute microphone">🎤</button>' +
        '<button class="vzc-btn video-only" id="vzcCam" aria-label="Turn camera off">📷</button>' +
        '<button class="vzc-btn video-only" id="vzcFlip" aria-label="Flip camera">🔄</button>' +
        '<button class="vzc-btn end" id="vzcEnd" aria-label="End call">📞</button>' +
      '</div>' +
    '</div>';

  function buildUI() {
    if (els.root) return;
    var style = document.createElement("style");
    style.id = "vryza-call-css";
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.className = "vzc";
    root.id = "vzCall";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Call");
    root.innerHTML = HTML;
    document.body.appendChild(root);

    els = {
      root: root, bg: $("vzcBg"), remote: $("vzcRemote"), local: $("vzcLocal"), pip: $("vzcPip"),
      name: $("vzcName"), status: $("vzcStatus"), avatar: $("vzcAvatar"),
      mic: $("vzcMic"), cam: $("vzcCam"), flip: $("vzcFlip")
    };

    $("vzcEnd").onclick = function () { endCall(true); };
    $("vzcDecline").onclick = decline;
    $("vzcAccept").onclick = accept;
    els.mic.onclick = toggleMic;
    els.cam.onclick = toggleCam;
    els.flip.onclick = flipCamera;
    els.avatar.addEventListener("error", function () { els.avatar.onerror = null; els.avatar.src = DEFAULT_AVATAR; });

    // show video when the first frame arrives
    els.remote.addEventListener("loadedmetadata", syncRemoteVideo);
    els.remote.addEventListener("resize", syncRemoteVideo);

    // tap to show/hide controls while connected
    root.addEventListener("click", function (e) {
      if (st.phase === "connected" && !e.target.closest("button") && !e.target.closest(".vzc-pip")) {
        root.classList.toggle("idle");
        armIdle();
      } else if (st.phase === "connected") {
        root.classList.remove("idle"); armIdle();
      }
    });

    setupPipDrag();
  }

  function render() {
    if (!els.root) return;
    var r = els.root;
    r.classList.remove("incoming", "outgoing", "connecting", "connected", "video", "audio");
    if (st.phase === "idle") { r.classList.remove("show", "hasvideo", "idle"); return; }
    r.classList.add("show", st.phase, st.type);
    els.name.textContent = st.peerName || "Vryza+ user";
    els.avatar.src = buildImage(st.peerPic);
    els.bg.style.backgroundImage = "url('" + buildImage(st.peerPic).replace(/'/g, "%27") + "')";

    var t = st.type === "video" ? "video" : "voice";
    if (st.phase === "incoming") els.status.textContent = "Incoming " + t + " call…";
    else if (st.phase === "outgoing") els.status.textContent = "Calling…";
    else if (st.phase === "connecting") els.status.textContent = "Connecting…";

    els.mic.textContent = st.micOn ? "🎤" : "🔇";
    els.mic.classList.toggle("off", !st.micOn);
    els.cam.classList.toggle("off", !st.camOn);
    els.pip.classList.toggle("camoff", !st.camOn);
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "vzc-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 3200);
    setTimeout(function () { t.remove(); }, 3300);
  }

  function armIdle() {
    clearTimeout(idleTimer);
    if (st.phase !== "connected" || st.type !== "video") return;
    idleTimer = setTimeout(function () { if (els.root) els.root.classList.add("idle"); }, 4500);
  }

  function syncRemoteVideo() {
    if (!els.root) return;
    var has = st.type === "video" && els.remote.videoWidth > 0 && !!(st.remote && st.remote.getVideoTracks().some(function (t) { return t.readyState === "live" && !t.muted; }));
    els.root.classList.toggle("hasvideo", has);
  }

  /* ---------------- picture-in-picture drag + snap ---------------- */
  function setupPipDrag() {
    var pip = els.pip, drag = null;
    pip.addEventListener("pointerdown", function (e) {
      var rect = pip.getBoundingClientRect();
      drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
      pip.setPointerCapture(e.pointerId);
      pip.classList.add("dragging");
      pip.style.right = "auto"; pip.style.bottom = "auto";
      pip.style.left = rect.left + "px"; pip.style.top = rect.top + "px";
    });
    pip.addEventListener("pointermove", function (e) {
      if (!drag) return;
      drag.moved = true;
      pip.style.left = (e.clientX - drag.dx) + "px";
      pip.style.top = (e.clientY - drag.dy) + "px";
    });
    function release() {
      if (!drag) return;
      pip.classList.remove("dragging");
      var rect = pip.getBoundingClientRect();
      var W = window.innerWidth, H = window.innerHeight, m = 14;
      var left = (rect.left + rect.width / 2) < W / 2;
      var top = (rect.top + rect.height / 2) < H / 2;
      var safeTop = 76, safeBottom = 120;
      pip.style.left = left ? m + "px" : (W - rect.width - m) + "px";
      pip.style.top = top ? safeTop + "px" : (H - rect.height - safeBottom) + "px";
      drag = null;
    }
    pip.addEventListener("pointerup", release);
    pip.addEventListener("pointercancel", release);
  }

  /* ---------------- ringing (generated, no audio files) ---------------- */
  function beep(freq, ms, vol) {
    try {
      if (!ringCtx) ringCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (ringCtx.state === "suspended") ringCtx.resume();
      var o = ringCtx.createOscillator(), g = ringCtx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ringCtx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ringCtx.currentTime + 0.03);
      g.gain.linearRampToValueAtTime(0, ringCtx.currentTime + ms / 1000);
      o.connect(g); g.connect(ringCtx.destination);
      o.start(); o.stop(ringCtx.currentTime + ms / 1000 + 0.05);
    } catch (e) {}
  }
  function startRing(incoming) {
    stopRing();
    var tick = function () {
      if (incoming) { beep(880, 350, 0.18); setTimeout(function () { beep(660, 350, 0.18); }, 420); }
      else { beep(440, 900, 0.07); }
    };
    tick();
    ringInterval = setInterval(tick, incoming ? 2200 : 3000);
    if (incoming && navigator.vibrate) {
      navigator.vibrate([500, 250, 500]);
      vibInterval = setInterval(function () { navigator.vibrate([500, 250, 500]); }, 2200);
    }
    if (incoming) {
      var on = false;
      st._titleTimer = setInterval(function () { document.title = (on = !on) ? "📞 Incoming call" : baseTitle; }, 900);
    }
  }
  function stopRing() {
    clearInterval(ringInterval); ringInterval = null;
    clearInterval(vibInterval); vibInterval = null;
    if (navigator.vibrate) navigator.vibrate(0);
    clearInterval(st._titleTimer);
    document.title = baseTitle;
  }

  /* ---------------- media + peer connection ---------------- */
  function getMedia(type) {
    var audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    var video = type === "video" ? { facingMode: st.facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false;
    return navigator.mediaDevices.getUserMedia({ audio: audio, video: video }).catch(function (err) {
      if (type === "video") {
        // camera missing/blocked: continue as a voice call
        return navigator.mediaDevices.getUserMedia({ audio: audio, video: false }).then(function (s) {
          toast("Camera unavailable - continuing with audio only");
          st.camOn = false;
          return s;
        });
      }
      throw err;
    });
  }

  function attachLocal(stream) {
    st.local = stream;
    els.local.srcObject = stream;
    els.local.play && els.local.play().catch(function () {});
    var hasCam = stream.getVideoTracks().length > 0;
    st.camOn = hasCam;
    els.pip.classList.toggle("camoff", !hasCam);
    els.pip.classList.toggle("mirror", st.facing === "user");
  }

  function makePC() {
    var pc = new RTCPeerConnection(ICE);
    st.pc = pc;
    st.local.getTracks().forEach(function (t) { pc.addTrack(t, st.local); });

    pc.ontrack = function (e) {
      if (!st.remote) st.remote = new MediaStream();
      st.remote.addTrack(e.track);
      els.remote.srcObject = st.remote;
      els.remote.play && els.remote.play().catch(function () {});
      e.track.onmute = syncRemoteVideo;
      e.track.onunmute = syncRemoteVideo;
      e.track.onended = syncRemoteVideo;
      setTimeout(syncRemoteVideo, 300);
    };
    pc.onicecandidate = function (e) {
      if (e.candidate && socket) socket.emit("iceCandidate", { to: st.peerId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = function () {
      var s = pc.connectionState;
      if (s === "connected") onConnected();
      else if (s === "disconnected") { if (els.status) els.status.textContent = "Reconnecting…"; }
      else if (s === "failed") { toast("Connection lost"); endCall(true); }
    };
    return pc;
  }

  function flushPending() {
    var list = st.pending; st.pending = [];
    list.forEach(function (c) { st.pc && st.pc.addIceCandidate(new RTCIceCandidate(c)).catch(function () {}); });
  }

  function onConnected() {
    if (st.phase === "connected") return;
    st.phase = "connected";
    stopRing();
    clearTimeout(ringTimer);
    st.startedAt = Date.now();
    render();
    clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      if (els.status) els.status.textContent = fmt(Math.floor((Date.now() - st.startedAt) / 1000));
    }, 1000);
    els.status.textContent = "00:00";
    armIdle();
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; }).catch(function () {});
  }

  /* ---------------- starting / answering / ending ---------------- */
  function start(userId, opts) {
    opts = opts || {};
    userId = String(userId || "");
    if (!userId || userId === me) return;
    if (st.phase !== "idle") { toast("You're already in a call"); return; }
    if (!socket || !socket.connected) { toast("Connecting… try again in a moment"); return; }
    if (!window.RTCPeerConnection || !navigator.mediaDevices) { toast("Calls aren't supported in this browser"); return; }

    buildUI();
    st = fresh();
    st.phase = "outgoing";
    st.peerId = userId;
    st.peerName = opts.name || "";
    st.peerPic = opts.pic || "";
    st.type = opts.type === "audio" ? "audio" : "video";
    render();
    if (!st.peerName || !st.peerPic) lookupPeer(userId);

    getMedia(st.type).then(function (stream) {
      if (st.phase !== "outgoing") { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      attachLocal(stream);
      var pc = makePC();
      return pc.createOffer().then(function (offer) {
        return pc.setLocalDescription(offer).then(function () {
          socket.emit("callUser", { userToCall: userId, signalData: offer, callType: st.type });
          startRing(false);
          ringTimer = setTimeout(function () {
            if (st.phase === "outgoing") { toast("No answer"); endCall(true); }
          }, RING_TIMEOUT_MS);
        });
      });
    }).catch(function (err) {
      console.error("Call start failed:", err);
      toast(err && err.name === "NotAllowedError" ? "Allow microphone/camera access to call" : "Couldn't start the call");
      cleanup();
    });
  }

  function onIncoming(data) {
    var from = String(data.from || "");
    if (!from) return;
    if (st.phase !== "idle") { socket.emit("rejectCall", { to: from, reason: "busy" }); return; }

    buildUI();
    st = fresh();
    st.phase = "incoming";
    st.peerId = from;
    st.type = data.callType === "audio" ? "audio" : "video";
    st.offer = data.signal;
    var fu = data.fromUser || {};
    st.peerName = fu.username || "";
    st.peerPic = fu.profilePic || "";
    render();
    if (!st.peerName || !st.peerPic) lookupPeer(from);
    startRing(true);
    ringTimer = setTimeout(function () { if (st.phase === "incoming") cleanup(); }, RING_TIMEOUT_MS);
  }

  function accept() {
    if (st.phase !== "incoming") return;
    stopRing();
    clearTimeout(ringTimer);
    st.phase = "connecting";
    render();

    getMedia(st.type).then(function (stream) {
      attachLocal(stream);
      var pc = makePC();
      return pc.setRemoteDescription(new RTCSessionDescription(st.offer))
        .then(function () { flushPending(); return pc.createAnswer(); })
        .then(function (answer) {
          return pc.setLocalDescription(answer).then(function () {
            socket.emit("answerCall", { to: st.peerId, signal: answer });
          });
        });
    }).catch(function (err) {
      console.error("Answer failed:", err);
      toast(err && err.name === "NotAllowedError" ? "Allow microphone/camera access to answer" : "Couldn't join the call");
      if (socket && st.peerId) socket.emit("rejectCall", { to: st.peerId, reason: "error" });
      cleanup();
    });
  }

  function decline() {
    if (socket && st.peerId) socket.emit("rejectCall", { to: st.peerId, reason: "declined" });
    cleanup();
  }

  function endCall(notifyPeer) {
    if (notifyPeer && socket && st.peerId && st.phase !== "idle") socket.emit("endCall", { to: st.peerId });
    var dur = st.phase === "connected" ? Math.floor((Date.now() - st.startedAt) / 1000) : 0;
    cleanup();
    if (dur > 0) toast("Call ended · " + fmt(dur));
  }

  function cleanup() {
    stopRing();
    clearTimeout(ringTimer); clearTimeout(idleTimer); clearInterval(clockTimer);
    if (st.local) st.local.getTracks().forEach(function (t) { t.stop(); });
    if (st.remote) st.remote.getTracks().forEach(function (t) { t.stop(); });
    if (st.pc) { try { st.pc.close(); } catch (e) {} }
    if (els.local) els.local.srcObject = null;
    if (els.remote) els.remote.srcObject = null;
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    st = fresh();
    if (els.pip) { els.pip.style.left = els.pip.style.top = els.pip.style.right = els.pip.style.bottom = ""; }
    render();
  }

  /* ---------------- in-call controls ---------------- */
  function toggleMic() {
    if (!st.local) return;
    st.micOn = !st.micOn;
    st.local.getAudioTracks().forEach(function (t) { t.enabled = st.micOn; });
    render();
  }
  function toggleCam() {
    if (!st.local) return;
    var tracks = st.local.getVideoTracks();
    if (!tracks.length) { toast("No camera available"); return; }
    st.camOn = !st.camOn;
    tracks.forEach(function (t) { t.enabled = st.camOn; });
    render();
  }
  function flipCamera() {
    if (!st.local || !st.pc) return;
    var old = st.local.getVideoTracks()[0];
    if (!old) return;
    var next = st.facing === "user" ? "environment" : "user";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: next } }, audio: false }).then(function (s) {
      var track = s.getVideoTracks()[0];
      var sender = st.pc.getSenders().find(function (x) { return x.track && x.track.kind === "video"; });
      if (sender) sender.replaceTrack(track);
      st.local.removeTrack(old); old.stop();
      st.local.addTrack(track);
      st.facing = next;
      els.pip.classList.toggle("mirror", next === "user");
      els.local.srcObject = st.local;
    }).catch(function () { toast("Couldn't switch camera"); });
  }

  /* ---------------- peer details fallback ---------------- */
  function lookupPeer(id) {
    fetch(API + "/api/user/" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + rawToken } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var u = d.user || d.profile || d;
        if (!u || st.peerId !== id) return;
        if (!st.peerName) st.peerName = u.username || "";
        if (!st.peerPic) st.peerPic = u.profilePic || "";
        render();
      }).catch(function () {});
  }

  /* ---------------- socket ---------------- */
  function bindSocket() {
    socket.on("connect", function () { socket.emit("join", me); });

    socket.on("incomingCall", onIncoming);

    socket.on("callAccepted", function (d) {
      if (st.phase !== "outgoing" || !st.pc || !d || !d.signal) return;
      stopRing();
      clearTimeout(ringTimer);
      st.phase = "connecting";
      render();
      st.pc.setRemoteDescription(new RTCSessionDescription(d.signal)).then(flushPending).catch(function (e) {
        console.error("setRemoteDescription failed:", e);
      });
    });

    socket.on("iceCandidate", function (d) {
      if (!d || !d.candidate) return;
      if (st.pc && st.pc.remoteDescription) st.pc.addIceCandidate(new RTCIceCandidate(d.candidate)).catch(function () {});
      else if (st.phase !== "idle") st.pending.push(d.candidate);
    });

    socket.on("callRejected", function (d) {
      if (st.phase === "idle") return;
      var why = d && d.reason;
      toast(why === "busy" ? "User is busy on another call" : "Call declined");
      cleanup();
    });
    socket.on("callUnavailable", function (d) {
      if (st.phase === "idle") return;
      toast(d && d.reason === "offline" ? "User is offline right now" : ((d && d.reason) || "User unavailable"));
      cleanup();
    });
    socket.on("callMissed", function () { if (st.phase !== "idle") { toast("No answer"); cleanup(); } });
    socket.on("callEnded", function () {
      if (st.phase === "idle") return;
      var dur = st.phase === "connected" ? Math.floor((Date.now() - st.startedAt) / 1000) : 0;
      cleanup();
      toast(dur > 0 ? "Call ended · " + fmt(dur) : "Call ended");
    });
  }

  function initSocket() {
    if (typeof window.io !== "function") return false;
    socket = window.io(API, {
      auth: { token: rawToken },
      transports: ["websocket", "polling"],
      reconnection: true
    });
    bindSocket();
    return true;
  }

  function boot() {
    buildUI();
    if (initSocket()) return;
    var s = document.createElement("script");
    s.src = API + "/socket.io/socket.io.js";
    s.onload = initSocket;
    s.onerror = function () { console.warn("[callmanager] could not load socket.io client"); };
    document.head.appendChild(s);
  }

  window.addEventListener("beforeunload", function () {
    if (socket && st.peerId && st.phase !== "idle") socket.emit("endCall", { to: st.peerId });
  });

  window.VryzaCall = {
    start: start,
    end: function () { endCall(true); },
    state: function () { return st.phase; },
    ready: function () { return !!(socket && socket.connected); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
