const express = require('express');
const SOSAlert = require('../models/SOSAlert');
const Tourist = require('../models/Tourist');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/sos - REST fallback for triggering SOS (primary path is the socket event,
// this exists so it still works in flaky/low-connectivity conditions with a simple fetch/retry).
router.post('/', requireAuth, async (req, res) => {
  try {
    const { lat, lng, message } = req.body;
    const alert = await SOSAlert.create({
      tourist: req.user.id,
      location: { lat, lng },
      message,
      status: 'active',
    });
    await Tourist.findByIdAndUpdate(req.user.id, { status: 'sos' });

    const io = req.app.get('io');
    if (io) io.to('admins').emit('sos:alert', await alert.populate('tourist', 'name phone nationality emergencyContact'));

    res.status(201).json(alert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating SOS alert' });
  }
});

// GET /api/sos/active - admin/responder
router.get('/active', requireAuth, requireRole('admin', 'responder'), async (req, res) => {
  const alerts = await SOSAlert.find({ status: { $ne: 'resolved' } })
    .populate('tourist', 'name phone nationality emergencyContact')
    .sort({ createdAt: -1 });
  res.json(alerts);
});

// PATCH /api/sos/:id - admin/responder updates status
router.patch('/:id', requireAuth, requireRole('admin', 'responder'), async (req, res) => {
  const { status } = req.body;
  const alert = await SOSAlert.findByIdAndUpdate(
    req.params.id,
    { status, respondedBy: req.user.id },
    { new: true }
  );
  if (status === 'resolved' && alert) {
    await Tourist.findByIdAndUpdate(alert.tourist, { status: 'active' });
  }
  res.json(alert);
});

module.exports = router;
