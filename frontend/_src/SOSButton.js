import { useState } from 'react';
import { getSocket } from '../services/socket';

// Big panic button. Sends the tourist's last known coordinates via the
// live socket connection so the admin dashboard gets it instantly.
export default function SOSButton({ position }) {
  const [sent, setSent] = useState(false);
  const [ack, setAck] = useState('');

  function trigger() {
    const socket = getSocket();
    socket.emit('sos:trigger', {
      lat: position?.lat,
      lng: position?.lng,
      message: 'Emergency SOS triggered by tourist',
    });
    socket.once('sos:ack', (data) => setAck(data.message));
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  }

  return (
    <div className="sos-wrap">
      <button className="sos-button" onClick={trigger}>
        {sent ? 'SOS SENT' : 'SOS'}
      </button>
      {ack && <p className="sos-ack">{ack}</p>}
    </div>
  );
}
