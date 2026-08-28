/* Leaflet map wrapper with sakura-tinted markers and geofence polygons */

const ABMap = (() => {
  const ZONE_COLORS = {
    safe: "#6b7f5a",
    danger: "#9b3048",
    restricted: "#6b3a78",
  };

  function icon(kind, label) {
    const cls = kind === "sos" ? "marker-sos" : kind === "you" ? "marker-you" : "marker-live";
    return L.divIcon({
      className: "",
      html: `<div class="${cls}" title="${label || ""}" style="width:16px;height:16px"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  function create(el, options = {}) {
    const map = L.map(el, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView(options.center || [35.0116, 135.7681], options.zoom || 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 80);
    return { map, layer };
  }

  function render(ctx, { markers = [], zones = [], fit = false } = {}) {
    ctx.layer.clearLayers();
    zones.forEach((zone) => {
      const coords = AB.parseCoords(zone.coordinates);
      if (coords.length < 3) return;
      const color = ZONE_COLORS[zone.type] || "#c97b93";
      const poly = L.polygon(coords, {
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.18,
      }).bindPopup(`<strong>${zone.name}</strong><br>${zone.type} · ${zone.riskLevel}${zone.description ? "<br>" + zone.description : ""}`);
      ctx.layer.addLayer(poly);
    });
    markers.forEach((m) => {
      if (m.lat == null || m.lng == null) return;
      const kind = m.kind || "live";
      const marker = L.marker([m.lat, m.lng], { icon: icon(kind, m.label) })
        .bindPopup(m.label || "Traveler");
      ctx.layer.addLayer(marker);
    });
    if (fit && (markers.length || zones.length)) {
      const pts = [];
      markers.forEach((m) => { if (m.lat != null) pts.push([m.lat, m.lng]); });
      zones.forEach((z) => AB.parseCoords(z.coordinates).forEach((p) => pts.push(p)));
      if (pts.length) ctx.map.fitBounds(pts, { padding: [32, 32], maxZoom: 15 });
    }
  }

  return { create, render };
})();
