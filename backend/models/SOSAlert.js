const mongoose = require('mongoose');

const SOSAlertSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true },
    location: {
      lat: Number,
      lng: Number,
    },
    message: String,
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SOSAlert', SOSAlertSchema);
