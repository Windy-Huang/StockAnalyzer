// Endpoints associated with DB initialization

const db = require('./db');

async function initiateDB() {
    try {
        // Drop existing tables
        const tables = [
            'Derives', 'Contributes', 'AnalystRating', 'Holds', 'Users', 'Report', 'DebtEquity', 'PriceHistory', 'Divident', 'Stock', 'Exchange'];
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
                initialized INTEGER,
                FOREIGN KEY (exchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await db.query(`
            CREATE TABLE Divident(
                ticker VARCHAR(255),
                timestamp DATE,
                amount_per_share NUMERIC,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY(ticker, timestamp)
            )`);
        await db.query(`
            CREATE TABLE PriceHistory(
                price_history_id SERIAL PRIMARY KEY,
                timestamp DATE,
                open_price NUMERIC,
                high_price NUMERIC,
                low_price NUMERIC,
                close_price NUMERIC,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                UNIQUE (ticker, timestamp)
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
                recommendation VARCHAR(255),
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
            INSERT INTO Stock VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (ticker) DO NOTHING`,
            [data["ticker"], data["name"], data["country"], data["finnhubIndustry"], data["exchange"], data["marketCapitalization"], 0]
        );
        console.log("Insert stock finished " + data["ticker"]);
        return true;
    } catch (err) {
        console.error("Insert failed : ", data["ticker"], err);
        return false;
    }
}

async function insertReportPerCompany(arr) {
    let ticker = "";
    let count = 0;
    for (const obj of arr) {
        try {
            const data = (obj instanceof Map) ? Object.fromEntries(obj) : obj;
            ticker = data["ticker"];

            await db.query(`
            INSERT INTO DebtEquity VALUES ($1, $2, $3) 
            ON CONFLICT (equity, total_debt) DO NOTHING`,
                [data["liabilities"], data["equity"], data["liabilities"] / data["equity"]]
            );
            const result = await db.query(`
            INSERT INTO Report VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [data["id"], new Date(data["timestamp"]), data["year"], data["revenue"], data["income"], data["eps"], data["liabilities"], data["equity"], ticker]
            );

            if (result.rowCount > 0) count += 1;
        } catch (err) {
            if (err.code === '23505') throw { errorNum: 1 }; // PK violation
            if (err.code === '23503') throw { errorNum: 2291 }; // FK violation
            throw err;
        }
    }

    console.log("Insert report finished " + ticker);
    return count === arr.length;
}

async function insertDividentPerStock(obj) {
    try {
        const ticker = obj["ticker"];
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');
            for (const [idx, data] of obj["data"]) {
                const div = (data instanceof Map) ? Object.fromEntries(data) : data;
                await client.query(`
                    INSERT INTO Divident 
                    VALUES ($1, $2, $3)
                    ON CONFLICT (ticker, timestamp) DO NOTHING`,
                    [
                        ticker,
                        new Date(div["ex_dividend_date"]),
                        parseFloat(div["amount"])
                    ]
                );
            }
            await client.query('COMMIT');
            console.log("insert Divident finished: " + ticker);
            return true;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Insert Divident failed : ", obj["ticker"], err);
        return false;
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
                    INSERT INTO PriceHistory (timestamp, open_price, high_price, low_price, close_price, ticker)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (ticker, timestamp) DO NOTHING`,
                    [
                        new Date(date),
                        parseFloat(info["1. open"]),
                        parseFloat(info["2. high"]),
                        parseFloat(info["3. low"]),
                        parseFloat(info["4. close"]),
                        ticker
                    ]
                );
                await client.query(`
                    UPDATE Stock SET initialized = 1 WHERE ticker = $1`, [ticker]
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

async function insertDailyPricePerStock(obj) {
    const data = (obj instanceof Map) ? Object.fromEntries(obj) : obj;
    const result = await db.query(`
        UPDATE PriceHistory
        SET open_price=$1, high_price=$2, low_price=$3, close_price=$4
        WHERE ticker=$5 AND timestamp::date = $6::date`,
        [data["open_price"], data["high_price"], data["low_price"], data["close_price"], data["ticker"], data["timestamp"]]
    );

    if (result.rowCount === 0) {
        await db.query(`
            INSERT INTO PriceHistory (timestamp, open_price, high_price, low_price, close_price, ticker)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [data["timestamp"], data["open_price"], data["high_price"], data["low_price"], data["close_price"], data["ticker"]]
        );
    }
}

module.exports = {
    initiateDB,
    insertDBperCompany,
    insertReportPerCompany,
    insertDividentPerStock,
    insertPricePerStock,
    insertDailyPricePerStock
};