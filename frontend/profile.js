// ================= MASTER API =================
const API =
  "https://vryza-connect-backend-production.up.railway.app";

// ================= GLOBAL STATE =================
let currentProfileId = null;

// ================= SAFE USER =================
function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    return {};
  }
}

// ================= SAFE TOKEN =================
function getToken() {
  const token =
    localStorage.getItem("token");

  if (!token) return "";

  return token.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;
}

// ================= SAFE IMAGE =================
function buildImage(src) {

  if (!src) {
    return "images/default-avatar.png";
  }

  if (src.startsWith("http")) {
    return src;
  }

  return `${API}/uploads/${src}`;
}

// ================= VIEW PROFILE =================
async function viewProfile(userId) {

  if (
    !userId ||
    userId === "undefined" ||
    userId === "null"
  ) {

    console.warn(
      "⚠️ Invalid profile ID"
    );

    return;
  }

  try {

    currentProfileId = String(userId);

    const res = await fetch(
      `${API}/api/user/${userId}`,
      {
        method: "GET",

        headers: {
          Authorization: getToken()
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {

      alert(
        data.message ||
        "Failed to load profile"
      );

      return;
    }

    // ================= SAFE EXTRACTION =================
    const user =
      data.user || data || {};

    const posts =
      data.posts || [];

    // ================= PROFILE IMAGE =================
    const avatar =
      document.getElementById("avatar");

    if (avatar) {

      avatar.src =
        buildImage(user.profilePic);
    }

    // ================= COVER IMAGE =================
    const cover =
      document.getElementById("coverPreview");

    if (cover) {

      cover.src =
        user.coverImage
          ? buildImage(user.coverImage)
          : "";
    }

    // ================= USERNAME =================
    const username =
      document.getElementById("username");

    if (username) {

      username.innerText =
        user.username ||
        "Unknown User";
    }

    // ================= BIO =================
    const bioText =
      document.getElementById("bioText");

    if (bioText) {

      bioText.innerText =
        user.bio ||
        "No bio yet";
    }

    // ================= FOLLOWERS =================
    const followers =
      document.getElementById(
        "followersCount"
      );

    if (followers) {

      followers.innerText =
        user.followers?.length || 0;
    }

    // ================= FOLLOWING =================
    const following =
      document.getElementById(
        "followingCount"
      );

    if (following) {

      following.innerText =
        user.following?.length || 0;
    }

    // ================= PROFILE DETAILS =================
    const profile =
      document.getElementById("profile");

    if (profile) {

      profile.innerHTML = `
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">
            Location
          </p>

          <p class="text-slate-700 font-semibold text-sm">
            ${user.location || "Unknown"}
          </p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">
            Gender
          </p>

          <p class="text-slate-700 font-semibold text-sm">
            ${user.gender || "Not specified"}
          </p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">
            Age
          </p>

          <p class="text-slate-700 font-semibold text-sm">
            ${user.age || "N/A"}
          </p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
          <p class="text-slate-400 text-xs uppercase font-black tracking-wider mb-1">
            About
          </p>

          <p class="text-slate-700 text-sm leading-relaxed">
            ${user.about || "No description"}
          </p>
        </div>
      `;
    }

    // ================= FORM VALUES =================
    const bioInput =
      document.getElementById("bio");

    if (bioInput) {
      bioInput.value =
        user.bio || "";
    }

    const ageInput =
      document.getElementById("age");

    if (ageInput) {
      ageInput.value =
        user.age || "";
    }

    const locationInput =
      document.getElementById("location");

    if (locationInput) {
      locationInput.value =
        user.location || "";
    }

    const aboutInput =
      document.getElementById("about");

    if (aboutInput) {
      aboutInput.value =
        user.about || "";
    }

    const genderInput =
      document.getElementById("gender");

    if (genderInput) {
      genderInput.value =
        user.gender || "";
    }

    // ================= POSTS =================
    renderPosts(posts);

  } catch (err) {

    console.error(
      "❌ PROFILE ERROR:",
      err
    );

    alert(
      "Failed to load profile"
    );
  }
}

// ================= RENDER POSTS =================
function renderPosts(posts) {

  const container =
    document.getElementById(
      "postsContainer"
    );

  if (!container) return;

  // ================= EMPTY =================
  if (
    !posts ||
    !posts.length
  ) {

    container.innerHTML = `
      <div class="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400 italic text-sm">
        No posts yet.
      </div>
    `;

    return;
  }

  // ================= USER =================
  const storedUser =
    getStoredUser();

  const currentUserId =
    String(
      storedUser._id ||
      storedUser.id ||
      ""
    );

  // ================= BUILD POSTS =================
  container.innerHTML =
    posts.map(post => {

      const postAuthor =
        typeof post.userId === "object" &&
        post.userId !== null
          ? post.userId
          : {};

      const hasLiked =
        (post.likes || []).some(
          likeId =>
            String(likeId) ===
            currentUserId
        );

      const postImage =
        post.image
          ? buildImage(post.image)
          : "";

      return `
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden my-4">

          ${
            post.image
              ? `
            <div class="bg-slate-50 border-b border-slate-100">
              <img
                src="${postImage}"
                class="w-full max-h-[500px] object-cover block"
                loading="lazy"
              />
            </div>
          `
              : ""
          }

          <div class="p-5">

            <div class="flex items-center gap-3 mb-4">

              <div class="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">

                ${
                  postAuthor.profilePic
                    ? `
                  <img
                    src="${buildImage(postAuthor.profilePic)}"
                    class="w-full h-full object-cover"
                  />
                `
                    : `
                  <span class="font-bold text-slate-500">
                    ${(postAuthor.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                `
                }

              </div>

              <div>
                <p class="font-bold text-slate-800 text-sm">
                  ${postAuthor.username || "Unknown User"}
                </p>

                <p class="text-[11px] text-slate-400">
                  ${
                    post.createdAt
                      ? new Date(post.createdAt)
                          .toLocaleDateString()
                      : "Recent"
                  }
                </p>
              </div>
            </div>

            <p class="text-slate-700 text-sm leading-relaxed mb-4">
              ${post.caption || ""}
            </p>

            <div class="flex items-center gap-2 mb-4 border-t border-b border-slate-50 py-2">

              <button
                onclick="likePost('${post._id}')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
                ${
                  hasLiked
                    ? "bg-pink-50 text-pink-600 hover:bg-pink-100"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }"
              >
                ❤️
                <span>
                  ${post.likes?.length || 0}
                </span>
              </button>

            </div>

            <div class="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">

              ${(post.comments || [])
                .map(comment => {

                  const commentAuthor =
                    typeof comment.userId === "object" &&
                    comment.userId !== null
                      ? comment.userId
                      : {};

                  return `
                    <div class="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 border border-slate-100/50">

                      <span class="font-bold text-slate-800">
                        ${commentAuthor.username || "User"}:
                      </span>

                      <span class="ml-1">
                        ${comment.text || ""}
                      </span>

                    </div>
                  `;
                })
                .join("")}

            </div>

            <div class="flex gap-2 border border-slate-200/80 p-1 rounded-xl bg-slate-50/30">

              <input
                id="comment-${post._id}"
                placeholder="Write a comment..."
                class="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none text-slate-700"
              />

              <button
                onclick="commentPost('${post._id}')"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Send
              </button>

            </div>

          </div>
        </div>
      `;
    }).join("");
}

// ================= UPDATE PROFILE =================
async function updateProfile() {

  try {

    const formData =
      new FormData();

    const profilePic =
      document.getElementById(
        "profilePic"
      )?.files?.[0];

    const coverImage =
      document.getElementById(
        "coverImage"
      )?.files?.[0];

    if (profilePic) {
      formData.append(
        "profilePic",
        profilePic
      );
    }

    if (coverImage) {
      formData.append(
        "coverImage",
        coverImage
      );
    }

    formData.append(
      "bio",
      document.getElementById("bio")?.value || ""
    );

    formData.append(
      "age",
      document.getElementById("age")?.value || ""
    );

    formData.append(
      "location",
      document.getElementById("location")?.value || ""
    );

    formData.append(
      "about",
      document.getElementById("about")?.value || ""
    );

    formData.append(
      "gender",
      document.getElementById("gender")?.value || ""
    );

    const res =
      await fetch(
        `${API}/api/user/profile`,
        {
          method: "PUT",

          headers: {
            Authorization:
              getToken()
          },

          body: formData
        }
      );

    const data =
      await res.json();

    if (!res.ok) {

      alert(
        data.message ||
        "Profile update failed"
      );

      return;
    }

    alert(
      "✅ Profile updated"
    );

    viewProfile(
      currentProfileId
    );

  } catch (err) {

    console.error(
      "❌ UPDATE PROFILE ERROR:",
      err
    );

    alert(
      "Failed to update profile"
    );
  }
}

// ================= COMMENT POST =================
async function commentPost(postId) {

  try {

    const input =
      document.getElementById(
        `comment-${postId}`
      );

    const text =
      input?.value?.trim();

    if (!text) return;

    const res =
      await fetch(
        `${API}/api/posts/${postId}/comment`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              getToken()
          },

          body: JSON.stringify({
            text
          })
        }
      );

    if (!res.ok) {

      alert(
        "Failed to comment"
      );

      return;
    }

    input.value = "";

    viewProfile(
      currentProfileId
    );

  } catch (err) {

    console.error(
      "❌ COMMENT ERROR:",
      err
    );
  }
}

// ================= LIKE POST =================
async function likePost(postId) {

  try {

    await fetch(
      `${API}/api/posts/${postId}/like`,
      {
        method: "PUT",

        headers: {
          Authorization:
            getToken()
        }
      }
    );

    viewProfile(
      currentProfileId
    );

  } catch (err) {

    console.error(
      "❌ LIKE ERROR:",
      err
    );
  }
}

// ================= MESSAGE USER =================
function messageUser() {
  window.location.href =
    "chat.html";
}

// ================= GLOBAL =================
window.viewProfile =
  viewProfile;

window.renderPosts =
  renderPosts;

window.updateProfile =
  updateProfile;

window.commentPost =
  commentPost;

window.likePost =
  likePost;

window.messageUser =
  messageUser;

// ================= AUTO LOAD =================
document.addEventListener(
  "DOMContentLoaded",
  () => {

    const storedUser =
      getStoredUser();

    const targetId =
      localStorage.getItem(
        "profileUserId"
      ) ||
      storedUser._id ||
      storedUser.id;

    if (!targetId) {

      window.location.href =
        "auth.html";

      return;
    }

    viewProfile(
      String(targetId)
    );
  }
);