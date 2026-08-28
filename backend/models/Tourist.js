const mongoose = require('mongoose');

const TouristSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true },
    nationality: { type: String, required: true },
    idNumber: { type: String, required: true }, // passport / national ID
    emergencyContact: {
      name: String,
      phone: String,
    },
    role: { type: String, enum: ['tourist', 'admin', 'responder'], default: 'tourist' },
    digitalId: {
      chainIndex: Number,
      hash: String, // hash of the genesis block for this tourist's ID
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    tripStart: { type: Date, default: Date.now },
    tripEnd: { type: Date }, // planned trip end - digital ID can be set to expire
    status: { type: String, enum: ['active', 'inactive', 'sos'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tourist', TouristSchema);
