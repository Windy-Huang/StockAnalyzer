// Endpoints associated with DB initialization

const db = require('./db');

async function initiateDB() {
    try {
        // Drop existing tables
        const tables = [
            'Derives', 'Contributes', 'AnalystRating', 'Holds', 'Users', 'Report', 'DebtEquity', 'PriceHistory',
            'Updates', 'StockSplit', 'Divident', 'Stock', 'Exchange'];
        for (const table of tables) {
            await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // Initiate empty tables
        await db.query(`
            CREATE TABLE Exchange(
                exchange VARCHAR(255) PRIMARY KEY,
                currency CHAR(3)
            )`);
        await db.query(`
            CREATE TABLE Stock(
                ticker VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255),
                country VARCHAR(255),
                industry VARCHAR(255),
                exchange VARCHAR(255),
                market_cap NUMERIC,
                FOREIGN KEY (exchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await db.query(`
            CREATE TABLE Updates(
                action_id INTEGER,
                ticker VARCHAR(255),
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY(action_id, ticker)
            )`);
        await db.query(`
            CREATE TABLE StockSplit(
                action_id INTEGER PRIMARY KEY,
                timestamp DATE,
                split_ratio NUMERIC
            )`);
        await db.query(`
            CREATE TABLE Divident(
                action_id INTEGER PRIMARY KEY,
                timestamp DATE,
                amount_per_share NUMERIC,
                divident_type VARCHAR(255)
            )`);
        await db.query(`
            CREATE TABLE PriceHistory(
                price_history_id SERIAL PRIMARY KEY,
                timestamp DATE,
                open_price NUMERIC,
                high_price NUMERIC,
                low_price NUMERIC,
                close_price NUMERIC,
                volume BIGINT,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
            )`);
        await db.query(`
            CREATE TABLE DebtEquity(
                total_debt NUMERIC,
                equity NUMERIC,
                debt_equity_ratio NUMERIC,
                PRIMARY KEY (equity, total_debt)
            )`);
        await db.query(`
            CREATE TABLE Report(
                report_id VARCHAR(255) PRIMARY KEY,
                timestamp DATE,
                fiscal_year NUMERIC,
                revenue NUMERIC,
                net_income NUMERIC,
                eps NUMERIC,
                total_debt NUMERIC,
                equity NUMERIC,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                FOREIGN KEY (equity, total_debt) REFERENCES DebtEquity(equity, total_debt) ON DELETE CASCADE
            )`);
        await db.query(`
            CREATE TABLE Users(
                email VARCHAR(255) PRIMARY KEY,
                preferred_industry VARCHAR(255),
                preferred_exchange VARCHAR(255),
                show_recommendation INTEGER,
                FOREIGN KEY (preferred_exchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await db.query(`
            CREATE TABLE Holds(
                email VARCHAR(255),
                ticker VARCHAR(255),
                hold_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES Users(email) ON DELETE CASCADE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY (ticker, email)
            )`);
        await db.query(`
            CREATE TABLE AnalystRating(
                analyst_rating_id INTEGER PRIMARY KEY,
                ticker VARCHAR(255),
                recommendation INTEGER,
                timestamp DATE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
            )`);
        await db.query(`
            CREATE TABLE Contributes(
                report_id VARCHAR(255),
                analyst_rating_id INTEGER,
                FOREIGN KEY (report_id) REFERENCES Report(report_id) ON DELETE CASCADE,
                FOREIGN KEY (analyst_rating_id) REFERENCES AnalystRating(analyst_rating_id) ON DELETE CASCADE,
                PRIMARY KEY(report_id, analyst_rating_id)
            )`);
        await db.query(`
            CREATE TABLE Derives(
                price_history_id INTEGER,
                analyst_rating_id INTEGER,
                FOREIGN KEY (price_history_id) REFERENCES PriceHistory(price_history_id) ON DELETE CASCADE,
                FOREIGN KEY (analyst_rating_id) REFERENCES AnalystRating(analyst_rating_id) ON DELETE CASCADE,
                PRIMARY KEY(price_history_id, analyst_rating_id)
            )`);
        console.log("DB tables initiated");
        return true;
    } catch (err) {
        console.error("InitiateDB failed: ", err);
        return false;
    }
}

async function insertDBperCompany(data) {
    try {
        const check = await db.query(`SELECT COUNT(*) FROM Exchange WHERE exchange = $1`, [data["exchange"]]);
        if (parseInt(check.rows[0].count) === 0) {
            await db.query(`INSERT INTO Exchange VALUES ($1, $2)`, [data["exchange"], data["currency"]]);
        }

        await db.query(`
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

        await db.query(`
            INSERT INTO DebtEquity VALUES ($1, $2, $3) 
            ON CONFLICT (equity, total_debt) DO NOTHING`,
            [data["liabilities"], data["equity"], data["liabilities"] / data["equity"]]
        );
        const result = await db.query(`
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
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');
            for (const [date, info] of data) {
                await client.query(`
                    INSERT INTO PriceHistory (timestamp, open_price, high_price, low_price, close_price, volume, ticker)
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

module.exports = {
    initiateDB,
    insertDBperCompany,
    insertReportPerCompany,
    insertPricePerStock
};