const express = require('express');
const {
  getMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  generateWeeklyMatch,
  voteMatchBestPlayer,
  getMatchVotes,
  getMatchVotesAdmin,
  deleteMatchVote,
} = require('../controllers/match.controller');
const protect = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', getMatches);
router.post('/generate-weekly', protect, authorizeRoles('admin'), generateWeeklyMatch);
router.post('/:id/vote', protect, voteMatchBestPlayer);
router.get('/:id/votes', protect, getMatchVotes);
router.get('/:id/votes/admin', protect, authorizeRoles('admin'), getMatchVotesAdmin);
router.delete('/:matchId/votes/:voteId', protect, authorizeRoles('admin'), deleteMatchVote);
router.get('/:id', getMatchById);
router.post('/', protect, authorizeRoles('admin'), createMatch);
router.put('/:id', protect, authorizeRoles('admin'), updateMatch);
router.delete('/:id', protect, authorizeRoles('admin'), deleteMatch);

module.exports = router;
