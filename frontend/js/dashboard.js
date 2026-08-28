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

  // AI Safety Advisor Integration
  const btnAiPredict = document.getElementById("btn-ai-predict");
  const aiResultDiv = document.getElementById("ai-advisor-result");
  const aiScoreEl = document.getElementById("ai-score");
  const aiMatchedAreaEl = document.getElementById("ai-matched-area");
  const aiPositivesEl = document.getElementById("ai-positives");
  const aiNegativesEl = document.getElementById("ai-negatives");
  const aiRecsBox = document.getElementById("ai-recommendations-box");
  const aiRecsList = document.getElementById("ai-recs-list");

  if (btnAiPredict) {
    btnAiPredict.addEventListener("click", async () => {
      // 1. Get current position or fall back to user's registered home location
      const loc = position || { lat: user.lat, lng: user.lng };
      if (!loc || loc.lat == null || loc.lng == null) {
        showBanner("danger", "Please start live location sharing first to establish GPS coordinates.");
        return;
      }

      btnAiPredict.disabled = true;
      btnAiPredict.textContent = "Querying Python AI...";
      aiResultDiv.style.display = "none";

      try {
        // Fetch location safety prediction and recommendations in parallel from Python FastAPI (port 8000)
        const [predRes, recRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/predict-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng })
          }).then(r => {
            if (!r.ok) throw new Error("API error: " + r.statusText);
            return r.json();
          }),
          fetch(`http://127.0.0.1:8000/safer-areas?latitude=${loc.lat}&longitude=${loc.lng}&radius=10000`).then(r => {
            if (!r.ok) throw new Error("API error: " + r.statusText);
            return r.json();
          })
        ]);

        if (predRes.success && recRes.success) {
          const predData = predRes.data;
          const recData = recRes.data;

          // Display safety score and risk level
          aiScoreEl.textContent = `${predData.tourist_safety_score}% (${predData.risk_level})`;
          
          // Color code safety score pill
          const colorCat = predData.color_category;
          if (colorCat === "GREEN") {
            aiScoreEl.style.background = "#a3b899";
            aiScoreEl.style.color = "#1e281a";
          } else if (colorCat === "YELLOW") {
            aiScoreEl.style.background = "#d9c794";
            aiScoreEl.style.color = "#2d2613";
          } else { // ORANGE / RED
            aiScoreEl.style.background = "#d68970";
            aiScoreEl.style.color = "#2d1813";
          }

          // Matched area and distance details
          aiMatchedAreaEl.innerHTML = `Matched: <strong>${predData.matched_area.locality}</strong> (${predData.distance_meters}m away)`;

          // Explainable AI (XAI) factors
          aiPositivesEl.innerHTML = "";
          aiNegativesEl.innerHTML = "";

          const positives = predData.explanation.positive_factors || [];
          const negatives = predData.explanation.risk_factors || [];

          if (positives.length > 0) {
            positives.forEach(f => {
              const li = document.createElement("li");
              li.textContent = `${f.factor}: ${f.value}`;
              aiPositivesEl.appendChild(li);
            });
          } else {
            const li = document.createElement("li");
            li.textContent = "None identified";
            aiPositivesEl.appendChild(li);
          }

          if (negatives.length > 0) {
            negatives.forEach(f => {
              const li = document.createElement("li");
              li.textContent = `${f.factor}: ${f.value}`;
              aiNegativesEl.appendChild(li);
            });
          } else {
            const li = document.createElement("li");
            li.textContent = "None identified";
            aiNegativesEl.appendChild(li);
          }

          // Safer recommendations
          const recs = recData.recommendations || [];
          if (recs.length > 0) {
            aiRecsBox.style.display = "block";
            aiRecsList.innerHTML = "";
            recs.forEach(r => {
              const li = document.createElement("li");
              li.style.color = "#a3b899";
              li.style.marginBottom = "4px";
              li.innerHTML = `<strong>${r.locality}</strong> (${r.safety_score}%) <br><span class="muted" style="font-size:0.85em">${r.distance_meters}m away · ${r.risk_level}</span>`;
              aiRecsList.appendChild(li);
            });
          } else {
            aiRecsBox.style.display = "none";
          }

          // Show the result panel
          aiResultDiv.style.display = "block";
        } else {
          showBanner("danger", "Failed to retrieve safety intelligence from Python AI backend.");
        }
      } catch (err) {
        console.error(err);
        showBanner("danger", "AI Advisor is offline. Start the Python FastAPI backend on port 8000 first.");
      } finally {
        btnAiPredict.disabled = false;
        btnAiPredict.textContent = "Consult AI Advisor";
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
  });
});

