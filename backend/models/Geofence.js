const mongoose = require('mongoose');

// coordinates: array of [lat, lng] points describing a polygon
const GeofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['safe', 'danger', 'restricted'], required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    coordinates: { type: [[Number]], required: true }, // [[lat,lng], [lat,lng], ...]
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Geofence', GeofenceSchema);
