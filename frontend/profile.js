[cite: 2]// ================= MASTER API CONFIGURATION =================
const API = "https://vryza-connect-backend-1.onrender.com";

// ================= DEFAULT FALLBACK GRAPHICS =================
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-.85-5.05-2.2.03-1.66 3.33-2.55 5.05-2.55 1.71 0 5.02.89 5.05 2.55C15.8 19.15 14.03 20 12 20z'/></svg>";

// ================= GLOBAL STATE =================
let currentProfileId = null;
let currentProfileUser = null;

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

function getCleanToken() {
  const token = localStorage.getItem("token");
  if (!token) return "";
  return token.replace(/^Bearer\s+/i, "").trim();
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
    const isLoggedAdmin = storedUser.role === "admin" || storedUser.isAdmin === true;

    // Toggle edit sidebar, cover upload, and gallery upload wrappers based on profile ownership
    const editSidebar = document.getElementById("editSidebar");
    const coverUploadBtnWrapper = document.getElementById("coverUploadBtnWrapper");
    const galleryUploadWrapper = document.getElementById("galleryUploadWrapper");

    if (editSidebar) editSidebar.style.display = isOwnProfile ? "block" : "none";
    if (coverUploadBtnWrapper) coverUploadBtnWrapper.style.display = isOwnProfile ? "block" : "none";
    if (galleryUploadWrapper) galleryUploadWrapper.style.display = isOwnProfile ? "block" : "none";

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
    currentProfileUser = user;
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

    // Render User Info Header & Badges
    const username = document.getElementById("username");
    if (username) username.innerText = user.username || "Unknown User";

    const relationshipBadge = document.getElementById("relationshipStatusBadge");
    const relationshipText = document.getElementById("relationshipStatusText");
    if (user.relationshipStatus) {
      if (relationshipText) relationshipText.innerText = user.relationshipStatus;
      if (relationshipBadge) relationshipBadge.classList.remove("hidden");
    } else if (relationshipBadge) {
      relationshipBadge.classList.add("hidden");
    }

    const adminBadgeContainer = document.getElementById("adminBadgeContainer");
    if (adminBadgeContainer) {
      const isTargetAdmin = user.role === "admin" || user.isAdmin === true;
      if (isTargetAdmin) {
        adminBadgeContainer.innerHTML = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 shadow-2xs">👑 ADMIN</span>`;
      } else {
        adminBadgeContainer.innerHTML = "";
      }
    }

    // Configure Admin Moderation Panel if logged-in user is admin viewing someone else
    const adminModerationCard = document.getElementById("adminModerationCard");
    if (adminModerationCard) {
      if (isLoggedAdmin && !isOwnProfile) {
        adminModerationCard.classList.remove("hidden");
        setupAdminModerationPanel(user);
      } else {
        adminModerationCard.classList.add("hidden");
      }
    }

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
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">Relationship</p>
          <p class="text-slate-700 font-semibold text-sm">${user.relationshipStatus || "Unspecified"}</p>
        </div>

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

      const relInput = document.getElementById("relationshipStatus");
      if (relInput) relInput.value = user.relationshipStatus || "";
    }

    // Render Gallery and Posts
    renderPhotoGallery(user.gallery || []);
    renderPosts(posts);

  } catch (err) {
    console.error("❌ PROFILE LOADING ERROR:", err);
  }
}

// ================= PROFILE PICTURE MODAL (Likes & Comments) =================
function openProfilePicModal() {
  if (!currentProfileUser) return;
  const modal = document.getElementById("profilePicModal");
  const img = document.getElementById("modalProfilePic");

  if (img) img.src = buildImage(currentProfileUser.profilePic);
  updateProfilePicModalData();
  if (modal) modal.classList.remove("hidden");
}

function closeProfilePicModal() {
  const modal = document.getElementById("profilePicModal");
  if (modal) modal.classList.add("hidden");
}

