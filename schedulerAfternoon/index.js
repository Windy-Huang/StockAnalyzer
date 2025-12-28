const { dailyReportPriceUpdate } = require('./../clients/scripts');

module.exports = async function (context, myTimer) {
    context.log('Afternoon Scheduler Triggered:', new Date().toISOString());
    try {
        await dailyReportPriceUpdate();
        context.log('Afternoon Scheduler Completed successfully.');
    } catch (error) {
        context.log.error('Afternoon Scheduler Failed:', error);
    }
};