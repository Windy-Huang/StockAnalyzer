const { completeInitialization, dailyDivUpdate } = require('./../clients/scripts');

module.exports = async function (context, myTimer) {
    context.log('Midnight Scheduler Triggered:', new Date().toISOString());
    try {
        const usedRate = await completeInitialization();
        await dailyDivUpdate(usedRate);
        context.log('Midnight Scheduler Completed successfully.');
    } catch (error) {
        context.log.error('Midnight Scheduler Failed:', error);
    }
};