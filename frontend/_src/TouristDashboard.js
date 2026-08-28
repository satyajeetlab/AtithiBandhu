import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import MapView from '../components/MapView';
import SOSButton from '../components/SOSButton';
import { useAuth } from '../context/AuthContext';

// Core "real-time live location" screen. Uses the browser Geolocation API's
// watchPosition to continuously track the device, streams every fix to the
// backend over the socket, and reacts to geofence alerts pushed back down.
export default function TouristDashboard() {
  const { user, logout } = useAuth();
  const [position, setPosition] = useState(null);
  const [zones, setZones] = useState([]);
  const [alert, setAlert] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [locationError, setLocationError] = useState('');
  const watchIdRef = useRef(null);

  useEffect(() => {
    api.get('/geofence').then((res) => setZones(res.data)).catch(() => {});

    const socket = getSocket();
    socket.on('geofence:alert', (data) => {
      setAlert(data);
      setTimeout(() => setAlert(null), 8000);
    });

    return () => {
      socket.off('geofence:alert');
    };
  }, []);

  function startTracking() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        const point = { lat: latitude, lng: longitude };
        setPosition(point);
        setLocationError('');
        getSocket().emit('location:update', { lat: latitude, lng: longitude, accuracy, speed });
      },
      (err) => setLocationError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = id;
    setTracking(true);
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }

  useEffect(() => () => stopTracking(), []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Welcome, {user?.name}</h2>
          <p className="digital-id">Digital ID hash: {user?.digitalId?.hash?.slice(0, 16)}...</p>
        </div>
        <button onClick={logout} className="secondary">Logout</button>
      </header>

      {alert && (
        <div className={`banner banner-${alert.type}`}>
          {alert.message}
        </div>
      )}
      {locationError && <div className="banner banner-danger">{locationError}</div>}

      <div className="tracking-controls">
        {!tracking ? (
          <button onClick={startTracking}>Start Live Location Sharing</button>
        ) : (
          <button className="secondary" onClick={stopTracking}>Stop Sharing</button>
        )}
        <SOSButton position={position} />
      </div>

      <MapView
        center={position ? [position.lat, position.lng] : [20.5937, 78.9629]}
        zoom={position ? 15 : 5}
        zones={zones}
        markers={position ? [{ id: 'me', lat: position.lat, lng: position.lng, label: 'You are here' }] : []}
      />

      {position && (
        <p className="coords">Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}</p>
      )}
    </div>
  );
}
