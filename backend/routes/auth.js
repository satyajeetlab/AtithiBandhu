const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tourist = require('../models/Tourist');
const { addBlock } = require('../utils/blockchain');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, nationality, idNumber, emergencyContact, role, tripEnd } = req.body;

    if (!name || !email || !password || !phone || !nationality || !idNumber) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existing = await Tourist.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    const tourist = await Tourist.create({
      name,
      email,
      passwordHash,
      phone,
      nationality,
      idNumber,
      emergencyContact,
      role: role === 'admin' ? 'admin' : 'tourist', // admins should really be seeded, not self-registered in prod
      tripEnd,
    });

    // Record identity creation as an immutable block in the ledger.
    const block = await addBlock({
      touristId: tourist._id.toString(),
      idNumber: tourist.idNumber,
      action: 'IDENTITY_CREATED',
    });

    tourist.digitalId = { chainIndex: block.index, hash: block.hash };
    await tourist.save();

    const token = jwt.sign({ id: tourist._id, role: tourist.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      tourist: {
        id: tourist._id,
        name: tourist.name,
        email: tourist.email,
        role: tourist.role,
        digitalId: tourist.digitalId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tourist = await Tourist.findOne({ email: email?.toLowerCase() });
    if (!tourist) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, tourist.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: tourist._id, role: tourist.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      tourist: {
        id: tourist._id,
        name: tourist.name,
        email: tourist.email,
        role: tourist.role,
        digitalId: tourist.digitalId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
