// ================= MASTER SERVER PATHWAY LOCATORS =================
const API = "https://vryza-connect-backend-production.up.railway.app";

let currentProfileId = null;

// ================= FETCH AND VIEW PROFILE =================
async function viewProfile(userId) {
  if (!userId || userId === "undefined" || userId === "null") {
    console.warn("⚠️ VIEW PROFILE EXECUTED WITHOUT VALID PEER TARGET TARGET");
    return;
  }

  try {
    currentProfileId = userId;
    const token = localStorage.getItem("token");

    // Connects safely with endpoint mapping architectures
    const res = await fetch(`${API}/api/user/${userId}`, {
      method: "GET",
      headers: {
        "Authorization": token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to load target profile information cluster.");
      return;
    }

    // Unpack data envelopes safely
    const user = data.user || data;
    const associatedPosts = data.posts || [];

    // ================= IMAGES RE-INDEXING PATHWAYS =================
    const avatarEl = document.getElementById("avatar");
    if (avatarEl) {
      avatarEl.src = user.profilePic
        ? (user.profilePic.startsWith("http") ? user.profilePic : `${API}/uploads/${user.profilePic}`)
        : "images/default-avatar.png";
    }

    const coverEl = document.getElementById("coverPreview");
    if (coverEl && user.coverImage) {
      coverEl.src = user.coverImage.startsWith("http") 
        ? user.coverImage 
        : `${API}/uploads/${user.coverImage}`;
    }

    // ================= STRUCTURAL TEXT RENDERING =================
    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.innerText = user.username || "Unknown User";

    const bioTextEl = document.getElementById("bioText");
    if (bioTextEl) bioTextEl.innerText = user.bio || "No bio configured yet.";

    const followersEl = document.getElementById("followersCount");
    if (followersEl) followersEl.innerText = user.followers?.length || 0;

    const followingEl = document.getElementById("followingCount");
    if (followingEl) followingEl.innerText = user.following?.length || 0;

    // ================= STATIC DETAILS CARD OVERLAY =================
    const profileContainer = document.getElementById("profile");
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Location</p>
          <p class="text-slate-700 font-semibold text-sm">${user.location || "Unknown"}</p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Gender</p>
          <p class="text-slate-700 font-semibold text-sm">${user.gender || "Not specified"}</p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Age</p>
          <p class="text-slate-700 font-semibold text-sm">${user.age || "N/A"}</p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">About</p>
          <p class="text-slate-700 text-sm leading-relaxed">${user.about || "No informational description provided."}</p>
        </div>
      `;
    }

    // ================= UPDATE VALUE ATTRIBUTES ON INPUT FORMS SAFELY =================
    const bioInput = document.getElementById("bio");
    if (bioInput) bioInput.value = user.bio || "";

    const ageInput = document.getElementById("age");
    if (ageInput) ageInput.value = user.age || "";

    const locationInput = document.getElementById("location");
    if (locationInput) locationInput.value = user.location || "";

    const aboutInput = document.getElementById("about");
    if (aboutInput) aboutInput.value = user.about || "";

    const genderInput = document.getElementById("gender");
    if (genderInput) genderInput.value = user.gender || "";

    // ================= DISPLAY USER POSTS COLLECTION =================
    renderPosts(associatedPosts);

  } catch (err) {
    console.error("❌ PROFILE EXTRACTION FAULT:", err);
    alert("Critical transit error extracting targeted user profile.");
  }
}

// ================= RENDER INTERACTION FEED LAYOUT =================
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  if (!container) return;

  if (!posts || !posts.length) {
    container.innerHTML = `
      <div class="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400 italic text-sm">
        No active timeline entries broadcasted by this account yet.
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(post => {
    const postAuthor = post.userId || {};
    const hasLiked = post.likes?.includes(String(JSON.parse(localStorage.getItem("user"))?._id || JSON.parse(localStorage.getItem("user"))?.id));

    return `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden my-4">
        ${post.image ? `
          <div class="bg-slate-50 border-b border-slate-100">
            <img src="${API}/uploads/${post.image}" class="w-full max-h-[500px] object-cover block" loading="lazy">
          </div>
        ` : ""}

        <div class="p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              ${postAuthor.profilePic 
                ? `<img src="${postAuthor.profilePic.startsWith("http") ? postAuthor.profilePic : `${API}/uploads/${postAuthor.profilePic}`}" class="w-full h-full object-cover"/>`
                : `<span class="font-bold text-slate-500">${(postAuthor.username || "U").charAt(0).toUpperCase()}</span>`
              }
            </div>

            <div>
              <p class="font-bold text-slate-800 text-sm">${postAuthor.username || "Anonymous User"}</p>
              <p class="text-[11px] text-slate-400">${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Recent"}</p>
            </div>
          </div>

          <p class="text-slate-700 text-sm leading-relaxed mb-4">${post.caption || ""}</p>

          <div class="flex items-center gap-2 mb-4 border-t border-b border-slate-50 py-2">
            <button onclick="likePost('${post._id || post.id}')" 
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
              ${hasLiked ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}">
              ❤️ <span>${post.likes?.length || 0}</span>
            </button>
          </div>

          <div class="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
            ${(post.comments || []).map(comment => {
              const commentAuthor = comment.userId || {};
              return `
                <div class="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 border border-slate-100/50">
                  <span class="font-bold text-slate-800">${commentAuthor.username || "User"}:</span>
                  <span class="ml-1">${comment.text || comment.message || ""}</span>
                </div>
              `;
            }).join("")}
          </div>

          <div class="flex gap-2 border border-slate-200/80 p-1 rounded-xl bg-slate-50/30 focus-within:bg-white focus-within:border-blue-400 transition-all shadow-sm">
            <input id="comment-${post._id || post.id}" placeholder="Write a comment..." 
              class="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none text-slate-700">
            <button onclick="commentPost('${post._id || post.id}')" 
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition">
              Send
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ================= BROADCAST RECOMPILED DATA MANIFEST =================
async function updateProfile() {
  try {
    const token = localStorage.getItem("token");
    const formData = new FormData();

    const profilePicFile = document.getElementById("profilePic")?.files?.[0];
    const coverImageFile = document.getElementById("coverImage")?.files?.[0];

    if (profilePicFile) formData.append("profilePic", profilePicFile);
    if (coverImageFile) formData.append("coverImage", coverImageFile);

    // Capture standard form input fields safely
    const bioVal = document.getElementById("bio")?.value || "";
    const ageVal = document.getElementById("age")?.value || "";
    const locVal = document.getElementById("location")?.value || "";
    const abtVal = document.getElementById("about")?.value || "";
    const genVal = document.getElementById("gender")?.value || "";

    formData.append("bio", bioVal);
    formData.append("age", ageVal);
    formData.append("location", locVal);
    formData.append("about", abtVal);
    formData.append("gender", genVal);

    const res = await fetch(`${API}/api/user/profile`, {
      method: "PUT",
      headers: {
        "Authorization": token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Transmission updating routines rejected by database firewall.");
      return;
    }

    alert("✅ Profile updated successfully!");
    viewProfile(currentProfileId);

  } catch (err) {
    console.error("❌ FORM TRANSMISSION STRUCTURING FAULT:", err);
    alert("Profile storage parsing operation encountered an exception error.");
  }
}

// ================= ENGAGE COMMENT SUBMISSION LOOP =================
async function commentPost(postId) {
  if (!postId) return;

  try {
    const token = localStorage.getItem("token");
    const input = document.getElementById(`comment-${postId}`);
    const text = input?.value.trim();

    if (!text) return;

    // Connect with backend comment mapping routes
    const res = await fetch(`${API}/api/posts/${postId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      },
      body: JSON.stringify({ text: text })
    });

    if (!res.ok) {
      alert("Comment synchronization failed.");
      return;
    }

    if (input) input.value = "";
    viewProfile(currentProfileId);

  } catch (err) {
    console.error("❌ LEAVE COMMENT PACKET DISPATCH FAILURE:", err);
    alert("Comment pipeline experienced a route interception error.");
  }
}

// ================= TOGGLE METRIC LIKE COUNT STATIONS =================
async function likePost(postId) {
  if (!postId) return;

  try {
    const token = localStorage.getItem("token");
    
    // Connects seamlessly to backend payload specifications
    await fetch(`${API}/api/posts/${postId}/like`, {
      method: "PUT",
      headers: {
        "Authorization": token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      }
    });

    viewProfile(currentProfileId);

  } catch (err) {
    console.error("❌ LIKE CONDUIT PACKET TRANSMISSION ERROR:", err);
  }
}

// ================= EXTRUDED NAVIGATION CHANNELS =================
function messageUser() {
  window.location.href = "chat.html";
}

// ================= GLOBAL SCOPE WINDOW REGISTER HOOKS =================
window.viewProfile = viewProfile;
window.renderPosts = renderPosts;
window.updateProfile = updateProfile;
window.commentPost = commentPost;
window.likePost = likePost;
window.messageUser = messageUser;

// ================= BOOTSTRAP AUTO RUN ENGINE =================
document.addEventListener("DOMContentLoaded", () => {
  const activeTargetId = localStorage.getItem("profileUserId");
  
  if (activeTargetId) {
    viewProfile(String(activeTargetId));
  } else {
    // Fall back cleanly to self dashboard identity state patterns if peer context is missing
    const userPayload = JSON.parse(localStorage.getItem("user") || "{}");
    const fallbackId = userPayload._id || userPayload.id;
    if (fallbackId) viewProfile(String(fallbackId));
  }
});