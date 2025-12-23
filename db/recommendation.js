// Endpoints associated with rating algorithm

const db = require('./db');

async function getRecommendation(ticker) {
    try {
        const countRes = await db.query(`
            SELECT count(*) as cnt FROM AnalystRating 
            WHERE ticker = $1 AND timestamp IN (
                SELECT max(timestamp) FROM PriceHistory WHERE ticker = $1
            )`, [ticker]);

        if (parseInt(countRes.rows[0].cnt) === 1) {
            const ans = await db.query(`
                SELECT recommendation FROM AnalystRating 
                WHERE ticker = $1 AND timestamp IN (
                    SELECT max(timestamp) FROM PriceHistory WHERE ticker = $1
                )`, [ticker]);
            return ans.rows[0].recommendation;
        }
        return "";
    } catch (err) {
        return "";
    }
}

async function insertRecommendation(ticker, rating) {
    try {
        const tsRes = await db.query(`SELECT timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        const idRes = await db.query(`SELECT price_history_id FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        const repRes = await db.query(`SELECT report_id FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);

        const phID = idRes.rows[0].price_history_id;
        const ts = tsRes.rows[0].timestamp;
        const repID = repRes.rows[0].report_id;

        await db.query(`INSERT INTO AnalystRating (analyst_rating_id, ticker, recommendation, timestamp) VALUES ($1, $2, $3, $4)`,
            [phID, ticker, rating, ts]);

        await db.query(`INSERT INTO Contributes (report_id, analyst_rating_id) VALUES ($1, $2)`,
            [repID, phID]);

        await db.query(`INSERT INTO Derives (price_history_id, analyst_rating_id) VALUES ($1, $2)`,
            [phID, phID]);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getPERation(ticker) {
    try {
        const latest = await db.query(`SELECT open_price, timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const old = await db.query(`
            SELECT open_price FROM PriceHistory 
            WHERE ticker=$1 AND timestamp < ($2::date - interval '1 year') 
            ORDER BY timestamp DESC LIMIT 1`, [ticker, latest.rows[0].timestamp]);

        if (!old.rows.length) return 0;

        const latestPrice = parseFloat(latest.rows[0].open_price);
        const oldPrice = parseFloat(old.rows[0].open_price);

        if (latestPrice / (latestPrice - oldPrice) < 20) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getEPSGrowth(ticker) {
    try {
        const latest = await db.query(`SELECT eps, timestamp FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const old = await db.query(`
            SELECT eps FROM Report 
            WHERE ticker=$1 AND timestamp < ($2::date - interval '10 months') 
            ORDER BY timestamp DESC LIMIT 1`, [ticker, latest.rows[0].timestamp]);

        if (!old.rows.length) return 0;

        const curEPS = parseFloat(latest.rows[0].eps);
        const oldEPS = parseFloat(old.rows[0].eps);

        if ((curEPS - oldEPS) / oldEPS > 0.1) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getROE(ticker) {
    try {
        const res = await db.query(`SELECT net_income, equity FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!res.rows.length) return -1;
        const { netIncome, equity } = res.rows[0];
        if ((parseFloat(netIncome)/parseFloat(equity)) > 0.15) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getMovingAverage(ticker) {
    try {
        // Needs at least 50 rows
        const res = await db.query(`SELECT "openPrice" FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 50`, [ticker]);
        if (res.rows.length < 50) return 0;

        const prices = res.rows.map(r => parseFloat(r.open_price));
        let sumRecent = 0;
        for(let i=0; i<20; i++) sumRecent += prices[i];
        let sumOlder = 0;
        for(let i=20; i<50; i++) sumOlder += prices[i];

        const totalSum = sumRecent + sumOlder;
        if (sumRecent * 2.5 > totalSum) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getMomentum(ticker) {
    try {
        const latest = await query(`SELECT open_price, timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const old = await db.query(`
            SELECT open_price FROM PriceHistory 
            WHERE ticker=$1 AND timestamp < ($2::date - interval '1 year') 
            ORDER BY timestamp DESC LIMIT 1`, [ticker, latest.rows[0].timestamp]);

        if (!old.rows.length) return 0;

        const curP = parseFloat(latest.rows[0].open_price);
        const oldP = parseFloat(old.rows[0].open_price);
        if ((curP - oldP) / oldP > 0.2) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getDERatio(ticker) {
    try {
        const res = await query(`SELECT total_debt, equity FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!res.rows.length) return -1;
        if ((parseFloat(res.rows[0].total_debt) / parseFloat(res.rows[0].equity)) < 1) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getDividentYield(ticker) {
    try {
        const latest = await db.query(`SELECT open_price, timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const divRes = await db.query(`
            SELECT sum(amount_per_share) as total_div
            FROM Divident d 
            WHERE ticker=$1 AND timestamp > ($2::date - interval '1 year')`,
            [ticker, latest.rows[0].timestamp]);

        const div = parseFloat(divRes.rows[0].total_div || 0);
        const price = parseFloat(latest.rows[0].open_price);

        if ((div / price) > 0.02) return 1;
        return 0;
    } catch (err) { return -1; }
}

module.exports = {
    getRecommendation,
    insertRecommendation,
    getPERation,
    getEPSGrowth,
    getROE,
    getMovingAverage,
    getMomentum,
    getDERatio,
    getDividentYield
}