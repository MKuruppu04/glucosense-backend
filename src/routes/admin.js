const express = require('express');
const {
  login,
  getAllUsers,
  getUser,
  getUserGlucoseData,
  getAllAlerts,
  getSystemStats,
  createTeamMember,
  exportData,
} = require('../controllers/adminController');
const { protectAdmin, authorize } = require('../middleware/auth');

const router = express.Router();

// Public admin route
router.post('/login', login);

// Protected admin routes
router.use(protectAdmin);

router.get('/stats', getSystemStats);
router.get('/alerts', authorize('manageAlerts', 'viewAnalytics'), getAllAlerts);

router.get('/users', authorize('viewAllUsers'), getAllUsers);
router.get('/users/:id', authorize('viewAllUsers'), getUser);
router.get('/users/:id/glucose', authorize('viewHealthData'), getUserGlucoseData);

router.post('/team', authorize('manageTeam'), createTeamMember);
router.get('/export', authorize('exportData'), exportData);

module.exports = router;
