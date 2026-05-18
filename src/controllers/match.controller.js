const Match = require('../models/Match');
const Member = require('../models/Member');
const MatchVote = require('../models/MatchVote');
const { createWeeklyThursdayMatch } = require('../services/matchScheduler.service');
const {
  calculateVoteTimes,
  syncMatchVoteStatus,
  closeVotingAndUpdateBestPlayers,
  getVoteSummary,
} = require('../services/matchVote.service');

const bestPlayersPopulate = '_id name avatarUrl shirtNumber position';
const userPopulate = '_id name username role avatar isActive';

const getSyncedMatchStatus = (matchDate) => {
  return new Date(matchDate) > new Date() ? 'next' : 'past';
};

const syncAllMatchStatuses = async () => {
  const now = new Date();

  await Match.updateMany(
    {
      matchDate: { $gt: now },
      matchStatus: { $ne: 'next' },
    },
    {
      matchStatus: 'next',
    }
  );

  await Match.updateMany(
    {
      matchDate: { $lt: now },
      matchStatus: { $ne: 'past' },
    },
    {
      matchStatus: 'past',
    }
  );
};

const syncMatchStatus = async (match) => {
  if (!match) {
    return match;
  }

  const nextStatus = getSyncedMatchStatus(match.matchDate);

  if (match.matchStatus !== nextStatus) {
    match.matchStatus = nextStatus;
    await Match.updateOne({ _id: match._id }, { matchStatus: nextStatus });
  }

  return match;
};

const populateMatch = (query) => {
  return query
    .populate('bestPlayers', bestPlayersPopulate)
    .populate('createdBy', userPopulate)
    .populate('updatedBy', userPopulate);
};

const validateBestPlayers = async (bestPlayers) => {
  if (bestPlayers === undefined) {
    return null;
  }

  if (!Array.isArray(bestPlayers)) {
    return 'bestPlayers phải là array';
  }

  const count = await Member.countDocuments({
    _id: {
      $in: bestPlayers,
    },
  });

  if (count !== bestPlayers.length) {
    return 'bestPlayers chứa Member không tồn tại';
  }

  return null;
};

const validateHighlights = (highlights) => {
  if (highlights === undefined) {
    return null;
  }

  if (!Array.isArray(highlights)) {
    return 'highlights phải là array';
  }

  return null;
};

