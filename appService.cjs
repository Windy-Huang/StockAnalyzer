const { Pool } = require('pg');
const loadEnvFile = require('./utils/envUtil.cjs');
const path = require('path');
const envVariables = loadEnvFile(path.resolve(__dirname, './.env'));

// Configure the Postgres Connection Pool
const pool = new Pool({
    user: envVariables.PG_USER,
    password: envVariables.PG_PASS,
    host: envVariables.PG_HOST,
    port: envVariables.PG_PORT,
    database: envVariables.PG_DB,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error('Query error:', err.message);
        throw err;
    }
}

// ----------------------------------------- DB endpoints -------------------------------------------

async function initiateDB() {
    try {
        // Drop existing tables
        const tables = ['Holds', 'Users', 'Derives', 'Contributes', 'AnalystRating', 'PriceHistory', 'Report', 'Stock', 'Exchange', 'DebtEquity'];
        for (const table of tables) {
            await query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }

        // Initiate empty tables
        await query(`
            CREATE TABLE Exchange(
                exchange VARCHAR(255) PRIMARY KEY,
                currency CHAR(3)
            )`);
        await query(`
            CREATE TABLE Stock(
                ticker VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255),
                country VARCHAR(255),
                industry VARCHAR(255),
                exchange VARCHAR(255),
                "marketCap" NUMERIC,
                FOREIGN KEY (exchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await query(`
            CREATE TABLE Updates(
                "actionID" INTEGER,
                ticker VARCHAR(255),
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY("actionID", ticker)
            )`);
        await query(`
            CREATE TABLE StockSplit(
                "actionID" INTEGER PRIMARY KEY,
                timestamp DATE,
                "splitRatio" NUMERIC
            )`);
        await query(`
            CREATE TABLE Divident(
                "actionID" INTEGER PRIMARY KEY,
                timestamp DATE,
                "amountPerShare" NUMERIC,
                "dividentType" VARCHAR(255)
            )`);
        await query(`
            CREATE TABLE PriceHistory(
                "priceHistoryID" SERIAL PRIMARY KEY,
                timestamp DATE,
                "openPrice" NUMERIC,
                "highPrice" NUMERIC,
                "lowPrice" NUMERIC,
                "closePrice" NUMERIC,
                volume BIGINT,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
            )`);
        await query(`
            CREATE TABLE DebtEquity(
                "totalDebt" NUMERIC,
                equity NUMERIC,
                "debtEquityRatio" NUMERIC,
                PRIMARY KEY (equity, "totalDebt")
            )`);
        await query(`
            CREATE TABLE Report(
                "reportID" VARCHAR(255) PRIMARY KEY,
                timestamp DATE,
                "fiscalYear" NUMERIC,
                revenue NUMERIC,
                "netIncome" NUMERIC,
                "EPS" NUMERIC,
                "totalDebt" NUMERIC,
                equity NUMERIC,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                FOREIGN KEY (equity, "totalDebt") REFERENCES DebtEquity(equity, "totalDebt") ON DELETE CASCADE
            )`);
        await query(`
            CREATE TABLE Users(
                email VARCHAR(255) PRIMARY KEY,
                "preferredIndustry" VARCHAR(255),
                "preferredExchange" VARCHAR(255),
                "showRecommendation" INTEGER,
                FOREIGN KEY ("preferredExchange") REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await query(`
            CREATE TABLE Holds(
                email VARCHAR(255),
                ticker VARCHAR(255),
                "holdTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES Users(email) ON DELETE CASCADE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY (ticker, email)
            )`);
        await query(`
            CREATE TABLE AnalystRating(
                "analystRatingID" INTEGER PRIMARY KEY,
                ticker VARCHAR(255),
                recommendation INTEGER,
                timestamp DATE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
            )`);
        await query(`
            CREATE TABLE Contributes(
                "reportID" VARCHAR(255),
                "analystRatingID" INTEGER,
                FOREIGN KEY ("reportID") REFERENCES Report("reportID") ON DELETE CASCADE,
                FOREIGN KEY ("analystRatingID") REFERENCES AnalystRating("analystRatingID") ON DELETE CASCADE,
                PRIMARY KEY("reportID", "analystRatingID")
            )`);
        await query(`
            CREATE TABLE Derives(
                "priceHistoryID" INTEGER,
                "analystRatingID" INTEGER,
                FOREIGN KEY ("priceHistoryID") REFERENCES PriceHistory("priceHistoryID") ON DELETE CASCADE,
                FOREIGN KEY ("analystRatingID") REFERENCES AnalystRating("analystRatingID") ON DELETE CASCADE,
                PRIMARY KEY("priceHistoryID", "analystRatingID")
            )`);
        return true;
    } catch (err) {
        console.error("InitiateDB failed: ", err);
        return false;
    }
}

async function insertDBperCompany(data) {
    try {
        const check = await query(`SELECT COUNT(*) FROM Exchange WHERE exchange = $1`, [data["exchange"]]);
        if (parseInt(check.rows[0].count) === 0) {
            await query(`INSERT INTO Exchange VALUES ($1, $2)`, [data["exchange"], data["currency"]]);
        }

        await query(`
            INSERT INTO Stock VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (ticker) DO NOTHING`,
            [data["ticker"], data["name"], data["country"], data["finnhubIndustry"], data["exchange"], data["marketCapitalization"]]
        );
        console.log("insert stock finished " + data["ticker"]);
        return true;
    } catch (err) {
        console.error("Insert failed : ", data["ticker"], err);
        return false;
    }
}

async function insertReportPerCompany(obj) {
    try {
        const data = (obj instanceof Map) ? Object.fromEntries(obj) : obj;

        await query(`
            INSERT INTO DebtEquity VALUES ($1, $2, $3) 
            ON CONFLICT (equity, "totalDebt") DO NOTHING`,
            [data["liabilities"], data["equity"], data["liabilities"] / data["equity"]]
        );
        const result = await query(`
            INSERT INTO Report VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [data["id"], new Date(data["timestamp"]), data["year"], data["revenue"], data["income"], data["eps"], data["liabilities"], data["equity"], data["ticker"]]
        );

        console.log("insert report finished " + data["ticker"]);
        return result.rowCount > 0;
    } catch (err) {
        console.error("Insert Report failed:", err);
        if (err.code === '23505') throw { errorNum: 1 }; // PK violation
        if (err.code === '23503') throw { errorNum: 2291 }; // FK violation
        throw err;
    }
}

async function insertPricePerStock(obj) {
    try {
        const ticker = obj["ticker"];
        const data = obj["data"]; // Array of [date, info]
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            for (const [date, info] of data) {
                await client.query(`
                    INSERT INTO PriceHistory (timestamp, "openPrice", "highPrice", "lowPrice", "closePrice", volume, ticker)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        new Date(date),
                        parseFloat(info["1. open"]),
                        parseFloat(info["2. high"]),
                        parseFloat(info["3. low"]),
                        parseFloat(info["4. close"]),
                        parseInt(info["5. volume"], 10),
                        ticker
                    ]
                );
            }
            await client.query('COMMIT');
            console.log("insert history price finished: " + ticker);
            return true;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Insert Price failed : ", obj["ticker"], err);
        return false;
    }
}

