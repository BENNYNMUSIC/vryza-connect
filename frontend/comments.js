// ================= MASTER SERVER PATHWAY LOCATORS =================
const API = "https://vryza-connect-backend-1.onrender.com";

// ================= USER SESSION SECURITY CHECKS =================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "auth.html";
}

function getAuthHeader() {
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// Get the active post ID stored in localStorage when user clicked comments
const currentPostId = localStorage.getItem("commentPostId");

if (!currentPostId) {
  alert("No active post selected.");
  window.location.href = "home.html";
}

// ================= THEME SYNC ENGINE =================
function applyTheme(theme) {
  const body = document.body;
  if (!body) return;

  if (theme === "dark") {
    body.classList.remove("bg-slate-100", "text-slate-800");
    body.classList.add("bg-slate-900", "text-white");
  } else {
    body.classList.remove("bg-slate-900", "text-white");
    body.classList.add("bg-slate-100", "text-slate-800");
  }

  const cards = document.querySelectorAll(".theme-card");
  cards.forEach((card) => {
    if (theme === "dark") {
      card.classList.remove("bg-white", "text-slate-800", "border-slate-200");
      card.classList.add("bg-slate-800", "text-white", "border-slate-700");
    } else {
      card.classList.remove("bg-slate-800", "text-white", "border-slate-700");
      card.classList.add("bg-white", "text-slate-800", "border-slate-200");
    }
  });
}

// ================= LOAD POST & COMMENTS =================
async function loadPostAndComments() {
  try {
    const res = await fetch(`${API}/api/posts`, {
      headers: { "Authorization": getAuthHeader() }
    });

    if (!res.ok) throw new Error("Failed to fetch timeline posts");

    const data = await res.json();
    const posts = data.posts || data;
    
    // Find the specific post matching currentPostId
    const targetPost = posts.find(p => String(p._id || p.id) === String(currentPostId));

    if (!targetPost) {
      document.getElementById("postContainer").innerHTML = `
        <div class="text-center py-8 text-rose-500 font-semibold text-xs">Post not found or has been deleted.</div>
      `;
      return;
    }

    renderPost(targetPost);
    renderComments(targetPost.comments || []);

  } catch (err) {
    console.error("❌ ERROR LOADING POST & COMMENTS:", err);
    document.getElementById("postContainer").innerHTML = `
      <div class="text-center py-8 text-rose-500 font-semibold text-xs">Error connecting to server.</div>
    `;
  }
}

// ================= RENDER POST DETAILS =================
function renderPost(post) {
  const container = document.getElementById("postContainer");
  const userData = post.userId || post.user || {};
  const profilePic = userData.profilePic;
  const username = userData.username || "Anonymous User";

  const avatarHTML = profilePic 
    ? `<img src="${profilePic.startsWith('http') ? profilePic : `${API}/uploads/${profilePic}`}" class="w-full h-full object-cover rounded-full" onerror="this.src='images/default-avatar.png'"/>`
    : escapeHTML(username.charAt(0).toUpperCase());

  const imageHTML = post.image
    ? `<div class="mt-3 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100"><img src="${post.image.startsWith('http') ? post.image : `${API}/uploads/${post.image}`}" class="w-full max-h-[400px] object-cover"/></div>`
    : "";

  container.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center rounded-full font-bold shadow-md overflow-hidden">
        ${avatarHTML}
      </div>
      <div>
        <h4 class="font-bold text-slate-800 text-sm dark-text-target">${escapeHTML(username)}</h4>
        <p class="text-[10px] text-slate-400">Vryza Network Member</p>
      </div>
    </div>
    <p class="text-slate-700 text-sm leading-relaxed dark-text-target">${escapeHTML(post.caption || "")}</p>
    ${imageHTML}
  `;
}

// ================= RENDER COMMENTS LIST =================
function renderComments(comments) {
  const listContainer = document.getElementById("commentsList");
  const countBadge = document.getElementById("commentCountBadge");
  
  countBadge.innerText = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
  listContainer.innerHTML = "";

  if (!Array.isArray(comments) || comments.length === 0) {
    listContainer.innerHTML = `
      <div class="theme-card bg-white p-6 rounded-2xl text-center text-slate-400 text-xs italic border border-slate-200">
        No comments on this post yet. Be the first to share your thoughts!
      </div>
    `;
    return;
  }

  comments.forEach(comment => {
    const commenter = comment.userId || comment.user || {};
    const commenterName = commenter.username || "User";
    const commenterPic = commenter.profilePic;

    const avatarHTML = commenterPic 
      ? `<img src="${commenterPic.startsWith('http') ? commenterPic : `${API}/uploads/${commenterPic}`}" class="w-full h-full object-cover rounded-full" onerror="this.src='images/default-avatar.png'"/>`
      : escapeHTML(commenterName.charAt(0).toUpperCase());

    const commentDiv = document.createElement("div");
    commentDiv.className = "theme-card bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3";
    
    commentDiv.innerHTML = `
      <div class="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center rounded-full font-bold text-xs shrink-0 overflow-hidden shadow-sm">
        ${avatarHTML}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <h5 class="font-bold text-xs text-slate-800 dark-text-target">${escapeHTML(commenterName)}</h5>
          <span class="text-[10px] text-slate-400">Just now</span>
        </div>
        <p class="text-xs text-slate-700 dark-text-target leading-relaxed break-words">${escapeHTML(comment.text || "")}</p>
      </div>
    `;

    listContainer.appendChild(commentDiv);
  });
}

// ================= SUBMIT NEW COMMENT =================
async function submitComment() {
  const input = document.getElementById("commentInput");
  const btn = document.getElementById("submitCommentBtn");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    alert("Comment text cannot be empty.");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Posting...";
    }

    const res = await fetch(`${API}/api/posts/${currentPostId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getAuthHeader()
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      input.value = "";
      // Re-render post and updated comments list returned from backend
      renderPost(data.post);
      renderComments(data.post.comments || []);
    } else {
      alert(data.message || "Failed to post comment.");
    }

  } catch (err) {
    console.error("❌ COMMENT SUBMISSION ERROR:", err);
    alert("Server connection failed while posting comment.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Post";
    }
  }
}

// Helper utility
function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  loadPostAndComments();

  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitComment();
      }
    });
  }
});

// Export global methods
window.submitComment = submitComment;