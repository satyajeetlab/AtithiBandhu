const mongoose = require('mongoose');

const LocationLogSchema = new mongoose.Schema({
  tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true, index: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: Number,
  speed: Number,
  timestamp: { type: Date, default: Date.now, index: true },
  zoneStatus: { type: String, enum: ['safe', 'danger', 'restricted', 'unzoned'], default: 'unzoned' },
  anomaly: { type: Boolean, default: false },
  anomalyReason: String,
});

module.exports = mongoose.model('LocationLog', LocationLogSchema);