const buildMatchFilter = (query) => {
  const filter = {};

  if (query.matchStatus) {
    filter.matchStatus = query.matchStatus;
  }

  if (query.resultStatus) {
    filter.resultStatus = query.resultStatus;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (query.fromDate || query.toDate) {
    filter.matchDate = {};

    if (query.fromDate) {
      filter.matchDate.$gte = new Date(query.fromDate);
    }

    if (query.toDate) {
      filter.matchDate.$lte = new Date(query.toDate);
    }
  }

  if (query.keyword) {
    filter.$or = [
      { title: { $regex: query.keyword, $options: 'i' } },
      { opponent: { $regex: query.keyword, $options: 'i' } },
      { location: { $regex: query.keyword, $options: 'i' } },
    ];
  }

  return filter;
};

const syncMatchesForResponse = async (matches) => {
  await Promise.all(
    matches.map(async (match) => {
      await syncMatchStatus(match);
      await syncMatchVoteStatus(match);
    })
  );

  return populateMatch(Match.find({ _id: { $in: matches.map((match) => match._id) } })).sort({
    matchDate: -1,
  });
};

const getMatches = async (req, res) => {
  try {
    await syncAllMatchStatuses();

    const matches = await Match.find(buildMatchFilter(req.query)).sort({ matchDate: -1 });
    const syncedMatches = await syncMatchesForResponse(matches);

    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách trận đấu thành công',
      data: syncedMatches,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    await syncMatchStatus(match);
    await syncMatchVoteStatus(match);
    const syncedMatch = await populateMatch(Match.findById(req.params.id));

    res.status(200).json({
      status: 200,
      message: 'Lấy thông tin trận đấu thành công',
      data: syncedMatch,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const createMatch = async (req, res) => {
  try {
    const { title, matchDate } = req.body;

    if (!title || !matchDate) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng nhập title và matchDate',
      });
    }

    const bestPlayersError = await validateBestPlayers(req.body.bestPlayers || []);
    const highlightsError = validateHighlights(req.body.highlights);

    if (bestPlayersError || highlightsError) {
      return res.status(400).json({
        status: 400,
        message: bestPlayersError || highlightsError,
      });
    }

    const { voteOpenAt, voteCloseAt } = calculateVoteTimes(matchDate);
    const match = await Match.create({
      ...req.body,
      matchStatus: getSyncedMatchStatus(matchDate),
      voteOpenAt,
      voteCloseAt,
      voteStatus: new Date() < voteOpenAt ? 'not_open' : new Date() < voteCloseAt ? 'open' : 'closed',
      homeScore: req.body.homeScore || 0,
      awayScore: req.body.awayScore || 0,
      bestPlayers: req.body.bestPlayers || [],
      createdBy: req.user._id,
    });

    res.status(200).json({
      status: 200,
      message: 'Tạo trận đấu thành công',
      data: match,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const updateMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    const bestPlayersError = await validateBestPlayers(req.body.bestPlayers);
    const highlightsError = validateHighlights(req.body.highlights);

    if (bestPlayersError || highlightsError) {
      return res.status(400).json({
        status: 400,
        message: bestPlayersError || highlightsError,
      });
    }

    const updateData = { ...req.body };
    delete updateData.createdBy;

    if (updateData.matchDate || match.matchDate) {
      const nextMatchDate = updateData.matchDate || match.matchDate;
      const { voteOpenAt, voteCloseAt } = calculateVoteTimes(nextMatchDate);
      updateData.matchStatus = getSyncedMatchStatus(nextMatchDate);
      updateData.voteOpenAt = voteOpenAt;
      updateData.voteCloseAt = voteCloseAt;
      updateData.voteStatus =
        new Date() < voteOpenAt ? 'not_open' : new Date() < voteCloseAt ? 'open' : 'closed';
    }

    updateData.updatedBy = req.user._id;

    const updatedMatch = await populateMatch(
      Match.findByIdAndUpdate(match._id, updateData, {
        new: true,
        runValidators: true,
      })
    );

    res.status(200).json({
      status: 200,
      message: 'Cập nhật trận đấu thành công',
      data: updatedMatch,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    await MatchVote.deleteMany({ matchId: match._id });

    res.status(200).json({
      status: 200,
      message: 'Xóa trận đấu thành công',
      data: match,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const generateWeeklyMatch = async (req, res) => {
  try {
    const result = await createWeeklyThursdayMatch();

    res.status(200).json({
      status: 200,
      message: result.created
        ? 'Tạo lịch trận đấu hàng tuần thành công'
        : 'Lịch trận đấu tuần này đã tồn tại',
      data: result.match,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const voteMatchBestPlayer = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    await syncMatchVoteStatus(match);
    const syncedMatch = await Match.findById(match._id);

    if (syncedMatch.voteStatus === 'not_open' || new Date() < syncedMatch.voteOpenAt) {
      return res.status(400).json({
        status: 400,
        message: 'Chưa đến thời gian mở bình chọn',
      });
    }

    if (syncedMatch.voteStatus === 'closed' || new Date() >= syncedMatch.voteCloseAt) {
      return res.status(400).json({
        status: 400,
        message: 'Thời gian bình chọn đã kết thúc',
      });
    }

    const member = await Member.findById(req.body.memberId);

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Cầu thủ không tồn tại',
      });
    }

    const existingVote = await MatchVote.findOne({
      matchId: syncedMatch._id,
      userId: req.user._id,
    });

    let vote;
    let message = 'Bình chọn thành công';

    if (existingVote) {
      existingVote.memberId = member._id;
      vote = await existingVote.save();
      message = 'Cập nhật bình chọn thành công';
    } else {
      vote = await MatchVote.create({
        matchId: syncedMatch._id,
        userId: req.user._id,
        memberId: member._id,
      });
    }

    const summary = await getVoteSummary(syncedMatch._id);

    res.status(200).json({
      status: 200,
      message,
      data: {
        voteOpenAt: syncedMatch.voteOpenAt,
        voteCloseAt: syncedMatch.voteCloseAt,
        voteStatus: syncedMatch.voteStatus,
        myVote: vote.memberId,
        summary,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 400,
        message: 'Bạn đã bình chọn trận đấu này',
      });
    }

    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMatchVotes = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    await syncMatchVoteStatus(match);
    const syncedMatch = await Match.findById(match._id);
    const myVote = await MatchVote.findOne({
      matchId: syncedMatch._id,
      userId: req.user._id,
    });

    if (req.user.role !== 'admin' && !myVote) {
      return res.status(403).json({
        status: 403,
        message: 'Bạn cần bình chọn trước khi xem kết quả',
      });
    }

    const summary = await getVoteSummary(syncedMatch._id);

    res.status(200).json({
      status: 200,
      message: 'Lấy kết quả bình chọn thành công',
      data: {
        voteOpenAt: syncedMatch.voteOpenAt,
        voteCloseAt: syncedMatch.voteCloseAt,
        voteStatus: syncedMatch.voteStatus,
        myVote: myVote ? myVote.memberId : null,
        summary,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMatchVotesAdmin = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    await syncMatchVoteStatus(match);
    const votes = await MatchVote.find({ matchId: match._id })
      .populate('userId', '_id name username avatar')
      .populate('memberId', '_id name avatarUrl shirtNumber position')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách bình chọn thành công',
      data: votes.map((vote) => ({
        voteId: vote._id,
        voter: vote.userId,
        member: vote.memberId,
        createdAt: vote.createdAt,
      })),
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const deleteMatchVote = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({
        status: 404,
        message: 'Trận đấu không tồn tại',
      });
    }

    const vote = await MatchVote.findOneAndDelete({
      _id: req.params.voteId,
      matchId: match._id,
    });

    if (!vote) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy bình chọn',
      });
    }

    await syncMatchVoteStatus(match);
    const syncedMatch = await Match.findById(match._id);

    if (syncedMatch.voteStatus === 'closed') {
      await closeVotingAndUpdateBestPlayers(syncedMatch._id);
    }

    const summary = await getVoteSummary(match._id);

    res.status(200).json({
      status: 200,
      message: 'Xóa bình chọn thành công',
      data: {
        summary,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

module.exports = {
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
};
