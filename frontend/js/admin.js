document.addEventListener("DOMContentLoaded", async () => {
  const user = AB.requireAuth("admin");
  if (!user) return;

  document.getElementById("admin-name").textContent = user.name || "Command";
  document.getElementById("btn-logout").addEventListener("click", AB.logout);

  const ctx = ABMap.create(document.getElementById("admin-map"), {
    center: [35.0116, 135.7681],
    zoom: 12,
  });

  let tourists = [];
  let zones = [];
  let alerts = [];
  let anomalies = [];

  function paint() {
    const live = tourists.filter((t) => t.role !== "admin" && t.lat != null);
    const sosIds = new Set(alerts.filter((a) => a.status !== "resolved").map((a) => a.touristId));
    const markers = live.map((t) => ({
      id: t.id,
      lat: t.lat,
      lng: t.lng,
      label: `${t.name}${sosIds.has(t.id) ? " · SOS" : ""}${t.tracking ? " · live" : ""}`,
      kind: sosIds.has(t.id) ? "sos" : "live",
    }));
    ABMap.render(ctx, { zones, markers });

    document.getElementById("stat-tourists").textContent = tourists.filter((t) => t.role !== "admin").length;
    document.getElementById("stat-sos").textContent = alerts.filter((a) => a.status !== "resolved").length;
    document.getElementById("stat-zones").textContent = zones.length;

    const sosBox = document.getElementById("sos-list");
    const active = alerts.filter((a) => a.status !== "resolved");
    sosBox.innerHTML = active.length
      ? active.map((a) => `
        <article class="alert-card">
          <strong>${a.touristName || "Unknown traveler"}</strong>
          <p>${a.touristPhone || ""}</p>
          <p>${a.message || "Emergency SOS"}</p>
          <p class="muted">Lat ${(a.lat || 0).toFixed?.(4) || a.lat} · Lng ${(a.lng || 0).toFixed?.(4) || a.lng}</p>
          <button class="btn btn-moss btn-sm" data-resolve="${a.id}">Mark resolved</button>
        </article>`).join("")
      : `<p class="muted">The garden is quiet. No active distress calls.</p>`;

    sosBox.querySelectorAll("[data-resolve]").forEach((btn) => {
      btn.addEventListener("click", () => resolveAlert(btn.getAttribute("data-resolve")));
    });

    document.getElementById("anomaly-list").innerHTML = anomalies.length
      ? anomalies.map((a) => `<li>${a.touristName || "Traveler"} — ${a.reason}<br><span class="muted">${AB.formatTime(a.createdAt)}</span></li>`).join("")
      : `<li class="muted">No anomalies detected.</li>`;

    document.getElementById("tourist-list").innerHTML = tourists.filter((t) => t.role !== "admin").map((t) => `
      <li class="tourist-row">
        <span>${t.name} · ${t.status || "active"}</span>
        <span class="muted">${t.tracking ? "live" : "quiet"}</span>
      </li>`).join("") || `<li class="muted">No registered travelers.</li>`;
  }

  async function refresh() {
    const [t, z, s, a] = await Promise.all([
      AB.listTable("tourists"),
      AB.listTable("geofences"),
      AB.listTable("sos"),
      AB.listTable("anomalies"),
    ]);
    tourists = t;
    zones = z;
    alerts = s;
    anomalies = a.sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt))).slice(0, 20);
    paint();
  }

  async function resolveAlert(id) {
    try {
      await AB.patchRow("sos", id, { status: "resolved" });
    } catch { /* local */ }
    alerts = alerts.map((a) => a.id === id ? { ...a, status: "resolved" } : a);
    paint();
  }

  document.getElementById("zone-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("zone-error");
    errorEl.textContent = "";
    const coordsRaw = document.getElementById("zone-coords").value;
    const coordinates = coordsRaw.split(";").map((pair) => pair.trim()).filter(Boolean)
      .map((pair) => pair.split(",").map((n) => parseFloat(n.trim())));
    if (coordinates.length < 3 || coordinates.some((p) => p.length !== 2 || p.some((n) => Number.isNaN(n)))) {
      errorEl.textContent = "Enter at least three lat,lng points separated by semicolons.";
      return;
    }
    const body = {
      name: document.getElementById("zone-name").value.trim(),
      type: document.getElementById("zone-type").value,
      riskLevel: document.getElementById("zone-risk").value,
      coordinates: JSON.stringify(coordinates),
      description: document.getElementById("zone-desc").value.trim(),
    };
    try {
      const created = await AB.createRow("geofences", body);
      zones = [...zones, created];
    } catch {
      zones = [...zones, { ...body, id: "local-zone-" + Date.now() }];
    }
    e.target.reset();
    paint();
  });

  await refresh();
  setInterval(refresh, 5000);
});
