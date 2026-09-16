// ================= MASTER API CONFIGURATION =================
const API = "https://vryza-connect-backend-1.onrender.com";

// ================= DEFAULT FALLBACK GRAPHICS =================
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.33-2.55 5.05-2.55 1.71 0 5.02.89 5.05 2.55C15.8 19.15 14.03 20 12 20z'/></svg>";

// ================= GLOBAL STATE =================
let currentProfileId = null;

// ================= SAFE USER RETRIEVAL =================
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// ================= SAFE TOKEN RETRIEVAL =================
function getToken() {
  const token = localStorage.getItem("token");
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// ================= SAFE IMAGE URL BUILDER =================
function buildImage(src) {
  if (!src || src === "undefined" || src === "null") return DEFAULT_AVATAR;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  const cleanPath = src.replace(/^\/?(uploads\/)?/, '');
  return `${API}/uploads/${cleanPath}`;
}

// ================= VIEW PROFILE =================
async function viewProfile(userId) {
  if (!userId || userId === "undefined" || userId === "null") {
    console.warn("⚠️ Invalid profile ID requested");
    return;
  }

  try {
    currentProfileId = String(userId);
    const storedUser = getStoredUser();
    const myId = String(storedUser._id || storedUser.id || "");
    const isOwnProfile = currentProfileId === myId;

    // Toggle edit sidebar visibility based on profile ownership
    const editSidebar = document.getElementById("editSidebar");
    const coverUploadBtnWrapper = document.getElementById("coverUploadBtnWrapper");
    if (editSidebar) editSidebar.style.display = isOwnProfile ? "block" : "none";
    if (coverUploadBtnWrapper) coverUploadBtnWrapper.style.display = isOwnProfile ? "block" : "none";

    // Attempt retrieval using primary /api/user routing and secondary /api/users fallback
    let res = await fetch(`${API}/api/user/${userId}`, {
      method: "GET",
      headers: { Authorization: getToken() }
    });

    if (res.status === 404) {
      res = await fetch(`${API}/api/users/${userId}`, {
        method: "GET",
        headers: { Authorization: getToken() }
      });
    }

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to load profile details.");
      return;
    }

    const user = data.user || data.profile || data || {};
    const posts = data.posts || user.posts || [];

    // Avatar Image setup with automatic error fallback
    const avatar = document.getElementById("avatar");
    if (avatar) {
      avatar.onerror = function() {
        this.onerror = null;
        this.src = DEFAULT_AVATAR;
      };
      avatar.src = buildImage(user.profilePic);
    }

    // Cover Image setup
    const cover = document.getElementById("coverPreview");
    if (cover) {
      if (user.coverImage) {
        cover.onerror = function() {
          this.style.display = "none";
        };
        cover.src = buildImage(user.coverImage);
        cover.classList.remove("hidden");
      } else {
        cover.classList.add("hidden");
      }
    }

    // Render User Info Header
    const username = document.getElementById("username");
    if (username) username.innerText = user.username || "Unknown User";

    const bioText = document.getElementById("bioText");
    if (bioText) bioText.innerText = user.bio || "No status bio available.";

    const followers = document.getElementById("followersCount");
    if (followers) followers.innerText = Array.isArray(user.followers) ? user.followers.length : (user.followersCount || 0);

    const following = document.getElementById("followingCount");
    if (following) following.innerText = Array.isArray(user.following) ? user.following.length : (user.followingCount || 0);

    // Profile Details Grid
    const profile = document.getElementById("profile");
    if (profile) {
      profile.innerHTML = `
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Location</p>
          <p class="text-slate-700 font-semibold text-sm">${user.location || "Unspecified"}</p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Gender</p>
          <p class="text-slate-700 font-semibold text-sm">${user.gender || "Unspecified"}</p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Age</p>
          <p class="text-slate-700 font-semibold text-sm">${user.age ? `${user.age} years old` : "N/A"}</p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">About</p>
          <p class="text-slate-700 text-sm leading-relaxed">${user.about || "No profile story written."}</p>
        </div>
      `;
    }

    // Populate Sidebar Edit Fields if active user owns the profile
    if (isOwnProfile) {
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
    }

    renderPosts(posts);

  } catch (err) {
    console.error("❌ PROFILE LOADING ERROR:", err);
  }
}

