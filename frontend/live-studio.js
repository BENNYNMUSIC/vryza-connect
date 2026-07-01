const API_URL = "https://vryza-connect-backend-production.up.railway.app";
// Update this with your Railway app's custom TCP proxy port for RTMP (default is 1935)
const RTMP_SERVER = "rtmp://vryza-connect-backend-production.up.railway.app:1935/live";

// ===============================
// DOM ELEMENTS
// ===============================
const username = document.getElementById("username");
const welcomeUser = document.getElementById("welcomeUser");
const profilePic = document.getElementById("profilePic");

const streamKeyInput = document.getElementById("streamKey");
const playbackInput = document.getElementById("playbackUrl");
const rtmpInput = document.getElementById("rtmpServer");

const liveStatus = document.getElementById("liveStatus");

const copyKeyBtn = document.getElementById("copyKey");
const copyPlaybackBtn = document.getElementById("copyPlayback");
const copyServerBtn = document.getElementById("copyServer");
const toggleKeyBtn = document.getElementById("toggleKey");

const goLiveBtn = document.getElementById("goLiveBtn");
const stopLiveBtn = document.getElementById("stopLiveBtn");

const streamTitle = document.getElementById("streamTitle");
const streamDescription = document.getElementById("streamDescription");
const category = document.getElementById("category");

// ===============================
// GLOBAL VARIABLES & PLAYER
// ===============================
let currentUser = null;
let currentStream = null;
let flvPlayer = null;

// ===============================
// TOKEN HELPERS
// ===============================
function getToken() {
    return localStorage.getItem("token");
}

// ===============================
// FETCH USER PROFILE
// ===============================
async function loadUser() {
    try {
        const res = await fetch(`${API_URL}/api/user/me`, {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });

        const data = await res.json();
        if (!data.success) return;

        currentUser = data.user;
        username.textContent = currentUser.username;
        welcomeUser.textContent = `Welcome ${currentUser.username}`;

        if (currentUser.profilePic) {
            profilePic.src = currentUser.profilePic;
        }
    } catch (err) {
        console.error("Error loading user profile:", err);
    }
}

// ===============================
// CREATE OR LOAD STREAM SETUP
// ===============================
async function loadStream() {
    try {
        const res = await fetch(`${API_URL}/api/live/create`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });

        const data = await res.json();
        if (!data.success) {
            alert("Unable to initialize stream configurations.");
            return;
        }

        currentStream = data.stream;

        // Populate the input fields for the user to copy/paste
        streamKeyInput.value = currentStream.streamKey;
        rtmpInput.value = RTMP_SERVER;
        playbackInput.value = `${API_URL}/live/${currentStream.streamKey}.flv`;

        // If the database says the stream is already live, match the UI state
        if (currentStream.isLive) {
            setLive();
        } else {
            setOffline();
        }

        // Initialize the media player stream buffer layer
        startVideoPreview(currentStream.streamKey);

    } catch (err) {
        console.error("Error creating/loading stream data:", err);
    }
}

// ===============================
// FLV VIDEO PLAYER MANAGEMENT
// ===============================
function startVideoPreview(streamKey) {
    const videoElement = document.getElementById("videoPreview");
    
    if (typeof flvjs !== "undefined" && flvjs.isSupported()) {
        // Clear any existing player instances to prevent buffer memory leaks
        if (flvPlayer) {
            flvPlayer.unload();
            flvPlayer.detachMediaElement();
            flvPlayer.destroy();
            flvPlayer = null;
        }

        // Connect flv.js directly to the raw media server application hook
        flvPlayer = flvjs.createPlayer({
            type: 'flv',
            isLive: true,
            url: `${API_URL}/live/${streamKey}.flv`
        });

        flvPlayer.attachMediaElement(videoElement);
        flvPlayer.load();
        
        // Muted play safely handles modern security blocks around auto-playing feeds
        flvPlayer.play().catch(err => {
            console.log("Stream offline or waiting for OBS deployment broadcast handshake...", err);
        });
    } else {
        console.error("flv.js engine dependency could not be resolved by browser container runtime.");
    }
}

// ===============================
// EVENT ACTIONS: UTILITY & COPIES
// ===============================
async function copyText(input) {
    try {
        await navigator.clipboard.writeText(input.value);
        alert("Copied to clipboard!");
    } catch (err) {
        console.error("Clipboard write operations rejected:", err);
    }
}

copyKeyBtn.addEventListener("click", () => copyText(streamKeyInput));
copyPlaybackBtn.addEventListener("click", () => copyText(playbackInput));
copyServerBtn.addEventListener("click", () => copyText(rtmpInput));

toggleKeyBtn.addEventListener("click", () => {
    if (streamKeyInput.type === "password") {
        streamKeyInput.type = "text";
        toggleKeyBtn.textContent = "Hide";
    } else {
        streamKeyInput.type = "password";
        toggleKeyBtn.textContent = "Show";
    }
});

// ===============================
// INTERFACE STATE RE-RENDERS
// ===============================
function setOffline() {
    liveStatus.classList.remove("live");
    liveStatus.innerHTML = "⚫ Offline";
}

function setLive() {
    liveStatus.classList.add("live");
    liveStatus.innerHTML = "🔴 LIVE";
}

// ===============================
// GO LIVE & METADATA OVERWRITES
// ===============================
goLiveBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(`${API_URL}/api/live/update`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                title: streamTitle.value,
                description: streamDescription.value,
                category: category.value
            })
        });

        const data = await response.json();
        if (data.success) {
            setLive();
            alert("Stream dashboard information customized! You can now start streaming via OBS.");
            if (currentStream) {
                startVideoPreview(currentStream.streamKey);
            }
        } else {
            alert("Failed to sync structural customization changes.");
        }
    } catch (err) {
        console.error("Metadata pipeline runtime connection error:", err);
    }
});

stopLiveBtn.addEventListener("click", () => {
    setOffline();
    if (flvPlayer) {
        flvPlayer.pause();
    }
    alert("Studio player canvas terminated. Remember to end transmission inside OBS to close connection hooks completely.");
});

// ===============================
// PAGE INTIALIZATION LIFECYCLE
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    // Default system initialization baseline state
    setOffline();
    
    // Fetch user context parameters and set up pipeline configs
    await loadUser();
    await loadStream();
});