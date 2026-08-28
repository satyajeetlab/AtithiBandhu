const express = require('express');
const Tourist = require('../models/Tourist');
const LocationLog = require('../models/LocationLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isChainValid } = require('../utils/blockchain');

const router = express.Router();

// GET /api/tourist/me
router.get('/me', requireAuth, async (req, res) => {
  const tourist = await Tourist.findById(req.user.id).select('-passwordHash');
  if (!tourist) return res.status(404).json({ message: 'Not found' });
  res.json(tourist);
});

// GET /api/tourist/digital-id/verify -> verifies the whole ledger's integrity
router.get('/digital-id/verify', requireAuth, async (req, res) => {
  const result = await isChainValid();
  res.json(result);
});

// GET /api/tourist  (admin: list all tourists with last known location)
router.get('/', requireAuth, requireRole('admin', 'responder'), async (req, res) => {
  const tourists = await Tourist.find().select('-passwordHash');
  res.json(tourists);
});

// GET /api/tourist/:id/history  (admin: location trail for one tourist)
router.get('/:id/history', requireAuth, requireRole('admin', 'responder'), async (req, res) => {
  const logs = await LocationLog.find({ tourist: req.params.id }).sort({ timestamp: -1 }).limit(200);
  res.json(logs);
});

module.exports = router;
