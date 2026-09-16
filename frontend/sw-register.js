// ================= PWA SERVICE WORKER REGISTRATION & INSTALL ENGINE =================
let deferredInstallPrompt = null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js", { scope: "./" })
      .then((registration) => {
        console.log("✅ PWA: ServiceWorker registered successfully with scope:", registration.scope);

        // Check for SW updates
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("🔄 PWA: New content available. Refresh to apply updates.");
              }
            };
          }
        });
      })
      .catch((error) => {
        console.error("❌ PWA: ServiceWorker registration failed:", error);
      });
  });
}

// Catch browser install prompt for custom trigger buttons if needed
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  
  // Expose global trigger for custom "Install App" buttons
  window.triggerPwaInstall = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`PWA: Install choice outcome: ${outcome}`);
    deferredInstallPrompt = null;
  };
});