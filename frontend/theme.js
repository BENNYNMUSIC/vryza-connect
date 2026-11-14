/*!
 * theme.js - shared Vryza+ theme engine (light / dark / auto)
 * Include in <head> of every page:  <script src="theme.js"></script>
 * Saves the choice in localStorage "theme" (same key home.html already uses).
 *   VryzaTheme.set("dark" | "light" | "system")   VryzaTheme.get()   VryzaTheme.toggle()
 */
(function () {
  "use strict";
  var KEY = "theme";
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function read() {
    try { return localStorage.getItem(KEY) || "light"; } catch (e) { return "light"; }
  }

  function isDark(mode) {
    return mode === "dark" || (mode === "system" && !!(mq && mq.matches));
  }

  function apply(mode) {
    var dark = isDark(mode);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    root.style.background = dark ? "#0f172a" : "";
    root.style.color = dark ? "#fff" : "";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0f172a" : "#ffffff");
    try { window.dispatchEvent(new CustomEvent("vryza:theme", { detail: { mode: mode, dark: dark } })); } catch (e) {}
  }

  function set(mode) {
    if (mode !== "dark" && mode !== "light" && mode !== "system") mode = "light";
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    apply(mode);
  }

  // Generic dark styles for plain Tailwind pages (opt in with <body data-vz-dark>).
  var css =
    "html.dark body[data-vz-dark]{background:#0f172a!important;color:#f8fafc!important}" +
    "html.dark body[data-vz-dark] .bg-white,html.dark body[data-vz-dark] .theme-card{background:#1e293b!important;color:#f8fafc!important;border-color:#334155!important}" +
    "html.dark body[data-vz-dark] .bg-slate-50,html.dark body[data-vz-dark] .bg-slate-100{background:#0f172a!important;color:#f8fafc!important}" +
    "html.dark body[data-vz-dark] .bg-slate-200{background:#334155!important;color:#f1f5f9!important}" +
    "html.dark body[data-vz-dark] .text-slate-900,html.dark body[data-vz-dark] .text-slate-800,html.dark body[data-vz-dark] .text-slate-700,html.dark body[data-vz-dark] .text-slate-600,html.dark body[data-vz-dark] .dark-text-target{color:#f1f5f9!important}" +
    "html.dark body[data-vz-dark] .text-slate-500,html.dark body[data-vz-dark] .text-slate-400{color:#94a3b8!important}" +
    "html.dark body[data-vz-dark] .border-slate-100,html.dark body[data-vz-dark] .border-slate-200,html.dark body[data-vz-dark] .theme-border-target{border-color:#334155!important}" +
    "html.dark body[data-vz-dark] input,html.dark body[data-vz-dark] textarea,html.dark body[data-vz-dark] select{background:#0f172a!important;color:#f1f5f9!important;border-color:#334155!important}" +
    "html.dark body[data-vz-dark] ::placeholder{color:#64748b}" +
    "html.dark body[data-vz-dark] nav{background:rgba(15,23,42,.95)!important;border-color:#334155!important}" +
    "body{transition:background-color .2s ease,color .2s ease}";
  var style = document.createElement("style");
  style.id = "vryza-theme-css";
  style.textContent = css;
  (document.head || root).appendChild(style);

  apply(read());

  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(read()); });
  if (mq) {
    var onChange = function () { if (read() === "system") apply("system"); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  window.VryzaTheme = {
    get: read,
    set: set,
    isDark: function () { return isDark(read()); },
    toggle: function () { set(isDark(read()) ? "light" : "dark"); }
  };
})();
