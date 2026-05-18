const mongoose = require('mongoose');

const matchVoteSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

matchVoteSchema.index({ matchId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MatchVote', matchVoteSchema);