async function fetchUser(email) {
    try {
        const result = await query(`SELECT * FROM Users WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            await query(`INSERT INTO Users VALUES ($1, NULL, NULL, 0)`, [email]);
            return [];
        }
        return result.rows;
    } catch (err) {
        return [];
    }
}

async function updateUser(email, industry, exchange, rec) {
    try {
        const result = await query(`
            UPDATE Users 
            SET "preferredIndustry" = $2, "preferredExchange" = $3, "showRecommendation" = $4
            WHERE email = $1`,
            [email, industry || null, exchange || null, rec]
        );
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function delUser(email) {
    try {
        const result = await query(`DELETE FROM Users WHERE email = $1`, [email]);
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function fetchSettingDropdown(type) {
    try {
        const col = type === 'industry' ? 'industry' : 'exchange';
        const result = await query(`SELECT ${col}, COUNT(*) FROM Stock GROUP BY ${col}`);
        return result.rows.map(row => [row[col], parseInt(row.count)]);
    } catch (err) {
        return [];
    }
}

async function fetchAllStock() {
    try {
        const result = await query('SELECT * FROM Stock ORDER BY ticker');
        return result.rows.map(r => [r.ticker, r.name, r.country, r.industry, r.exchange, r.marketCap]);
    } catch (err) {
        return [];
    }
}

async function filterStock(whereClause) {
    try {
        const result = await query(`SELECT * FROM Stock WHERE ${whereClause}`);
        return result.rows.map(r => r.ticker);
    } catch (err) {
        return [];
    }
}

async function fetchPopularStock() {
    try {
        const result = await query(`
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
        const result = await query(`
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

async function verifyHolding(email, ticker) {
    try {
        const result = await query(`SELECT * FROM Holds WHERE email = $1 AND ticker = $2`, [email, ticker]);
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function addHolding(email, ticker) {
    try {
        const result = await query(`INSERT INTO Holds (email, ticker, "holdTime") VALUES ($1, $2, CURRENT_TIMESTAMP)`, [email, ticker]);
        return result.rowCount > 0;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function delHolding(email, ticker) {
    try {
        const result = await query(`DELETE FROM Holds WHERE email = $1 AND ticker = $2`, [email, ticker]);
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function getUserHeldStocks(email) {
    try {
        const result = await query(`
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

async function getPriceHistory(ticker) {
    try {
        const result = await query(`
            SELECT timestamp, "openPrice", "highPrice", "lowPrice", "closePrice", volume
            FROM PriceHistory
            WHERE ticker = $1
            ORDER BY timestamp ASC`, [ticker]);

        return result.rows.map(row => ({
            date: row.timestamp,
            open: row.openPrice,
            high: row.highPrice,
            low: row.lowPrice,
            close: row.closePrice,
            volume: row.volume
        }));
    } catch (err) {
        return [];
    }
}

async function fetchRecentPriceHistory(ticker, fields) {
    try {
        const result = await query(`
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

async function checkAlreadyExists(ticker) {
    try {
        const countRes = await query(`
            SELECT count(*) as cnt FROM AnalystRating 
            WHERE ticker = $1 AND timestamp IN (
                SELECT max(timestamp) FROM PriceHistory WHERE ticker = $1
            )`, [ticker]);

        if (parseInt(countRes.rows[0].cnt) === 1) {
            const ans = await query(`
                SELECT recommendation FROM AnalystRating 
                WHERE ticker = $1 AND timestamp IN (
                    SELECT max(timestamp) FROM PriceHistory WHERE ticker = $1
                )`, [ticker]);
            return ans.rows[0].recommendation;
        }
        return -1;
    } catch (err) {
        return -1;
    }
}

async function insertAnalyst(ticker, rating) {
    try {
        const tsRes = await query(`SELECT timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        const idRes = await query(`SELECT "priceHistoryID" FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        const repRes = await query(`SELECT "reportID" FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);

        const phID = idRes.rows[0].priceHistoryID;
        const ts = tsRes.rows[0].timestamp;
        const repID = repRes.rows[0].reportID;

        await query(`INSERT INTO AnalystRating ("analystRatingID", ticker, recommendation, timestamp) VALUES ($1, $2, $3, $4)`,
            [phID, ticker, rating, ts]);

        await query(`INSERT INTO Contributes ("reportID", "analystRatingID") VALUES ($1, $2)`,
            [repID, phID]);

        await query(`INSERT INTO Derives ("priceHistoryID", "analystRatingID") VALUES ($1, $2)`,
            [phID, phID]);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getRecommendation1(ticker) {
    try {
        const latest = await query(`SELECT "openPrice", timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const old = await query(`
            SELECT "openPrice" FROM PriceHistory 
            WHERE ticker=$1 AND timestamp < ($2::date - interval '1 year') 
            ORDER BY timestamp DESC LIMIT 1`, [ticker, latest.rows[0].timestamp]);

        if (!old.rows.length) return 0;

        const latestPrice = parseFloat(latest.rows[0].openPrice);
        const oldPrice = parseFloat(old.rows[0].openPrice);

        if (latestPrice / (latestPrice - oldPrice) < 20) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getRecommendation2(ticker) {
    try {
        const latest = await query(`SELECT "EPS", timestamp FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const old = await query(`
            SELECT "EPS" FROM Report 
            WHERE ticker=$1 AND timestamp < ($2::date - interval '10 months') 
            ORDER BY timestamp DESC LIMIT 1`, [ticker, latest.rows[0].timestamp]);

        if (!old.rows.length) return 0;

        const curEPS = parseFloat(latest.rows[0].EPS);
        const oldEPS = parseFloat(old.rows[0].EPS);

        if ((curEPS - oldEPS) / oldEPS > 0.1) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getRecommendation3(ticker) {
    try {
        const res = await query(`SELECT "netIncome", equity FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!res.rows.length) return -1;
        const { netIncome, equity } = res.rows[0];
        if ((parseFloat(netIncome)/parseFloat(equity)) > 0.15) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getRecommendation4(ticker) {
    try {
        // Needs at least 50 rows
        const res = await query(`SELECT "openPrice" FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 50`, [ticker]);
        if (res.rows.length < 50) return 0;

        const prices = res.rows.map(r => parseFloat(r.openPrice));

        // Sum first 20 (recent)
        let sumRecent = 0;
        for(let i=0; i<20; i++) sumRecent += prices[i];

        // Sum next 30 (older)
        let sumOlder = 0;
        for(let i=20; i<50; i++) sumOlder += prices[i];

        const totalSum = sumRecent + sumOlder;
        if (sumRecent * 2.5 > totalSum) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getRecommendation5(ticker) {
    try {
        const latest = await query(`SELECT "openPrice", timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const old = await query(`
            SELECT "openPrice" FROM PriceHistory 
            WHERE ticker=$1 AND timestamp < ($2::date - interval '1 year') 
            ORDER BY timestamp DESC LIMIT 1`, [ticker, latest.rows[0].timestamp]);

        if (!old.rows.length) return 0;

        const curP = parseFloat(latest.rows[0].openPrice);
        const oldP = parseFloat(old.rows[0].openPrice);

        if ((curP - oldP) / oldP > 0.2) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getRecommendation6(ticker) {
    try {
        const res = await query(`SELECT "totalDebt", equity FROM Report WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!res.rows.length) return -1;
        if ((parseFloat(res.rows[0].totalDebt) / parseFloat(res.rows[0].equity)) < 1) return 1;
        return 0;
    } catch (err) { return -1; }
}

async function getRecommendation7(ticker) {
    try {
        const latest = await query(`SELECT "openPrice", timestamp FROM PriceHistory WHERE ticker=$1 ORDER BY timestamp DESC LIMIT 1`, [ticker]);
        if (!latest.rows.length) return -1;

        const divRes = await query(`
            SELECT sum("amountPerShare") as total_div
            FROM Divident d 
            WHERE ticker=$1 AND timestamp > ($2::date - interval '1 year')`,
            [ticker, latest.rows[0].timestamp]);

        const div = parseFloat(divRes.rows[0].total_div || 0);
        const price = parseFloat(latest.rows[0].openPrice);

        if ((div / price) > 0.02) return 1;
        return 0;
    } catch (err) { return -1; }
}

// --------------------------------------Export-------------------------------------------------------------
module.exports = {
    initiateDB,
    insertDBperCompany,
    insertReportPerCompany,
    insertPricePerStock,
    fetchUser,
    updateUser,
    delUser,
    fetchSettingDropdown,
    fetchAllStock,
    filterStock,
    fetchPopularStock,
    fetchLeastPopularStock,
    verifyHolding,
    addHolding,
    delHolding,
    getUserHeldStocks,
    getPriceHistory,
    getAllStocks: async () => {
        // Map to object format expected by route /stocks
        const res = await query(`SELECT ticker, name, exchange, industry FROM Stock ORDER BY ticker`);
        return res.rows;
    },
    getRecommendation1,
    getRecommendation2,
    getRecommendation3,
    getRecommendation4,
    getRecommendation5,
    getRecommendation6,
    getRecommendation7,
    insertAnalyst,
    checkAlreadyExists,

    // Duration Logic
    getStocksByHoldingDuration: async (durationFilter) => {
        let interval;
        switch(durationFilter) {
            case 'day': interval = '1 day'; break;
            case 'week': interval = '7 days'; break;
            case 'month': interval = '1 month'; break;
            case 'year': interval = '1 year'; break;
            default: return [];
        }
        const res = await query(`
            SELECT h.ticker, s.name, COUNT(*) as "userCount",
                   ROUND(AVG(EXTRACT(DAY FROM (NOW() - h."holdTime")))::numeric, 2) as "avgHoldDays"
            FROM Holds h
            JOIN Stock s ON h.ticker = s.ticker
            GROUP BY h.ticker, s.name
            HAVING AVG(NOW() - h."holdTime") >= $1::interval
            ORDER BY "avgHoldDays" DESC`, [interval]);
        return res.rows.map(r => ({
            ticker: r.ticker,
            name: r.name,
            userCount: r.userCount,
            avgHoldDays: r.avgHoldDays
        }));
    },

    getUserHeldStocksByDuration: async (email, durationFilter) => {
        let interval;
        switch(durationFilter) {
            case 'day': interval = '1 day'; break;
            case 'week': interval = '7 days'; break;
            case 'month': interval = '1 month'; break;
            case 'year': interval = '1 year'; break;
            default: return [];
        }
        const res = await query(`
            SELECT h.ticker, s.name, ROUND(EXTRACT(DAY FROM (NOW() - h."holdTime"))::numeric, 2) as "holdDays"
            FROM Holds h
            JOIN Stock s ON h.ticker = s.ticker
            WHERE h.email = $1
            GROUP BY h.ticker, s.name, h."holdTime"
            HAVING (NOW() - h."holdTime") >= $2::interval
            ORDER BY "holdDays" DESC`, [email, interval]);
        return res.rows;
    },

    fetchRecentPriceHistory,
    getUsersHoldingStock: async (ticker) => {
        const res = await query(`
             SELECT h.email, h."holdTime", s.name, s.industry, s.exchange
             FROM Holds h, Stock s
             WHERE h.ticker = s.ticker AND h.ticker = $1
             ORDER BY h."holdTime" DESC`, [ticker]);
        return res.rows.map(r => ({
            email: r.email,
            holdTime: r.holdTime,
            stockName: r.name,
            industry: r.industry,
            exchange: r.exchange
        }));
    }
};