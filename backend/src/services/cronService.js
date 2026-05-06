const cron = require('node-cron');
const { checkAllActiveAlerts } = require('./alertService');

function initCronJobs() {
    // Run alert check every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Running daily alert checks...');
        await checkAllActiveAlerts();
    });

    // For testing/immediate effect, you can run it every hour as well
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Running hourly alert checks...');
        await checkAllActiveAlerts();
    });

    console.log('Cron jobs initialized successfully');
}

module.exports = { initCronJobs };
