const express = require('express');
const Geofence = require('../models/Geofence');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/geofence - everyone (tourists need this to render zones on their own map)
router.get('/', requireAuth, async (req, res) => {
  const zones = await Geofence.find();
  res.json(zones);
});

// POST /api/geofence - admin only
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, type, riskLevel, coordinates, description } = req.body;
    if (!name || !type || !coordinates || coordinates.length < 3) {
      return res.status(400).json({ message: 'name, type and >=3 coordinate points are required' });
    }
    const zone = await Geofence.create({
      name,
      type,
      riskLevel,
      coordinates,
      description,
      createdBy: req.user.id,
    });
    res.status(201).json(zone);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating geofence' });
  }
});

// DELETE /api/geofence/:id - admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await Geofence.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
