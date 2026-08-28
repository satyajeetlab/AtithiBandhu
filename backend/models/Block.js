// A minimal append-only hash-chained ledger that simulates a permissioned
// blockchain for tourist digital IDs. Each block references the hash of the
// previous block, so any tampering with historical data is detectable by
// re-computing hashes down the chain (see utils/blockchain.js -> isChainValid).
const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  index: { type: Number, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  data: { type: mongoose.Schema.Types.Mixed, required: true }, // { touristId, idNumber, action }
  previousHash: { type: String, required: true },
  hash: { type: String, required: true },
});

module.exports = mongoose.model('Block', BlockSchema);
