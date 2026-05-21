const API = "http://localhost:5000";

let currentProfileId = null;

// ================= VIEW PROFILE =================
async function viewProfile(userId) {

  try {

    currentProfileId = userId;

    const res = await fetch(`${API}/api/user/${userId}`);

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to load profile");
      return;
    }

    // ================= USER =================
    const user = data.user;

    // ================= IMAGES =================
    document.getElementById("avatar").src =
      user.profilePic
        ? `${API}/uploads/${user.profilePic}`
        : "images/default-avatar.png";

    // COVER
    if (user.coverImage) {
      document.getElementById("coverPreview").src =
        `${API}/uploads/${user.coverImage}`;
    }

    // ================= TEXT =================
    document.getElementById("username").innerText =
      user.username || "Unknown User";

    document.getElementById("bioText").innerText =
      user.bio || "No bio yet.";

    document.getElementById("followersCount").innerText =
      user.followers?.length || 0;

    document.getElementById("followingCount").innerText =
      user.following?.length || 0;

    // ================= PROFILE DETAILS =================
    document.getElementById("profile").innerHTML = `
      <div class="bg-slate-50 rounded-2xl p-4">
        <p class="text-slate-400 text-xs uppercase font-bold mb-1">Location</p>
        <p>${user.location || "Unknown"}</p>
      </div>

      <div class="bg-slate-50 rounded-2xl p-4">
        <p class="text-slate-400 text-xs uppercase font-bold mb-1">Gender</p>
        <p>${user.gender || "Not specified"}</p>
      </div>

      <div class="bg-slate-50 rounded-2xl p-4">
        <p class="text-slate-400 text-xs uppercase font-bold mb-1">Age</p>
        <p>${user.age || "N/A"}</p>
      </div>

      <div class="bg-slate-50 rounded-2xl p-4">
        <p class="text-slate-400 text-xs uppercase font-bold mb-1">About</p>
        <p>${user.about || "No about info yet."}</p>
      </div>
    `;

    // ================= EDIT FIELDS =================
    document.getElementById("bio").value =
      user.bio || "";

    document.getElementById("age").value =
      user.age || "";

    document.getElementById("location").value =
      user.location || "";

    document.getElementById("about").value =
      user.about || "";

    document.getElementById("gender").value =
      user.gender || "";

    // ================= POSTS =================
    renderPosts(data.posts);

  } catch (err) {

    console.error(err);

    alert("Error loading profile");
  }
}

// ================= RENDER POSTS =================
function renderPosts(posts) {

  const container =
    document.getElementById("postsContainer");

  if (!posts.length) {

    container.innerHTML = `
      <div class="bg-white rounded-3xl p-10 border border-slate-200 text-center text-slate-400">
        No posts yet
      </div>
    `;

    return;
  }

  container.innerHTML = posts.map(post => `

    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      ${post.image ? `
        <img
          src="${API}/uploads/${post.image}"
          class="w-full max-h-[500px] object-cover"
        >
      ` : ""}

      <div class="p-5">

        <div class="flex items-center gap-3 mb-4">

          <img
            src="${
              post.userId?.profilePic
                ? `${API}/uploads/${post.userId.profilePic}`
                : "images/default-avatar.png"
            }"
            class="w-10 h-10 rounded-full object-cover"
          >

          <div>
            <p class="font-bold text-slate-800">
              ${post.userId?.username || "Unknown"}
            </p>

            <p class="text-xs text-slate-400">
              ${new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <p class="text-slate-700 mb-4">
          ${post.caption || ""}
        </p>

        <!-- LIKES -->
        <div class="flex items-center gap-2 mb-4">

          <button
            onclick="likePost('${post._id}')"
            class="
              bg-blue-50
              hover:bg-blue-100
              text-blue-600
              px-4
              py-2
              rounded-xl
              text-sm
              font-semibold
              transition
            "
          >
            ❤️ ${post.likes.length}
          </button>
        </div>

        <!-- COMMENTS -->
        <div class="space-y-2 mb-4">

          ${(post.comments || []).map(comment => `
            <div class="bg-slate-50 rounded-xl px-3 py-2 text-sm">
              <span class="font-bold text-slate-700">
                ${comment.userId?.username || "User"}:
              </span>
              ${comment.text}
            </div>
          `).join("")}
        </div>

        <!-- COMMENT INPUT -->
        <div class="flex gap-2">

          <input
            id="comment-${post._id}"
            placeholder="Write a comment..."
            class="
              flex-1
              bg-slate-50
              rounded-xl
              px-4
              py-2
              text-sm
              outline-none
            "
          >

          <button
            onclick="commentPost('${post._id}')"
            class="
              bg-blue-600
              hover:bg-blue-700
              text-white
              px-4
              rounded-xl
              text-sm
              font-semibold
              transition
            "
          >
            Send
          </button>
        </div>
      </div>
    </div>

  `).join("");
}

// ================= UPDATE PROFILE =================
async function updateProfile() {

  try {

    const formData = new FormData();

    const profilePic =
      document.getElementById("profilePic").files[0];

    const coverImage =
      document.getElementById("coverImage").files[0];

    if (profilePic) {
      formData.append("profilePic", profilePic);
    }

    if (coverImage) {
      formData.append("coverImage", coverImage);
    }

    formData.append(
      "bio",
      document.getElementById("bio").value
    );

    formData.append(
      "age",
      document.getElementById("age").value
    );

    formData.append(
      "location",
      document.getElementById("location").value
    );

    formData.append(
      "about",
      document.getElementById("about").value
    );

    formData.append(
      "gender",
      document.getElementById("gender").value
    );

    const res = await fetch(`${API}/api/user/profile`, {
      method: "PUT",
      headers: {
        Authorization: localStorage.getItem("token")
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Update failed");
      return;
    }

    alert("✅ Profile updated");

    viewProfile(currentProfileId);

  } catch (err) {

    console.error(err);

    alert("Profile update failed");
  }
}

// ================= COMMENT =================
async function commentPost(postId) {

  try {

    const input =
      document.getElementById(`comment-${postId}`);

    const text = input.value.trim();

    if (!text) return;

    const res = await fetch(
      `${API}/api/posts/${postId}/comment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token")
        },
        body: JSON.stringify({ text })
      }
    );

    if (!res.ok) {
      alert("Comment failed");
      return;
    }

    input.value = "";

    viewProfile(currentProfileId);

  } catch (err) {

    console.error(err);

    alert("Error posting comment");
  }
}

// ================= LIKE POST =================
async function likePost(postId) {

  try {

    await fetch(`${API}/api/posts/${postId}/like`, {
      method: "PUT",
      headers: {
        Authorization: localStorage.getItem("token")
      }
    });

    viewProfile(currentProfileId);

  } catch (err) {

    console.error(err);
  }
}

// ================= MESSAGE USER =================
function messageUser() {

  window.location.href = "chat.html";
}