// ================= RENDER FEED POSTS =================
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  if (!container) return;

  if (!posts || !posts.length) {
    container.innerHTML = `
      <div class="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400 italic text-sm">
        No published entries found.
      </div>
    `;
    return;
  }

  const storedUser = getStoredUser();
  const currentUserId = String(storedUser._id || storedUser.id || "");

  container.innerHTML = posts.map(post => {
    const postAuthor = typeof post.userId === "object" && post.userId !== null ? post.userId : {};
    const authorId = String(postAuthor._id || postAuthor.id || post.userId || "");
    const authorTarget = authorId ? (authorId === currentUserId ? "profile.html" : `profile.html?id=${authorId}`) : "#";
    const hasLiked = (post.likes || []).some(likeId => String(likeId._id || likeId) === currentUserId);
    const postImage = post.image ? buildImage(post.image) : "";

    return `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden my-4">
        ${postImage ? `
          <div class="bg-slate-50 border-b border-slate-100">
            <img src="${postImage}" class="w-full max-h-[500px] object-cover block" loading="lazy" />
          </div>
        ` : ""}

        <div class="p-5">
          <!-- AUTHOR HEADER -->
          <div class="flex items-center gap-3 mb-4 cursor-pointer group" onclick="if('${authorTarget}' !== '#') window.location.href='${authorTarget}';">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              <img src="${buildImage(postAuthor.profilePic)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" />
            </div>

            <div>
              <p class="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition">${postAuthor.username || "Community Member"}</p>
              <p class="text-[11px] text-slate-400">${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Recent"}</p>
            </div>
          </div>

          <p class="text-slate-700 text-sm leading-relaxed mb-4">${post.caption || post.content || ""}</p>

          <div class="flex items-center gap-2 mb-4 border-t border-b border-slate-50 py-2">
            <button onclick="likePost('${post._id}')" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${hasLiked ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}">
              ❤️ <span>${post.likes?.length || 0}</span>
            </button>
          </div>

          <!-- COMMENTS CONTAINER -->
          <div class="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
            ${(post.comments || []).map(comment => {
              const commentAuthor = typeof comment.userId === "object" && comment.userId !== null ? comment.userId : {};
              const commentAuthorId = String(commentAuthor._id || commentAuthor.id || "");
              const commentTarget = commentAuthorId ? (commentAuthorId === currentUserId ? "profile.html" : `profile.html?id=${commentAuthorId}`) : "#";

              return `
                <div class="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 border border-slate-100/50">
                  <span class="font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition" onclick="if('${commentTarget}' !== '#') window.location.href='${commentTarget}';">
                    ${commentAuthor.username || "Member"}:
                  </span>
                  <span class="ml-1">${comment.text || comment.content || ""}</span>
                </div>
              `;
            }).join("")}
          </div>

          <div class="flex gap-2 border border-slate-200/80 p-1 rounded-xl bg-slate-50/30">
            <input id="comment-${post._id}" placeholder="Write a public comment..." class="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none text-slate-700" />
            <button onclick="commentPost('${post._id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition">Send</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ================= UPDATE PROFILE =================
async function updateProfile() {
  const saveBtn = document.getElementById("saveBtn");

  try {
    const formData = new FormData();
    const profilePic = document.getElementById("profilePic")?.files?.[0];
    const coverImage = document.getElementById("coverImage")?.files?.[0];

    if (profilePic) formData.append("profilePic", profilePic);
    if (coverImage) formData.append("coverImage", coverImage);

    formData.append("bio", document.getElementById("bio")?.value.trim() || "");
    formData.append("age", document.getElementById("age")?.value.trim() || "");
    formData.append("location", document.getElementById("location")?.value.trim() || "");
    formData.append("about", document.getElementById("about")?.value.trim() || "");
    formData.append("gender", document.getElementById("gender")?.value || "");

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = "Saving Changes...";
    }

    let res = await fetch(`${API}/api/user/profile`, {
      method: "PUT",
      headers: { Authorization: getToken() },
      body: formData
    });

    if (res.status === 404) {
      res = await fetch(`${API}/api/users/profile`, {
        method: "PUT",
        headers: { Authorization: getToken() },
        body: formData
      });
    }

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to update profile settings.");
      return;
    }

    const updatedUser = data.user || data;
    if (updatedUser && typeof updatedUser === "object") {
      const currentUser = getStoredUser();
      const mergedUserData = { ...currentUser, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(mergedUserData));
    }

    alert("✅ Profile updated successfully.");
    viewProfile(currentProfileId);

  } catch (err) {
    console.error("❌ PROFILE UPDATE ERROR:", err);
    alert("Profile update failed. Please retry.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save Profile Changes";
    }
  }
}

// ================= COMMENT POST =================
async function commentPost(postId) {
  try {
    const input = document.getElementById(`comment-${postId}`);
    const text = input?.value?.trim();
    if (!text) return;

    const res = await fetch(`${API}/api/posts/${postId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getToken()
      },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      alert("Failed to submit comment.");
      return;
    }

    input.value = "";
    viewProfile(currentProfileId);

  } catch (err) {
    console.error("❌ COMMENT SUBMISSION ERROR:", err);
  }
}

// ================= LIKE POST =================
async function likePost(postId) {
  try {
    await fetch(`${API}/api/posts/${postId}/like`, {
      method: "PUT",
      headers: { Authorization: getToken() }
    });

    viewProfile(currentProfileId);

  } catch (err) {
    console.error("❌ LIKE ERROR:", err);
  }
}

// ================= CALLING & MESSAGING INTEGRATION =================
function messageUser() {
  if (!currentProfileId) return;
  window.location.href = `chat.html?userId=${currentProfileId}`;
}

function startCall(callType) {
  if (!currentProfileId) return;
  const storedUser = getStoredUser();
  const myId = String(storedUser._id || storedUser.id || "");

  if (currentProfileId === myId) {
    alert("You cannot place calls to yourself.");
    return;
  }

  window.location.href = `chat.html?userId=${currentProfileId}&callType=${callType}`;
}

// ================= LIVE IMAGE PREVIEWS =================
function setupFilePreviews() {
  const profilePicInput = document.getElementById("profilePic");
  const coverImageInput = document.getElementById("coverImage");

  if (profilePicInput) {
    profilePicInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const avatar = document.getElementById("avatar");
        if (avatar) avatar.src = URL.createObjectURL(file);
      }
    });
  }

  if (coverImageInput) {
    coverImageInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const cover = document.getElementById("coverPreview");
        if (cover) {
          cover.src = URL.createObjectURL(file);
          cover.classList.remove("hidden");
        }
      }
    });
  }
}

// ================= EXPORT GLOBAL METHODS =================
window.viewProfile = viewProfile;
window.renderPosts = renderPosts;
window.updateProfile = updateProfile;
window.commentPost = commentPost;
window.likePost = likePost;
window.messageUser = messageUser;
window.startCall = startCall;

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  setupFilePreviews();

  const storedUser = getStoredUser();
  const myId = String(storedUser._id || storedUser.id || "");

  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("id") || myId;

  if (!targetId) {
    window.location.href = "auth.html";
    return;
  }

  viewProfile(targetId);
});