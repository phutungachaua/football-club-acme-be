const cron = require('node-cron');
const { createWeeklyThursdayMatch } = require('../services/matchScheduler.service');

const startMatchSchedulerJob = () => {
  cron.schedule('0 9 * * 5', async () => {
    try {
      await createWeeklyThursdayMatch();
    } catch (error) {
      console.error(error);
    }
  });
};

module.exports = startMatchSchedulerJob;
