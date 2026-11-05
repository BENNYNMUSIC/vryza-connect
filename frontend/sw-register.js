// ======================================================
// VRYZA+ PWA: service worker registration, update banner, install prompt
//   VryzaPWA.canInstall()   VryzaPWA.install()   VryzaPWA.isInstalled()   VryzaPWA.needsIosHint()
//   Events on window: "vryza:installable", "vryza:installed"
// ======================================================
(function () {
  "use strict";
  if (window.VryzaPWA) return;

  var deferredInstallPrompt = null;
  var refreshing = false;
  var bannerEl = null;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function fire(name) {
    try { window.dispatchEvent(new CustomEvent(name)); } catch (e) {}
  }
  function callActive() {
    return !!(window.VryzaCall && typeof window.VryzaCall.state === "function" && window.VryzaCall.state() !== "idle");
  }

  /* ---------- small banner (update ready / offline) ---------- */
  function showBanner(text, buttonLabel, onClick, autoHideMs) {
    removeBanner();
    var bar = document.createElement("div");
    bar.setAttribute("role", "status");
    bar.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147482000;" +
      "max-width:460px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;" +
      "background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 34px rgba(0,0,0,.4);" +
      "font:600 13px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
    var span = document.createElement("span");
    span.style.flex = "1";
    span.textContent = text;
    bar.appendChild(span);
    if (buttonLabel) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = buttonLabel;
      btn.style.cssText = "border:0;border-radius:10px;padding:9px 14px;min-height:38px;font:800 13px inherit;background:#3b82f6;color:#fff;cursor:pointer";
      btn.addEventListener("click", onClick);
      bar.appendChild(btn);
    }
    document.body.appendChild(bar);
    bannerEl = bar;
    if (autoHideMs) setTimeout(function () { if (bannerEl === bar) removeBanner(); }, autoHideMs);
  }
  function removeBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  /* ---------- service worker ---------- */
  function promptUpdate(worker) {
    showBanner("A new version of Vryza+ is ready.", "Refresh", function () {
      if (callActive()) { showBanner("Finish your call first, then tap Refresh.", "OK", removeBanner, 4000); return; }
      worker.postMessage({ type: "SKIP_WAITING" });
    });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).then(function (registration) {
        if (registration.waiting && navigator.serviceWorker.controller) promptUpdate(registration.waiting);

        registration.addEventListener("updatefound", function () {
          var worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", function () {
            if (worker.state === "installed" && navigator.serviceWorker.controller) promptUpdate(worker);
          });
        });

        // look for a new version now and then, and whenever the app comes back to the screen
        setInterval(function () { registration.update().catch(function () {}); }, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible") registration.update().catch(function () {});
        });
      }).catch(function (error) {
        console.error("PWA: service worker registration failed:", error);
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  /* ---------- offline / online ---------- */
  window.addEventListener("offline", function () { showBanner("You're offline. Some features need a connection.", null, null, 4000); });
  window.addEventListener("online", function () { showBanner("Back online.", null, null, 2500); });

  /* ---------- install ---------- */
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    fire("vryza:installable");
  });

  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    fire("vryza:installed");
  });

  function install() {
    if (!deferredInstallPrompt) return Promise.resolve("unavailable");
    var promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    return promptEvent.userChoice.then(function (choice) {
      if (choice.outcome !== "accepted") fire("vryza:installable-dismissed");
      return choice.outcome;
    });
  }

  window.VryzaPWA = {
    canInstall: function () { return !!deferredInstallPrompt; },
    install: install,
    isInstalled: isStandalone,
    needsIosHint: function () { return isIOS() && !isStandalone(); }
  };
  window.triggerPwaInstall = install; // old name, still works
})();
