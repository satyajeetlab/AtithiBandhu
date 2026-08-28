const jwt = require('jsonwebtoken');
const Tourist = require('../models/Tourist');
const LocationLog = require('../models/LocationLog');
const Geofence = require('../models/Geofence');
const SOSAlert = require('../models/SOSAlert');
const { classifyZone, distanceMeters } = require('../utils/geoUtils');

const ANOMALY_JUMP_METERS = Number(process.env.ANOMALY_JUMP_METERS || 1000);

// Keep last-seen location + timestamp per socket in memory to detect
// "teleport" style anomalies (GPS spoofing / bad fixes) without a DB round trip.
const lastFix = new Map(); // touristId -> { lat, lng, timestamp }

function initLocationSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role }
      next();
    } catch (err) {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;

    if (role === 'admin' || role === 'responder') {
      socket.join('admins');
    } else {
      socket.join(`tourist:${id}`);
    }

    console.log(`[socket] connected: ${role} ${id}`);

    // Tourist device streams live GPS fixes here.
    socket.on('location:update', async (payload) => {
      try {
        const { lat, lng, accuracy, speed } = payload;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        const now = new Date();
        let anomaly = false;
        let anomalyReason = null;

        const prev = lastFix.get(id);
        if (prev) {
          const dist = distanceMeters(prev.lat, prev.lng, lat, lng);
          const seconds = (now - prev.timestamp) / 1000;
          // Flag if the device jumped an implausible distance in a short window.
          if (seconds < 5 && dist > ANOMALY_JUMP_METERS) {
            anomaly = true;
            anomalyReason = `Jumped ${Math.round(dist)}m in ${seconds.toFixed(1)}s`;
          }
        }
        lastFix.set(id, { lat, lng, timestamp: now });

        const geofences = await Geofence.find();
        const zone = classifyZone(lat, lng, geofences);
        const zoneStatus = zone ? zone.type : 'unzoned';

        await LocationLog.create({
          tourist: id,
          lat,
          lng,
          accuracy,
          speed,
          timestamp: now,
          zoneStatus,
          anomaly,
          anomalyReason,
        });

        await Tourist.findByIdAndUpdate(id, {
          currentLocation: { lat, lng, updatedAt: now },
        });

        // Push the update to the admin dashboard's live map.
        io.to('admins').emit('admin:touristUpdate', {
          touristId: id,
          lat,
          lng,
          timestamp: now,
          zoneStatus,
          anomaly,
          anomalyReason,
        });

        // Warn the tourist themselves if they've entered a danger/restricted zone.
        if (zone && zone.type !== 'safe') {
          socket.emit('geofence:alert', {
            zone: zone.name,
            type: zone.type,
            riskLevel: zone.riskLevel,
            message: `You have entered a ${zone.type} zone: ${zone.name}`,
          });
          io.to('admins').emit('admin:geofenceBreach', {
            touristId: id,
            zone: zone.name,
            type: zone.type,
            lat,
            lng,
            timestamp: now,
          });
        }

        if (anomaly) {
          io.to('admins').emit('admin:anomaly', { touristId: id, lat, lng, reason: anomalyReason, timestamp: now });
        }
      } catch (err) {
        console.error('[socket location:update]', err.message);
      }
    });

    // Panic button.
    socket.on('sos:trigger', async (payload) => {
      try {
        const { lat, lng, message } = payload || {};
        const alert = await SOSAlert.create({
          tourist: id,
          location: { lat, lng },
          message: message || 'SOS triggered',
          status: 'active',
        });
        await Tourist.findByIdAndUpdate(id, { status: 'sos' });

        const populated = await alert.populate('tourist', 'name phone nationality emergencyContact');
        io.to('admins').emit('sos:alert', populated);
        socket.emit('sos:ack', { alertId: alert._id, message: 'SOS received, help is on the way.' });
      } catch (err) {
        console.error('[socket sos:trigger]', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${role} ${id}`);
    });
  });
}

module.exports = initLocationSocket;