function updateProfilePicModalData() {
  if (!currentProfileUser) return;
  const likesCount = document.getElementById("profilePicLikesCount");
  const commentsList = document.getElementById("profilePicCommentsList");

  const likes = currentProfileUser.profilePicLikes || [];
  const comments = currentProfileUser.profilePicComments || [];

  if (likesCount) likesCount.innerText = likes.length;

  if (commentsList) {
    if (!comments.length) {
      commentsList.innerHTML = `<p class="text-slate-400 text-xs italic">No comments on profile picture yet.</p>`;
    } else {
      commentsList.innerHTML = comments.map(c => `
        <div class="bg-slate-50 p-2 rounded-xl text-xs border border-slate-100">
          <span class="font-bold text-slate-800">${c.username || 'User'}:</span>
          <span class="text-slate-700 ml-1">${c.text || ''}</span>
        </div>
      `).join("");
    }
  }
}

async function likeProfilePicture() {
  if (!currentProfileId) return;

  try {
    const res = await fetch(`${API}/api/user/${currentProfileId}/like-profile-pic`, {
      method: "POST",
      headers: { Authorization: getToken() }
    });

    const data = await res.json();
    if (res.ok) {
      currentProfileUser.profilePicLikes = data.profilePicLikes || [];
      updateProfilePicModalData();
    } else {
      alert(data.message || "Failed to like profile picture.");
    }
  } catch (err) {
    console.error("❌ LIKE PROFILE PIC ERROR:", err);
  }
}

async function commentProfilePicture() {
  const input = document.getElementById("profilePicCommentInput");
  const text = input?.value?.trim();
  if (!text || !currentProfileId) return;

  try {
    const res = await fetch(`${API}/api/user/${currentProfileId}/comment-profile-pic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getToken()
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (res.ok) {
      currentProfileUser.profilePicComments = data.profilePicComments || [];
      if (input) input.value = "";
      updateProfilePicModalData();
    } else {
      alert(data.message || "Failed to post comment.");
    }
  } catch (err) {
    console.error("❌ COMMENT PROFILE PIC ERROR:", err);
  }
}

// ================= PHOTO GALLERY LOGIC =================
function renderPhotoGallery(gallery) {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  const storedUser = getStoredUser();
  const isOwnProfile = currentProfileId === String(storedUser._id || storedUser.id || "");

  if (!gallery || !gallery.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-slate-400 text-xs italic py-4">No gallery photos added yet.</p>`;
    return;
  }

  grid.innerHTML = gallery.map((photo, idx) => {
    const imgUrl = buildImage(photo);
    return `
      <div class="relative group aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
        <img src="${imgUrl}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition" onclick="openGalleryModal('${imgUrl}')" />
        ${isOwnProfile ? `
          <button onclick="deleteGalleryPhoto(${idx})" class="absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-600 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer" title="Delete photo">✕</button>
        ` : ''}
      </div>
    `;
  }).join("");
}

async function uploadGalleryPhoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("photo", file);

  try {
    const res = await fetch(`${API}/api/user/gallery/upload`, {
      method: "POST",
      headers: { Authorization: getToken() },
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ Photo added to gallery!");
      viewProfile(currentProfileId);
    } else {
      alert(data.message || "Failed to upload photo.");
    }
  } catch (err) {
    console.error("❌ GALLERY UPLOAD ERROR:", err);
  }
}

async function deleteGalleryPhoto(index) {
  if (!confirm("Remove this photo from your gallery?")) return;

  try {
    const res = await fetch(`${API}/api/user/gallery/${index}`, {
      method: "DELETE",
      headers: { Authorization: getToken() }
    });

    if (res.ok) {
      viewProfile(currentProfileId);
    } else {
      alert("Failed to delete photo.");
    }
  } catch (err) {
    console.error("❌ DELETE GALLERY PHOTO ERROR:", err);
  }
}

function openGalleryModal(url) {
  const modal = document.getElementById("galleryModal");
  const img = document.getElementById("galleryModalImg");
  if (img) img.src = url;
  if (modal) modal.classList.remove("hidden");
}

function closeGalleryModal() {
  const modal = document.getElementById("galleryModal");
  if (modal) modal.classList.add("hidden");
}

// ================= ADMIN MODERATION SETUP =================
function setupAdminModerationPanel(user) {
  const statusBadge = document.getElementById("userBanStatusBadge");
  const banContainer = document.getElementById("banActionContainer");
  const unbanContainer = document.getElementById("unbanActionContainer");
  const makeAdminBtn = document.getElementById("adminMakeAdminBtn");

  const isBanned = Boolean(user.isBanned);
  const isTargetAdmin = user.role === "admin" || user.isAdmin === true;

  if (statusBadge) {
    if (isBanned) {
      statusBadge.innerText = "🚫 Banned";
      statusBadge.className = "text-xs px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-700";
    } else {
      statusBadge.innerText = "✓ Active Status";
      statusBadge.className = "text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-700";
    }
  }

  if (banContainer && unbanContainer) {
    if (isBanned) {
      banContainer.classList.add("hidden");
      unbanContainer.classList.remove("hidden");
    } else {
      banContainer.classList.remove("hidden");
      unbanContainer.classList.add("hidden");
    }
  }

  if (makeAdminBtn) {
    if (isTargetAdmin) {
      makeAdminBtn.innerText = "✓ User is Already Administrator";
      makeAdminBtn.disabled = true;
      makeAdminBtn.className = "w-full bg-purple-100 text-purple-700 py-3 rounded-xl text-xs font-bold cursor-not-allowed";
    } else {
      makeAdminBtn.innerText = "👑 Grant Admin Permissions";
      makeAdminBtn.disabled = false;
      makeAdminBtn.className = "w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer";
    }
  }
}

async function adminBanTargetUser() {
  if (!currentProfileId) return;
  const input = document.getElementById("adminBanMinutesInput");
  const minutes = Number(input?.value?.trim());

  if (!minutes || minutes <= 0 || !Number.isInteger(minutes)) {
    alert("Please enter a valid whole number of minutes greater than 0.");
    return;
  }

  if (!confirm(`Are you sure you want to ban this user for ${minutes} minute(s)?`)) return;

  try {
    const res = await fetch(`${API}/api/admin/ban-user`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getCleanToken()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId: currentProfileId, durationMinutes: minutes })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to ban user.");
      return;
    }
    alert(data.message || "User successfully banned.");
    viewProfile(currentProfileId);
  } catch (err) {
    console.error("❌ BAN ERROR:", err);
    alert("Server request failed.");
  }
}

