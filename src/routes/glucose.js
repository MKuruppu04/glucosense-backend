const express = require('express');
const {
  addReading,
  getReadings,
  getStats,
  deleteReading,
  updateAlertSettings,
  updateGuardians,
} = require('../controllers/glucoseController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .get(getReadings)
  .post(addReading);

router.get('/stats', getStats);
router.delete('/:id', deleteReading);
router.put('/alert-settings', updateAlertSettings);
router.put('/guardians', updateGuardians);

module.exports = router;
