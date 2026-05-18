const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const memberRoutes = require('./routes/member.routes');
const uploadRoutes = require('./routes/upload.routes');
const mediaRoutes = require('./routes/media.routes');
const matchRoutes = require('./routes/match.routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/matches', matchRoutes);

app.use(errorMiddleware);

module.exports = app;
