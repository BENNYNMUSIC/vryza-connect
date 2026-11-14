/**
 * callsignaling.js - WebRTC call signaling for Vryza+ (put this file next to server.js)
 *
 * In server.js, inside   io.on("connection", (socket) => {   add ONE line:
 *
 *     require("./callsignaling")(io, socket, { User: getModelModule("user"), Notification });
 *
 * IMPORTANT: if your deployed server already handles "callUser" somewhere else
 * (for example in mediaserver.js), remove that old handler first, otherwise
 * every call event would be handled twice.
 *
 * Events from the browser:   callUser, answerCall, rejectCall, iceCandidate, endCall
 * Events to the browser:     incomingCall, callAccepted, callRejected, callUnavailable,
 *                            callMissed, callEnded, iceCandidate
 */
const RING_TIMEOUT_MS = 45000;

// userId -> { peerId, answered, timer }
const activeCalls = new Map();

function isOnline(io, userId) {
  const room = io.sockets.adapter.rooms.get(String(userId));
  return !!(room && room.size > 0);
}

function clearCall(userId) {
  const entry = activeCalls.get(userId);
  if (!entry) return null;
  if (entry.timer) clearTimeout(entry.timer);
  activeCalls.delete(userId);
  const peer = activeCalls.get(entry.peerId);
  if (peer && peer.peerId === userId) {
    if (peer.timer) clearTimeout(peer.timer);
    activeCalls.delete(entry.peerId);
  }
  return entry.peerId;
}

module.exports = function registerCallHandlers(io, socket, deps = {}) {
  const { User, Notification } = deps;
  const me = String(socket.userId || "");
  if (!me) return;

  async function logMissedCall(callerId, calleeId) {
    if (!Notification) return;
    try {
      await Notification.create({ from: callerId, to: calleeId, type: "missed_call" });
    } catch (err) {
      console.warn("Missed-call notification skipped:", err.message);
    }
  }

  // Only accept signaling between the two people actually in this call.
  function inCallWith(peerId) {
    const entry = activeCalls.get(me);
    return !!entry && entry.peerId === String(peerId);
  }

  socket.on("callUser", async (data = {}) => {
    try {
      const callee = String(data.userToCall || "");
      const offer = data.signalData;
      const callType = data.callType === "audio" ? "audio" : "video";

      if (!callee || !offer || callee === me) {
        return socket.emit("callUnavailable", { reason: "Invalid call request" });
      }
      if (activeCalls.has(me)) {
        return socket.emit("callUnavailable", { reason: "You are already in a call" });
      }
      if (activeCalls.has(callee)) {
        return socket.emit("callRejected", { reason: "busy" });
      }
      if (!isOnline(io, callee)) {
        socket.emit("callUnavailable", { reason: "offline" });
        logMissedCall(me, callee);
        return;
      }

      const timer = setTimeout(() => {
        const entry = activeCalls.get(me);
        if (!entry || entry.answered) return;
        clearCall(me);
        io.to(me).emit("callMissed", { to: callee });
        io.to(callee).emit("callEnded", { from: me });
        logMissedCall(me, callee);
      }, RING_TIMEOUT_MS);

      activeCalls.set(me, { peerId: callee, answered: false, timer });
      activeCalls.set(callee, { peerId: me, answered: false, timer: null });

      let fromUser = null;
      if (User) {
        try {
          fromUser = await User.findById(me).select("username profilePic").lean();
        } catch (e) {}
      }

      io.to(callee).emit("incomingCall", { signal: offer, from: me, callType, fromUser });
    } catch (err) {
      console.error("callUser error:", err);
      socket.emit("callUnavailable", { reason: "Server error" });
    }
  });

  socket.on("answerCall", (data = {}) => {
    const to = String(data.to || "");
    if (!inCallWith(to) || !data.signal) return;
    const mine = activeCalls.get(me);
    const theirs = activeCalls.get(to);
    mine.answered = true;
    if (theirs) {
      theirs.answered = true;
      if (theirs.timer) clearTimeout(theirs.timer);
    }
    io.to(to).emit("callAccepted", { signal: data.signal, from: me });
  });

  socket.on("rejectCall", (data = {}) => {
    const to = String(data.to || "");
    if (!inCallWith(to)) return;
    clearCall(me);
    io.to(to).emit("callRejected", { reason: data.reason === "busy" ? "busy" : "declined" });
  });

  socket.on("iceCandidate", (data = {}) => {
    const to = String(data.to || "");
    if (!data.candidate || !inCallWith(to)) return;
    io.to(to).emit("iceCandidate", { candidate: data.candidate, from: me });
  });

  socket.on("endCall", (data = {}) => {
    const to = String(data.to || "");
    if (!inCallWith(to)) return;
    clearCall(me);
    io.to(to).emit("callEnded", { from: me });
  });

  socket.on("disconnect", () => {
    // End the call only when this user's LAST connection closes.
    setTimeout(() => {
      if (isOnline(io, me)) return;
      const entry = activeCalls.get(me);
      if (!entry) return;
      const peer = entry.peerId;
      clearCall(me);
      io.to(peer).emit("callEnded", { from: me });
    }, 1500);
  });
};