async function adminUnbanTargetUser() {
  if (!currentProfileId) return;
  if (!confirm("Are you sure you want to lift this user's ban?")) return;

  try {
    const res = await fetch(`${API}/api/admin/unban-user`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getCleanToken()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId: currentProfileId })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to unban user.");
      return;
    }
    alert(data.message || "User ban lifted successfully.");
    viewProfile(currentProfileId);
  } catch (err) {
    console.error("❌ UNBAN ERROR:", err);
    alert("Server request failed.");
  }
}

async function adminMakeTargetUserAdmin() {
  if (!currentProfileId) return;
  if (!confirm("Are you sure you want to promote this user to administrator?")) return;

  try {
    const res = await fetch(`${API}/api/admin/make-admin`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getCleanToken()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId: currentProfileId })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to promote user.");
      return;
    }
    alert(data.message || "User promoted to administrator.");
    viewProfile(currentProfileId);
  } catch (err) {
    console.error("❌ MAKE ADMIN ERROR:", err);
    alert("Server request failed.");
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
    formData.append("relationshipStatus", document.getElementById("relationshipStatus")?.value || "");

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

// ================= COMMENT & LIKE POSTS =================
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

// ================= LIVE FILE PREVIEWS =================
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
window.adminBanTargetUser = adminBanTargetUser;
window.adminUnbanTargetUser = adminUnbanTargetUser;
window.adminMakeTargetUserAdmin = adminMakeTargetUserAdmin;
window.openProfilePicModal = openProfilePicModal;
window.closeProfilePicModal = closeProfilePicModal;
window.likeProfilePicture = likeProfilePicture;
window.commentProfilePicture = commentProfilePicture;
window.uploadGalleryPhoto = uploadGalleryPhoto;
window.deleteGalleryPhoto = deleteGalleryPhoto;
window.openGalleryModal = openGalleryModal;
window.closeGalleryModal = closeGalleryModal;

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