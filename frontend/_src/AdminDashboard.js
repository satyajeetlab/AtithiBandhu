import { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tourists, setTourists] = useState([]); // list from DB
  const [liveLocations, setLiveLocations] = useState({}); // touristId -> {lat,lng}
  const [zones, setZones] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [zoneForm, setZoneForm] = useState({ name: '', type: 'danger', riskLevel: 'high', coords: '' });

  useEffect(() => {
    api.get('/tourist').then((res) => setTourists(res.data)).catch(() => {});
    api.get('/geofence').then((res) => setZones(res.data)).catch(() => {});
    api.get('/sos/active').then((res) => setSosAlerts(res.data)).catch(() => {});

    const socket = getSocket();

    socket.on('admin:touristUpdate', (data) => {
      setLiveLocations((prev) => ({ ...prev, [data.touristId]: data }));
    });

    socket.on('sos:alert', (alert) => {
      setSosAlerts((prev) => [alert, ...prev]);
    });

    socket.on('admin:anomaly', (data) => {
      setAnomalies((prev) => [data, ...prev].slice(0, 20));
    });

    socket.on('admin:geofenceBreach', (data) => {
      setAnomalies((prev) => [{ ...data, reason: `Entered ${data.type} zone: ${data.zone}` }, ...prev].slice(0, 20));
    });

    return () => {
      socket.off('admin:touristUpdate');
      socket.off('sos:alert');
      socket.off('admin:anomaly');
      socket.off('admin:geofenceBreach');
    };
  }, []);

  async function resolveAlert(id) {
    await api.patch(`/sos/${id}`, { status: 'resolved' });
    setSosAlerts((prev) => prev.filter((a) => a._id !== id));
  }

  async function createZone(e) {
    e.preventDefault();
    // coords entered as "lat,lng; lat,lng; lat,lng"
    const coordinates = zoneForm.coords
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => pair.split(',').map((n) => parseFloat(n.trim())));

    const { data } = await api.post('/geofence', {
      name: zoneForm.name,
      type: zoneForm.type,
      riskLevel: zoneForm.riskLevel,
      coordinates,
    });
    setZones((prev) => [...prev, data]);
    setZoneForm({ name: '', type: 'danger', riskLevel: 'high', coords: '' });
  }

  const markers = Object.entries(liveLocations).map(([id, loc]) => {
    const tourist = tourists.find((t) => t._id === id);
    return { id, lat: loc.lat, lng: loc.lng, label: tourist ? tourist.name : id };
  });

  return (
    <div className="dashboard admin">
      <header className="dashboard-header">
        <h2>AtithiBandhu — Command Center</h2>
        <div>
          <span className="badge">{user?.name} (admin)</span>
          <button onClick={logout} className="secondary">Logout</button>
        </div>
      </header>

      <div className="admin-grid">
        <div className="admin-map">
          <MapView center={[20.5937, 78.9629]} zoom={5} zones={zones} markers={markers} height="500px" />
        </div>

        <div className="admin-panel">
          <section>
            <h3>Active SOS Alerts ({sosAlerts.length})</h3>
            {sosAlerts.length === 0 && <p className="muted">No active alerts.</p>}
            {sosAlerts.map((a) => (
              <div key={a._id} className="alert-card">
                <strong>{a.tourist?.name}</strong> — {a.tourist?.phone}
                <p>{a.message}</p>
                <p className="muted">Lat {a.location?.lat?.toFixed(4)}, Lng {a.location?.lng?.toFixed(4)}</p>
                <button onClick={() => resolveAlert(a._id)}>Mark Resolved</button>
              </div>
            ))}
          </section>

          <section>
            <h3>Anomaly / Geofence Feed</h3>
            {anomalies.length === 0 && <p className="muted">No anomalies detected.</p>}
            <ul className="feed">
              {anomalies.map((a, i) => (
                <li key={i}>Tourist {String(a.touristId).slice(-6)}: {a.reason}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Create Geofence Zone</h3>
            <form onSubmit={createZone} className="zone-form">
              <input placeholder="Zone name" value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} required />
              <select value={zoneForm.type} onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value })}>
                <option value="safe">Safe</option>
                <option value="danger">Danger</option>
                <option value="restricted">Restricted</option>
              </select>
              <select value={zoneForm.riskLevel} onChange={(e) => setZoneForm({ ...zoneForm, riskLevel: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <textarea
                placeholder="Polygon points as: lat,lng; lat,lng; lat,lng (min 3)"
                value={zoneForm.coords}
                onChange={(e) => setZoneForm({ ...zoneForm, coords: e.target.value })}
                required
              />
              <button type="submit">Add Zone</button>
            </form>
          </section>

          <section>
            <h3>Registered Tourists ({tourists.length})</h3>
            <ul className="feed">
              {tourists.map((t) => (
                <li key={t._id}>
                  {t.name} — {t.status}
                  {liveLocations[t._id] ? ' (live)' : ''}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
