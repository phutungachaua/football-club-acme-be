const mongoose = require('mongoose');
const Match = require('../models/Match');
const MatchVote = require('../models/MatchVote');
const Member = require('../models/Member');

const calculateVoteTimes = (matchDate) => {
  const matchTime = new Date(matchDate).getTime();

  return {
    voteOpenAt: new Date(matchTime + 90 * 60 * 1000),
    voteCloseAt: new Date(matchTime + 50 * 60 * 60 * 1000),
  };
};

const getVoteStatus = (matchDate) => {
  const { voteOpenAt, voteCloseAt } = calculateVoteTimes(matchDate);
  const now = new Date();

  if (now < voteOpenAt) {
    return 'not_open';
  }

  if (now < voteCloseAt) {
    return 'open';
  }

  return 'closed';
};

const getMatchObjectId = (matchId) => {
  return typeof matchId === 'string' ? new mongoose.Types.ObjectId(matchId) : matchId;
};

const getVoteSummary = async (matchId) => {
  const matchObjectId = getMatchObjectId(matchId);
  const summary = await MatchVote.aggregate([
    {
      $match: {
        matchId: matchObjectId,
      },
    },
    {
      $group: {
        _id: '$memberId',
        votes: { $sum: 1 },
      },
    },
    {
      $sort: {
        votes: -1,
      },
    },
  ]);

  const memberIds = summary.map((item) => item._id);
  const members = await Member.find({ _id: { $in: memberIds } }).select(
    '_id name avatarUrl shirtNumber position'
  );
  const memberMap = new Map(members.map((member) => [member._id.toString(), member]));

  return summary.map((item) => ({
    member: memberMap.get(item._id.toString()) || item._id,
    votes: item.votes,
  }));
};

const closeVotingAndUpdateBestPlayers = async (matchId) => {
  const matchObjectId = getMatchObjectId(matchId);
  const summary = await MatchVote.aggregate([
    {
      $match: {
        matchId: matchObjectId,
      },
    },
    {
      $group: {
        _id: '$memberId',
        votes: { $sum: 1 },
      },
    },
    {
      $sort: {
        votes: -1,
      },
    },
  ]);

  let bestPlayers = [];

  if (summary.length > 0) {
    const highestVotes = summary[0].votes;
    bestPlayers = summary
      .filter((item) => item.votes === highestVotes)
      .map((item) => item._id);
  }

  const match = await Match.findByIdAndUpdate(
    matchObjectId,
    {
      bestPlayers,
      voteStatus: 'closed',
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return match;
};

const syncMatchVoteStatus = async (match) => {
  if (!match) {
    return match;
  }

  const { voteOpenAt, voteCloseAt } = calculateVoteTimes(match.matchDate);
  const nextVoteStatus = getVoteStatus(match.matchDate);

  if (nextVoteStatus === 'closed') {
    const closedMatch = await closeVotingAndUpdateBestPlayers(match._id);

    if (closedMatch) {
      closedMatch.voteOpenAt = voteOpenAt;
      closedMatch.voteCloseAt = voteCloseAt;
    }

    await Match.updateOne(
      { _id: match._id },
      {
        voteOpenAt,
        voteCloseAt,
        voteStatus: 'closed',
      }
    );

    return closedMatch;
  }

  if (
    !match.voteOpenAt ||
    !match.voteCloseAt ||
    match.voteStatus !== nextVoteStatus ||
    match.voteOpenAt.getTime() !== voteOpenAt.getTime() ||
    match.voteCloseAt.getTime() !== voteCloseAt.getTime()
  ) {
    await Match.updateOne(
      { _id: match._id },
      {
        voteOpenAt,
        voteCloseAt,
        voteStatus: nextVoteStatus,
      }
    );
    match.voteOpenAt = voteOpenAt;
    match.voteCloseAt = voteCloseAt;
    match.voteStatus = nextVoteStatus;
  }

  return match;
};

module.exports = {
  calculateVoteTimes,
  syncMatchVoteStatus,
  closeVotingAndUpdateBestPlayers,
  getVoteSummary,
};
