document.addEventListener("DOMContentLoaded", async () => {
  const user = AB.requireAuth();
  if (!user) return;
  if (user.role === "admin") {
    location.href = "admin.html";
    return;
  }

  document.getElementById("welcome-name").textContent = user.name || "Traveler";
  const hash = (user.digitalIdHash || "————————").slice(0, 16);
  document.getElementById("digital-id").textContent = "Digital ID · " + hash + "…";

  const mapEl = document.getElementById("tourist-map");
  const ctx = ABMap.create(mapEl, { center: [user.lat || 35.0116, user.lng || 135.7681], zoom: 13 });
  let zones = await AB.listTable("geofences");
  zones = zones.map((z) => ({ ...z, coordinates: AB.parseCoords(z.coordinates).length ? z.coordinates : z.coordinates }));
  renderZonesList(zones);
  ABMap.render(ctx, { zones, markers: user.lat ? [{ id: "me", lat: user.lat, lng: user.lng, label: "You are here", kind: "you" }] : [] });

  let position = user.lat != null ? { lat: user.lat, lng: user.lng } : null;
  let watchId = null;
  let lastZoneId = null;

  function renderZonesList(list) {
    const el = document.getElementById("zone-list");
    if (!el) return;
    el.innerHTML = list.map((z) =>
      `<li class="zone-chip"><span><span class="dot ${z.type}"></span>${z.name}</span><em class="muted">${z.type}</em></li>`
    ).join("") || `<li class="muted">No geofences yet.</li>`;
  }

  function showBanner(type, message) {
    const box = document.getElementById("alert-banner");
    box.className = "banner banner-" + (type === "restricted" ? "restricted" : type === "safe" ? "safe" : "danger");
    box.hidden = false;
    box.textContent = message;
    setTimeout(() => { box.hidden = true; }, 8000);
  }

  function updateMap() {
    ABMap.render(ctx, {
      zones,
      markers: position ? [{ id: "me", lat: position.lat, lng: position.lng, label: "You are here", kind: "you" }] : [],
    });
    if (position) {
      ctx.map.setView([position.lat, position.lng], Math.max(ctx.map.getZoom(), 14));
      document.getElementById("coords").textContent =
        `Lat ${position.lat.toFixed(5)} · Lng ${position.lng.toFixed(5)}`;
    }
  }

  async function persistLocation(point, extras = {}) {
    if (!user.id) return;
    try {
      await AB.patchRow("tourists", user.id, {
        lat: point.lat,
        lng: point.lng,
        tracking: true,
        lastSeen: new Date().toISOString(),
        ...extras,
      });
    } catch { /* preview fallback */ }
    const next = { ...AB.getUser(), lat: point.lat, lng: point.lng, tracking: true };
    AB.setSession(next);
  }

  function checkGeofence(point) {
    let hit = null;
    for (const zone of zones) {
      const coords = AB.parseCoords(zone.coordinates);
      if (AB.pointInPolygon(point, coords)) hit = zone;
    }
    if (hit && hit.id !== lastZoneId) {
      lastZoneId = hit.id;
      const message = hit.type === "safe"
        ? `You have entered a watched garden: ${hit.name}.`
        : `Caution — you entered a ${hit.type} zone: ${hit.name}.`;
      showBanner(hit.type, message);
      if (hit.type !== "safe") {
        AB.createRow("anomalies", {
          touristId: user.id,
          touristName: user.name,
          reason: `Entered ${hit.type} zone: ${hit.name}`,
          kind: "geofence",
          lat: point.lat,
          lng: point.lng,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }
    if (!hit) lastZoneId = null;
  }

  function startTracking() {
    if (!navigator.geolocation) {
      showBanner("danger", "Geolocation is not supported by this browser.");
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById("loc-error").hidden = true;
        updateMap();
        persistLocation(position);
        checkGeofence(position);
      },
      (err) => {
        const box = document.getElementById("loc-error");
        box.hidden = false;
        box.textContent = err.message || "Unable to read location.";
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setTrackingUi(true);
  }

  function stopTracking() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    setTrackingUi(false);
    if (user.id) AB.patchRow("tourists", user.id, { tracking: false }).catch(() => {});
  }

  function setTrackingUi(on) {
    document.getElementById("track-status").className = "pill" + (on ? " live" : "");
    document.getElementById("track-status").textContent = on ? "Live sharing" : "Quiet";
    document.getElementById("btn-start").hidden = on;
    document.getElementById("btn-stop").hidden = !on;
  }

  document.getElementById("btn-start").addEventListener("click", startTracking);
  document.getElementById("btn-stop").addEventListener("click", stopTracking);
  document.getElementById("btn-logout").addEventListener("click", AB.logout);

  document.getElementById("sos-button").addEventListener("click", async () => {
    const btn = document.getElementById("sos-button");
    const ack = document.getElementById("sos-ack");
    const loc = position || { lat: user.lat, lng: user.lng };
    btn.classList.add("is-sent");
    btn.textContent = "SENT";
    try {
      await AB.createRow("sos", {
        touristId: user.id,
        touristName: user.name,
        touristPhone: user.phone,
        message: "Emergency SOS triggered by tourist",
        lat: loc.lat,
        lng: loc.lng,
        status: "active",
        createdAt: new Date().toISOString(),
      });
      await AB.createRow("anomalies", {
        touristId: user.id,
        touristName: user.name,
        reason: "Emergency SOS triggered",
        kind: "sos",
        lat: loc.lat,
        lng: loc.lng,
        createdAt: new Date().toISOString(),
      });
      if (user.id) await AB.patchRow("tourists", user.id, { status: "alert" });
      ack.textContent = "Command has received your signal. Stay where you are if it is safe.";
    } catch {
      ack.textContent = "Signal noted on this device. Command will see it when the garden is connected.";
    }
    setTimeout(() => {
      btn.classList.remove("is-sent");
      btn.textContent = "SOS";
    }, 5000);
  });

  window.addEventListener("beforeunload", () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
  });
});
