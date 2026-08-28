const crypto = require('crypto');
const Block = require('../models/Block');

function computeHash({ index, timestamp, data, previousHash }) {
  return crypto
    .createHash('sha256')
    .update(index + JSON.stringify(data) + previousHash + timestamp)
    .digest('hex');
}

// Creates the very first block in the whole ledger if it doesn't exist yet.
async function ensureGenesisBlock() {
  const existing = await Block.findOne({ index: 0 });
  if (existing) return existing;

  const genesisData = { note: 'AtithiBandhu Genesis Block' };
  const timestamp = new Date();
  const hash = computeHash({ index: 0, timestamp, data: genesisData, previousHash: '0' });

  return Block.create({ index: 0, timestamp, data: genesisData, previousHash: '0', hash });
}

// Appends a new block recording a tourist identity event (registration,
// check-in, trip-end, etc). Returns the created block.
async function addBlock(data) {
  await ensureGenesisBlock();
  const lastBlock = await Block.findOne().sort({ index: -1 });
  const index = lastBlock.index + 1;
  const timestamp = new Date();
  const previousHash = lastBlock.hash;
  const hash = computeHash({ index, timestamp, data, previousHash });

  const block = await Block.create({ index, timestamp, data, previousHash, hash });
  return block;
}

// Walks the entire chain and re-derives each hash to confirm nothing has
// been tampered with. Used to "verify" a tourist's digital ID on demand.
async function isChainValid() {
  const blocks = await Block.find().sort({ index: 1 });
  for (let i = 1; i < blocks.length; i++) {
    const current = blocks[i];
    const previous = blocks[i - 1];

    const recomputed = computeHash({
      index: current.index,
      timestamp: current.timestamp,
      data: current.data,
      previousHash: current.previousHash,
    });

    if (recomputed !== current.hash) return { valid: false, brokenAt: current.index, reason: 'hash mismatch' };
    if (current.previousHash !== previous.hash) return { valid: false, brokenAt: current.index, reason: 'chain link broken' };
  }
  return { valid: true };
}

module.exports = { addBlock, isChainValid, ensureGenesisBlock, computeHash };
