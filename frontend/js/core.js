/* Shared AtithiBandhu helpers: atmosphere, nav, auth, table API */

const AB = (() => {
  const TABLES = {
    tourists: "tables/tourists",
    geofences: "tables/geofences",
    sos: "tables/sos_alerts",
    anomalies: "tables/anomalies",
  };

  const FALLBACK_ZONES = [
    {
      id: "z-gion",
      name: "Gion Quarter",
      type: "safe",
      riskLevel: "low",
      coordinates: [[35.0068, 135.7702], [35.0068, 135.7804], [35.0002, 135.7804], [35.0002, 135.7702]],
      description: "Lantern-lit heritage streets under community watch.",
    },
    {
      id: "z-path",
      name: "Philosopher’s Path",
      type: "safe",
      riskLevel: "low",
      coordinates: [[35.0302, 135.7928], [35.0302, 135.7994], [35.0228, 135.7994], [35.0228, 135.7928]],
      description: "Canal-side cherry walk with regular patrols.",
    },
    {
      id: "z-kamo",
      name: "Kamo River Bank",
      type: "danger",
      riskLevel: "high",
      coordinates: [[35.0210, 135.7676], [35.0210, 135.7724], [34.9895, 135.7724], [34.9895, 135.7676]],
      description: "Unlit flood terrace after dusk.",
    },
    {
      id: "z-fushimi",
      name: "Fushimi Night Ridge",
      type: "restricted",
      riskLevel: "critical",
      coordinates: [[34.9708, 135.7696], [34.9708, 135.7762], [34.9630, 135.7762], [34.9630, 135.7696]],
      description: "Mountain shrine path closes after twilight.",
    },
  ];

  const FALLBACK_TOURISTS = [
    {
      id: "admin-demo",
      name: "Yuki Nakamura",
      email: "admin@atithibandhu.jp",
      passwordHash: "demo:sakura-admin",
      phone: "+81 75 000 1908",
      nationality: "Japan",
      idNumber: "JP-ADM-0001",
      emergencyName: "Kyoto Command",
      emergencyPhone: "+81 75 000 110",
      role: "admin",
      status: "active",
      digitalIdHash: "7c3e91a0b2d84f11c6e5a9d0",
      lat: 35.0116,
      lng: 135.7681,
      tracking: false,
    },
    {
      id: "hana-demo",
      name: "Hana Sato",
      email: "hana@sakura.travel",
      passwordHash: "demo:traveler",
      phone: "+81 90 4412 8801",
      nationality: "Japan",
      idNumber: "TK-884291",
      emergencyName: "Kenji Sato",
      emergencyPhone: "+81 90 4412 1100",
      role: "tourist",
      status: "active",
      digitalIdHash: "a7f3c91e2b88d04f19c2e6aa",
      lat: 35.0037,
      lng: 135.775,
      tracking: true,
    },
  ];

  async function api(path, options = {}) {
    const token = localStorage.getItem("ab_token");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(path, { ...options, headers });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || "Request failed");
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  async function listTable(name, limit = 100) {
    try {
      const data = await api(`${TABLES[name]}?page=1&limit=${limit}`);
      return Array.isArray(data.data) ? data.data : [];
    } catch {
      if (name === "geofences") return FALLBACK_ZONES;
      if (name === "tourists") return FALLBACK_TOURISTS;
      return [];
    }
  }

  async function createRow(name, body) {
    return api(TABLES[name], { method: "POST", body: JSON.stringify(body) });
  }

  async function patchRow(name, id, body) {
    return api(`${TABLES[name]}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  function parseCoords(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("ab_user") || "null");
    } catch {
      return null;
    }
  }

  function setSession(user) {
    localStorage.setItem("ab_user", JSON.stringify(user));
    localStorage.setItem("ab_token", user.id || "session");
  }

  function logout() {
    localStorage.removeItem("ab_user");
    localStorage.removeItem("ab_token");
    location.href = "index.html";
  }

  function requireAuth(role) {
    const user = getUser();
    if (!user) {
      location.href = "login.html";
      return null;
    }
    if (role && user.role !== role) {
      location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
      return null;
    }
    return user;
  }

  function passwordMatches(record, password) {
    if (!record) return false;
    const hash = record.passwordHash || "";
    return hash === "demo:" + password || hash === password;
  }

  function digitalHash() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function pointInPolygon(point, vs) {
    if (!point || !vs || vs.length < 3) return false;
    const x = point.lat;
    const y = point.lng;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0];
      const yi = vs[i][1];
      const xj = vs[j][0];
      const yj = vs[j][1];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function createPetals() {
    if (prefersReducedMotion()) return;
    const layer = document.getElementById("petals");
    if (!layer) return;
    const count = window.innerWidth < 720 ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "petal";
      const size = 8 + Math.random() * 16;
      el.style.setProperty("--size", size + "px");
      el.style.setProperty("--dur", 12 + Math.random() * 16 + "s");
      el.style.setProperty("--delay", -Math.random() * 18 + "s");
      el.style.setProperty("--drift", (Math.random() * 160 - 40) + "px");
      el.style.setProperty("--spin", (180 + Math.random() * 360) + "deg");
      el.style.setProperty("--blur", Math.random() > 0.7 ? "1.2px" : "0px");
      el.style.left = Math.random() * 100 + "vw";
      el.setAttribute("aria-hidden", "true");
      layer.appendChild(el);
    }
  }

  function bindGlow() {
    if (prefersReducedMotion() || window.innerWidth < 720) return;
    const glow = document.getElementById("glow");
    if (!glow) return;
    window.addEventListener("pointermove", (e) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    }, { passive: true });
  }

  function bindNav() {
    const nav = document.getElementById("site-nav");
    const toggle = document.getElementById("nav-toggle");
    const links = document.getElementById("nav-links");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    const path = location.pathname.split("/").pop() || "index.html";
    if (links) {
      links.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        if (href === path || (path === "" && href === "index.html")) a.classList.add("is-active");
      });
    }
    const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const user = getUser();
    const authSlot = document.getElementById("nav-auth");
    if (authSlot) {
      if (user) {
        const dest = user.role === "admin" ? "admin.html" : "dashboard.html";
        const label = user.role === "admin" ? "Command" : "Lantern";
        authSlot.innerHTML =
          `<a class="btn btn-ghost btn-sm" href="${dest}">${label}</a>` +
          `<button class="btn btn-primary btn-sm" type="button" id="nav-logout">Leave</button>`;
        const btn = document.getElementById("nav-logout");
        if (btn) btn.addEventListener("click", logout);
      } else {
        authSlot.innerHTML =
          `<a class="btn btn-ghost btn-sm" href="login.html">Enter</a>` +
          `<a class="btn btn-primary btn-sm" href="register.html">Receive an ID</a>`;
      }
    }
    if (links && !links.querySelector("[data-mobile-auth]")) {
      const extra = document.createElement("li");
      extra.setAttribute("data-mobile-auth", "true");
      extra.className = "mobile-auth";
      extra.innerHTML = user
        ? `<a href="${user.role === "admin" ? "admin.html" : "dashboard.html"}">${user.role === "admin" ? "Command" : "Lantern"}</a>`
        : `<a href="register.html">Receive an ID</a>`;
      links.appendChild(extra);
    }
  }

  function bindReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = (i % 4) * 90 + "ms";
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });
    nodes.forEach((n) => io.observe(n));
  }

  function formatTime(value) {
    if (!value) return "moments ago";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "moments ago";
    return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  }

  function init() {
    createPetals();
    bindGlow();
    bindNav();
    bindReveal();
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    api, listTable, createRow, patchRow, parseCoords,
    getUser, setSession, logout, requireAuth, passwordMatches,
    digitalHash, pointInPolygon, formatTime, FALLBACK_ZONES,
  };
})();
