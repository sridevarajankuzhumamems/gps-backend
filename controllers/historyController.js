const SharingHistory = require('../models/SharingHistory');

exports.getHistory = async (req, res) => {
  try {
    const history = await SharingHistory.getAll();
    res.json(history);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
