import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';

// Default leaflet marker icons don't resolve correctly under webpack/CRA
// without this fix, so we point them at the CDN explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ZONE_COLORS = { safe: '#2ecc71', danger: '#e74c3c', restricted: '#8e44ad' };

export default function MapView({ center, zoom = 14, markers = [], zones = [], height = '420px' }) {
  return (
    <div style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zones.map((zone) => (
          <Polygon
            key={zone._id}
            positions={zone.coordinates}
            pathOptions={{ color: ZONE_COLORS[zone.type] || '#3498db', fillOpacity: 0.2 }}
          >
            <Popup>{zone.name} ({zone.type}, risk: {zone.riskLevel})</Popup>
          </Polygon>
        ))}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
