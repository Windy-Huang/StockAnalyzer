module.exports = async function (context, myTimer) {
    context.log('Midnight Scheduler Triggered:', new Date().toISOString());
    const backendUrl = process.env.BACKEND_URL;
    const cronSecret = process.env.CRON_SECRET;

    try {
        const response = await fetch(`${backendUrl}/v1/schedulers/midnight`, {
            method: 'POST',
            headers: { 'x-cron-secret': cronSecret }
        });

        if (response.ok) {
            context.log('Success: Backend triggered successfully.');
        } else {
            context.log.error(`Failed: Backend returned ${response.status}`);
        }
    } catch (error) {
        context.log.error('Network Error calling backend:', error);
    }
};