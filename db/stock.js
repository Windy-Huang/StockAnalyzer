// Endpoints associated with stocks and users' interaction with them

const db = require('./db');

async function getUninitializedStocks() {
    const result = await db.query('SELECT ticker FROM Stock WHERE initialized = 0 ORDER BY ticker');
    return result.rows.map(r => [r.ticker]);
}

async function getStaleStocks() {
    const result = await db.query(`
        SELECT ticker 
        FROM Divident 
        GROUP BY ticker 
        HAVING MAX(timestamp) < CURRENT_DATE - INTERVAL '3 months'
        ORDER BY MAX(timestamp)`);
    return result.rows.map(r => [r.ticker]);
}

async function fetchAllStock() {
    try {
        const result = await db.query('SELECT * FROM Stock WHERE initialized = 1 ORDER BY ticker');
        return result.rows.map(r => [r.ticker, r.name, r.country, r.industry, r.exchange, r.market_cap]);
    } catch (err) {
        return [];
    }
}

async function fetchPopularStock() {
    try {
        const result = await db.query(`
            SELECT DISTINCT h.ticker
            FROM Holds h
            WHERE NOT EXISTS (
                (SELECT u.email FROM Users u)
                EXCEPT
                (SELECT h1.email FROM Holds h1 WHERE h1.ticker = h.ticker)
            )
        `);
        return result.rows.map(r => r.ticker);
    } catch (err) {
        return [];
    }
}

async function fetchLeastPopularStock(industry) {
    try {
        const result = await db.query(`
            SELECT s.ticker
            FROM Stock s LEFT JOIN Holds h ON h.ticker = s.ticker
            WHERE s.industry = $1
            GROUP BY s.ticker
            HAVING COUNT(h.email) <= ALL (
                SELECT COUNT(h1.email)
                FROM Stock s1 LEFT JOIN Holds h1 ON h1.ticker = s1.ticker
                WHERE s1.industry = $1
                GROUP BY s1.ticker
            )`, [industry]);
        return result.rows.map(r => r.ticker);
    } catch (err) {
        return [];
    }
}

async function filterStock(whereClause) {
    try {
        const result = await db.query(`SELECT * FROM Stock WHERE ${whereClause}`);
        return result.rows.map(r => [r.ticker, r.name, r.country, r.industry, r.exchange, r.market_cap]);
    } catch (err) {
        return [];
    }
}

async function getUserHeldStocks(email) {
    try {
        const result = await db.query(`
            SELECT h.ticker, s.name
            FROM Holds h
            JOIN Stock s ON h.ticker = s.ticker
            WHERE h.email = $1
            ORDER BY s.ticker`, [email]);
        return result.rows;
    } catch (err) {
        return [];
    }
}

async function getUserHeldStocksByDuration(email, durationFilter){
    let interval;
    switch(durationFilter) {
        case 'day': interval = '1 day'; break;
        case 'week': interval = '7 days'; break;
        case 'month': interval = '1 month'; break;
        case 'year': interval = '1 year'; break;
        default: return [];
    }
    const res = await db.query(`
            SELECT h.ticker, s.name, ROUND(EXTRACT(DAY FROM (NOW() - h.hold_time))::numeric, 2) as hold_days
            FROM Holds h
            JOIN Stock s ON h.ticker = s.ticker
            WHERE h.email = $1
            GROUP BY h.ticker, s.name, h.hold_time
            HAVING (NOW() - h.hold_time) >= $2::interval
            ORDER BY hold_days DESC`, [email, interval]);
    return res.rows;
}

async function getPriceHistory(ticker) {
    try {
        const result = await db.query(`
            SELECT timestamp, open_price, high_price, low_price, close_price, volume
            FROM PriceHistory
            WHERE ticker = $1
            ORDER BY timestamp ASC`, [ticker]);

        return result.rows.map(row => ({
            timestamp: row.timestamp,
            open_price: row.open_price,
            high_price: row.high_price,
            low_price: row.low_price,
            close_price: row.close_price,
            volume: row.volume
        }));
    } catch (err) {
        return [];
    }
}

async function fetchRecentPriceHistory(ticker, fields) {
    try {
        const result = await db.query(`
            SELECT ${fields}
            FROM PriceHistory
            WHERE ticker = $1
            ORDER BY timestamp DESC
            LIMIT 1`, [ticker]);

        if (result.rows.length === 0) return [];
        return [Object.values(result.rows[0])];
    } catch (err) {
        return [];
    }
}

async function verifyHolding(email, ticker) {
    try {
        const result = await db.query(`SELECT * FROM Holds WHERE email = $1 AND ticker = $2`, [email, ticker]);
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function addHolding(email, ticker) {
    try {
        const result = await db.query(`INSERT INTO Holds (email, ticker, hold_time) VALUES ($1, $2, CURRENT_TIMESTAMP)`, [email, ticker]);
        return result.rowCount > 0;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function delHolding(email, ticker) {
    try {
        const result = await db.query(`DELETE FROM Holds WHERE email = $1 AND ticker = $2`, [email, ticker]);
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

module.exports = {
    getUninitializedStocks,
    getStaleStocks,
    fetchAllStock,
    fetchPopularStock,
    fetchLeastPopularStock,
    filterStock,
    getUserHeldStocks,
    getUserHeldStocksByDuration,
    getPriceHistory,
    fetchRecentPriceHistory,
    verifyHolding,
    addHolding,
    delHolding
};
