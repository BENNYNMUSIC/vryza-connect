// ============================================================
// VRYZA CONNECT - ADMIN CONSOLE
// ============================================================
const API_URL = "https://vryza-connect-backend-1.onrender.com";
const PAGE_SIZE = 20;
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' fill='%23cbd5e1'/><path fill='%2394a3b8' d='M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z'/></svg>";
const PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 1440 },
  { label: "7 days", minutes: 10080 },
  { label: "30 days", minutes: 43200 }
];
const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440 };

function getCleanToken() {
  const raw = localStorage.getItem("token");
  return raw ? raw.replace(/^Bearer\s+/i, "").trim() : null;
}

let currentUserId = "";
try {
  const me = JSON.parse(localStorage.getItem("user") || "null");
  currentUserId = me ? String(me._id || me.id || "") : "";
} catch (e) {}

if (!getCleanToken()) {
  window.location.replace("auth.html");
  throw new Error("Not logged in");
}

const els = {
  users: document.getElementById("users"),
  stats: document.getElementById("stats"),
  filters: document.getElementById("filters"),
  search: document.getElementById("search"),
  count: document.getElementById("count"),
  refresh: document.getElementById("refreshBtn")
};

let allUsers = [];
let filter = "all";
let query = "";
let visible = PAGE_SIZE;
const openIds = new Set();
const banChoice = {};   // userId -> minutes chosen via preset

/* ---------------- tiny DOM helper (text is always set safely) ---------------- */
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v === false || v == null) return;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  });
  children.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}

function toast(message, isError) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = h("div", { class: "toast" + (isError ? " err" : ""), role: "status", text: message });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function confirmDialog(title, message, confirmLabel, kind) {
  return new Promise((resolve) => {
    const close = (val) => { overlay.remove(); resolve(val); };
    const overlay = h("div", { class: "overlay", role: "dialog", "aria-modal": "true", onclick: (e) => { if (e.target === overlay) close(false); } },
      h("div", { class: "dialog" },
        h("h3", { text: title }),
        h("p", { text: message }),
        h("div", { class: "row" },
          h("button", { class: "btn cancel", type: "button", text: "Cancel", onclick: () => close(false) }),
          h("button", { class: "btn " + (kind || "danger"), type: "button", text: confirmLabel, onclick: () => close(true) })
        )
      )
    );
    document.body.appendChild(overlay);
    overlay.querySelector(".btn.cancel").focus();
  });
}

/* ---------------- helpers ---------------- */
function buildAvatar(user) {
  const raw = user.profilePic || user.avatar;
  if (!raw) return DEFAULT_AVATAR;
  return /^(https?:|data:)/.test(raw) ? raw : `${API_URL}/uploads/${String(raw).replace(/^\/?(uploads\/)?/, "")}`;
}
function formatDate(value) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Unknown";
}
function timeLeft(until) {
  const ms = new Date(until).getTime() - Date.now();
  if (!(ms > 0)) return "ending now";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} d`;
}
const uid = (u) => String(u._id || u.id);
const isAdminUser = (u) => u.role === "admin";
const isBannedNow = (u) => u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now();

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${getCleanToken()}`, "Content-Type": "application/json" }
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.replace("auth.html");
    throw new Error("Session expired");
  }
  let data = {};
  try { data = await res.json(); } catch (e) {}
  return { res, data };
}

/* ---------------- load ---------------- */
async function fetchUsers() {
  els.refresh.disabled = true;
  if (!allUsers.length) els.users.replaceChildren(h("div", { class: "state", text: "Loading users…" }));

  try {
    const { res, data } = await api("/api/admin/users");

    if (res.status === 403) {
      els.stats.replaceChildren();
      els.users.replaceChildren(h("div", { class: "state error" }, h("div", { text: "🔒", style: "font-size:32px" }), h("b", { text: "Administrator access required" }), h("div", { text: "Your account does not have administrator permissions." })));
      return;
    }
    if (!res.ok || data.success === false) {
      els.users.replaceChildren(h("div", { class: "state error", text: "⚠️ " + (data.message || "Failed to load users.") }));
      return;
    }

    allUsers = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
    render();
  } catch (err) {
    if (err.message === "Session expired") return;
    console.error("❌ ADMIN USERS FETCH ERROR:", err);
    els.users.replaceChildren(h("div", { class: "state error", text: "Could not connect to the server. Pull to refresh or try again." }));
  } finally {
    els.refresh.disabled = false;
  }
}

