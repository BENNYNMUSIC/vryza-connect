const API_URL = "https://vryza-connect-backend-1.onrender.com";
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' fill='%23334155'/><path fill='%2394a3b8' d='M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z'/></svg>";

const container = document.getElementById("liveStreams");
const countEl = document.getElementById("count");

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
    else el.setAttribute(k, v);
  });
  children.flat().forEach((c) => { if (c != null) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}

function createCard(stream) {
  const avatar = h("img", { src: buildImage(stream.user && stream.user.profilePic), alt: "", loading: "lazy" });
  avatar.addEventListener("error", () => { avatar.src = DEFAULT_AVATAR; }, { once: true });

  return h("a", { class: "stream", href: `live-viewer.html?id=${encodeURIComponent(stream._id)}` },
    h("div", { class: "thumb" },
      avatar,
      h("span", { class: "pill live", text: "● LIVE" }),
      h("span", { class: "pill cat", text: stream.category || "Other" })
    ),
    h("div", { class: "meta" },
      h("b", { text: stream.title || "Untitled stream" }),
      h("span", { class: "muted", text: (stream.user && stream.user.username) || "Anonymous streamer" })
    )
  );
}

async function loadLiveStreams() {
  try {
    const res = await fetch(`${API_URL}/api/live`);
    const data = await res.json();
    const streams = Array.isArray(data.streams) ? data.streams : [];

    if (!streams.length) {
      countEl.textContent = "";
      container.replaceChildren(h("div", { class: "state", style: "grid-column:1/-1" },
        h("div", { class: "big", text: "📡" }),
        h("b", { text: "Nobody is live right now" }),
        h("p", { class: "muted", text: "Be the first - tap Go live to start streaming." })));
      return;
    }

    countEl.textContent = `${streams.length} live stream${streams.length === 1 ? "" : "s"}`;
    container.replaceChildren(...streams.map(createCard));
  } catch (err) {
    console.error("Error loading stream items:", err);
    if (!container.children.length) {
      container.replaceChildren(h("div", { class: "state", style: "grid-column:1/-1", text: "Couldn't load streams. Check your connection." }));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("token")) {
    // Browsing is public, but going live needs an account.
    document.getElementById("goLiveBtn").addEventListener("click", () => { window.location.href = "auth.html"; });
  } else {
    document.getElementById("goLiveBtn").addEventListener("click", () => { window.location.href = "live-studio.html"; });
  }
  document.getElementById("backBtn").addEventListener("click", () => {
    if (document.referrer && history.length > 1) history.back(); else window.location.href = "home.html";
  });

  loadLiveStreams();
  setInterval(loadLiveStreams, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadLiveStreams(); });
});
