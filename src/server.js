require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const startMatchSchedulerJob = require('./jobs/matchScheduler.job');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  startMatchSchedulerJob();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