/* ---------------- render ---------------- */
function matches(u) {
  if (filter === "banned" && !isBannedNow(u)) return false;
  if (filter === "active" && isBannedNow(u)) return false;
  if (filter === "admins" && !isAdminUser(u)) return false;
  if (!query) return true;
  return `${u.username || ""} ${u.email || ""}`.toLowerCase().includes(query);
}

function renderStats() {
  const week = Date.now() - 7 * 86400000;
  const items = [
    ["Total", allUsers.length],
    ["Admins", allUsers.filter(isAdminUser).length],
    ["Banned", allUsers.filter(isBannedNow).length],
    ["New (7d)", allUsers.filter((u) => new Date(u.createdAt).getTime() > week).length]
  ];
  els.stats.replaceChildren(...items.map(([label, n]) => h("div", { class: "stat" }, h("b", { text: String(n) }), h("span", { text: label }))));
}

function renderFilters() {
  const defs = [["all", "All"], ["active", "Active"], ["banned", "Banned"], ["admins", "Admins"]];
  els.filters.replaceChildren(...defs.map(([key, label]) =>
    h("button", { class: "chip", type: "button", "aria-pressed": String(filter === key), text: label, onclick: () => { filter = key; visible = PAGE_SIZE; render(); } })));
}

function render() {
  renderStats();
  renderFilters();

  const list = allUsers.filter(matches);
  els.count.textContent = `${list.length} of ${allUsers.length} user${allUsers.length === 1 ? "" : "s"}`;

  if (!list.length) {
    els.users.replaceChildren(h("div", { class: "state", text: allUsers.length ? "No users match your search." : "No users found." }));
    return;
  }

  const nodes = list.slice(0, visible).map(createUserCard);
  if (list.length > visible) {
    nodes.push(h("button", { class: "more", type: "button", text: `Show more (${list.length - visible} left)`, onclick: () => { visible += PAGE_SIZE; render(); } }));
  }
  els.users.replaceChildren(...nodes);
}

function createUserCard(user) {
  const id = uid(user);
  const isSelf = id === currentUserId;
  const admin = isAdminUser(user);
  const banned = isBannedNow(user);
  const open = openIds.has(id);

  const avatar = h("img", { class: "avatar", src: buildAvatar(user), alt: "", loading: "lazy" });
  avatar.addEventListener("error", () => { avatar.src = DEFAULT_AVATAR; }, { once: true });

  const pills = [
    admin ? h("span", { class: "pill admin", text: "👑 Admin" }) : h("span", { class: "pill ok", text: "User" }),
    banned ? h("span", { class: "pill bad", text: `🚫 Banned · ${timeLeft(user.bannedUntil)} left` }) : h("span", { class: "pill ok", text: "✓ Active" })
  ];

  const head = h("button", { class: "user-head", type: "button", "aria-expanded": String(open),
    onclick: (e) => { const card = e.currentTarget.closest(".user"); const now = card.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", String(now)); now ? openIds.add(id) : openIds.delete(id); } },
    avatar,
    h("div", { class: "info" },
      h("div", { class: "name" }, user.username || "Anonymous account", isSelf ? h("span", { class: "pill you", text: "You" }) : null),
      h("div", { class: "email", text: user.email || "No email provided" }),
      h("div", { class: "meta" }, ...pills, h("span", { class: "pill you", text: "Joined " + formatDate(user.createdAt) }))
    ),
    h("span", { class: "chev", text: "▾", "aria-hidden": "true" })
  );

  return h("article", { class: "user" + (open ? " open" : "") }, head, buildPanel(user, { id, isSelf, admin, banned }));
}

function buildPanel(user, { id, isSelf, admin, banned }) {
  const panel = h("div", { class: "panel" });

  if (banned) {
    panel.append(h("div", null,
      h("div", { class: "banbox", text: `Banned until ${new Date(user.bannedUntil).toLocaleString()}` }),
      h("div", { class: "row", style: "margin-top:10px" },
        h("button", { class: "btn ok", type: "button", text: "Lift ban", onclick: () => unbanUser(id, user.username) }))));
  }

  if (isSelf || admin) {
    panel.append(h("p", { class: "note", text: isSelf ? "This is your own administrator account. It can't be banned." : "Administrator accounts are protected from bans." }));
    return panel;
  }

  // Ban controls
  const unit = h("select", { "aria-label": "Unit" }, ...Object.keys(UNIT_MINUTES).map((u) => h("option", { value: u, text: u })));
  unit.value = "hours";
  const amount = h("input", { type: "number", min: "1", step: "1", inputmode: "numeric", placeholder: "Custom", "aria-label": "Custom ban length" });
  const presetsRow = h("div", { class: "presets" });
  const refreshPresets = () => presetsRow.querySelectorAll(".preset").forEach((b) => b.setAttribute("aria-pressed", String(banChoice[id] === Number(b.dataset.m))));
  PRESETS.forEach((p) => presetsRow.append(h("button", { class: "preset", type: "button", "data-m": String(p.minutes), "aria-pressed": "false", text: p.label,
    onclick: () => { banChoice[id] = p.minutes; amount.value = ""; refreshPresets(); } })));
  amount.addEventListener("input", () => { banChoice[id] = null; refreshPresets(); });

  const banBtn = h("button", { class: "btn danger", type: "button", text: banned ? "Extend ban" : "Ban user",
    onclick: () => {
      let minutes = banChoice[id];
      if (!minutes && amount.value) minutes = Math.round(Number(amount.value) * UNIT_MINUTES[unit.value]);
      banUser(id, user.username, minutes, banBtn);
    } });

  panel.append(
    h("div", null, h("h4", { text: "Ban for" }), presetsRow, h("div", { class: "custom" }, amount, unit)),
    h("div", { class: "row" }, banBtn),
    h("div", null, h("h4", { text: "Permissions" }),
      h("div", { class: "row" }, h("button", { class: "btn purple", type: "button", text: "👑 Make administrator", onclick: () => makeAdmin(id, user.username) })))
  );
  return panel;
}

/* ---------------- actions ---------------- */
async function runAction(path, body, fallbackError, button) {
  if (button) button.disabled = true;
  try {
    const { res, data } = await api(path, { method: "POST", body: JSON.stringify(body) });
    if (!res.ok || data.success === false) {
      toast(data.message || fallbackError, true);
      return false;
    }
    toast(data.message || "Done");
    await fetchUsers();
    return true;
  } catch (err) {
    if (err.message !== "Session expired") toast("Could not connect to the server. Please try again.", true);
    return false;
  } finally {
    if (button) button.disabled = false;
  }
}

async function banUser(userId, username, minutes, button) {
  if (!Number.isInteger(minutes) || minutes < 1) {
    toast("Pick a ban length or enter a custom amount first.", true);
    return;
  }
  const label = minutes >= 1440 ? `${Math.round(minutes / 1440)} day(s)` : minutes >= 60 ? `${Math.round(minutes / 60)} hour(s)` : `${minutes} minute(s)`;
  const ok = await confirmDialog("Ban this user?", `${username || "This user"} will be locked out for ${label}.`, "Ban user", "danger");
  if (!ok) return;
  if (await runAction("/api/admin/ban-user", { userId, durationMinutes: minutes }, "The user could not be banned.", button)) {
    delete banChoice[userId];
  }
}

async function unbanUser(userId, username) {
  const ok = await confirmDialog("Lift this ban?", `${username || "This user"} will be able to use Vryza+ again right away.`, "Lift ban", "ok");
  if (!ok) return;
  await runAction("/api/admin/unban-user", { userId }, "Failed to unban user.");
}

async function makeAdmin(userId, username) {
  const ok = await confirmDialog("Make administrator?", `${username || "This user"} will be able to ban users and manage accounts. This can't be undone from this page.`, "Make admin", "purple");
  if (!ok) return;
  await runAction("/api/admin/make-admin", { userId }, "Could not make this user an administrator.");
}

/* ---------------- events ---------------- */
els.search.addEventListener("input", () => { query = els.search.value.trim().toLowerCase(); visible = PAGE_SIZE; render(); });
els.refresh.addEventListener("click", fetchUsers);

window.fetchUsers = fetchUsers;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.makeAdmin = makeAdmin;

fetchUsers();
