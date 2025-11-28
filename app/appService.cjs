const oracledb = require('oracledb');
const loadEnvFile = require('./utils/envUtil.cjs');

const path = require('path');
const envVariables = loadEnvFile(path.resolve(__dirname, './.env'));

// Database configuration setup. Ensure your .env file has the required database credentials.
const dbConfig = {
    user: envVariables.ORACLE_USER,
    password: envVariables.ORACLE_PASS,
    connectString: `${envVariables.ORACLE_HOST}:${envVariables.ORACLE_PORT}/${envVariables.ORACLE_DBNAME}`,
    poolMin: 1,
    poolMax: 3,
    poolIncrement: 1,
    poolTimeout: 60,
    transportConnectTimeout: 60  // Increase connection timeout from default 20s to 60s
};

// Debug: Log connection details (password masked)
console.log('=== Database Configuration Debug ===');
console.log('  User:', dbConfig.user);
console.log('  User type:', typeof dbConfig.user);
console.log('  User length:', dbConfig.user ? dbConfig.user.length : 0);
console.log('  User has whitespace?', dbConfig.user !== dbConfig.user.trim());
console.log('  Password:', dbConfig.password ? '*'.repeat(dbConfig.password.length) : 'NOT SET');
console.log('  Password type:', typeof dbConfig.password);
console.log('  Password length:', dbConfig.password ? dbConfig.password.length : 0);
console.log('  Password has whitespace?', dbConfig.password !== dbConfig.password.trim());
console.log('  Connect String:', dbConfig.connectString);
console.log('  Full config keys:', Object.keys(dbConfig));
console.log('=====================================');

// initialize connection pool
async function initializeConnectionPool() {
    try {
        console.log('Attempting to create Oracle connection pool...');
        await oracledb.createPool(dbConfig);
        console.log('Connection pool started successfully');
    } catch (err) {
        console.error('=== Connection Pool Initialization Failed ===');
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);
        console.error('Error details:', err);
        console.error('==========================================');
        throw err;
    }
}

async function closePoolAndExit() {
    console.log('\nTerminating');
    try {
        await oracledb.getPool().close(10); // 10 seconds grace period for connections to finish
        console.log('Pool closed');
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}


process
    .once('SIGTERM', closePoolAndExit)
    .once('SIGINT', closePoolAndExit);


// ----------------------------------------------------------
// Wrapper to manage OracleDB actions, simplifying connection handling.
async function withOracleDB(action) {
    await poolReady;

    let connection;
    try {
        connection = await oracledb.getConnection(); // Gets a connection from the default pool 
        return await action(connection);
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}


// ----------------------------------------------------------
// Core functions for database operations
// Modify these functions, especially the SQL queries, based on your project's requirements and design.
async function testOracleConnection() {
    return await withOracleDB(async (connection) => {
        return true;
    }).catch(() => {
        return false;
    });
}

async function insertAnalyst(ticker, rating) {
    return await withOracleDB(async (connection) => {
        const timestamp = await connection.execute(
            `select timestamp from PriceHistory 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        const idNum = await connection.execute(
            `select priceHistoryID from PriceHistory 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        const reportIdNum = await connection.execute(
            `select reportID from Report 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        const result1 = await connection.execute(
            `INSERT INTO AnalystRating (analystRatingID, ticker, recommendation, timestamp) 
            VALUES (:idNum, :ticker, :rating, :timestamp)`,
            [idNum.rows[0][0], ticker, rating, timestamp.rows[0][0]],
            { autoCommit: true }
        );
        const result2 = await connection.execute(
            `INSERT INTO Contributes (reportID, analystRatingID) 
            VALUES (:reportIdNum, :idNum)`,
            [reportIdNum.rows[0][0], idNum.rows[0][0]],
            { autoCommit: true }
        );
        const result3 = await connection.execute(
            `INSERT INTO Derives (priceHistoryID, analystRatingID) 
            VALUES (:priceHistoryID, :analystRatingID)`,
            [idNum.rows[0][0], idNum.rows[0][0]],
            { autoCommit: true }
        );

        // return result.rowsAffected && result.rowsAffected > 0;
        return true;
    }).catch(() => {
        return false;
    });
}

async function checkAlreadyExists(ticker) {
    return await withOracleDB(async (connection) => {
        const alreadyExists = await connection.execute(
            `select count(*) from AnalystRating where ticker=:ticker and timestamp in (
            select max(timestamp) from PriceHistory where ticker=:ticker)`,
            [ticker, ticker]);
        if (alreadyExists.rows[0][0] == 1) {//exists
            const answer = await connection.execute(
            `select recommendation from AnalystRating where ticker=:ticker and timestamp in (
            select max(timestamp) from PriceHistory where ticker=:ticker)`,
            [ticker, ticker]);
            return answer.rows[0][0];
        }
        else {//doesn't exist
            return -1;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation1(ticker) {
    return await withOracleDB(async (connection) => {
        const latestPriceAndDate = await connection.execute(
            `select openPrice, timestamp from PriceHistory 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        const price1year = await connection.execute(
            `select openPrice, timestamp from PriceHistory 
            where ticker=:ticker and timestamp<add_months(:latestDate, -12) order by timestamp desc`,
            [ticker, latestPriceAndDate.rows[0][1]]);
        if (latestPriceAndDate.rows[0][0] / (latestPriceAndDate.rows[0][0] - price1year.rows[0][0]) < 20) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation2(ticker) {
    return await withOracleDB(async (connection) => {
        const latestEPSAndDate = await connection.execute(
            `select EPS, timestamp from Report 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        const EPS1year = await connection.execute(
            `select EPS, timestamp from Report 
            where ticker=:ticker and timestamp<add_months(:latestDate, -10) 
            order by timestamp desc`,
            [ticker, latestEPSAndDate.rows[0][1]]);//10 months instead of 12 months in case the 
            //report for each year is not released on exactly the same date
        if ((latestEPSAndDate.rows[0][0] - EPS1year.rows[0][0]) / EPS1year.rows[0][0] > 0.1) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation3(ticker) {
    return await withOracleDB(async (connection) => {
        const incomeAndEquity = await connection.execute(
            `select netIncome, equity from Report 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        if ((incomeAndEquity.rows[0][0]/incomeAndEquity.rows[0][1]) > 0.15) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation4(ticker) {
    return await withOracleDB(async (connection) => {
        const latestPriceAndDate = await connection.execute(
            `select openPrice, timestamp from PriceHistory 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        if ((latestPriceAndDate.rows[0][0] + latestPriceAndDate.rows[1][0] + 
            latestPriceAndDate.rows[2][0] + latestPriceAndDate.rows[3][0] + 
            latestPriceAndDate.rows[4][0] + latestPriceAndDate.rows[5][0] + 
            latestPriceAndDate.rows[6][0] + latestPriceAndDate.rows[7][0] + 
            latestPriceAndDate.rows[8][0] + latestPriceAndDate.rows[9][0] + 
            latestPriceAndDate.rows[10][0] + latestPriceAndDate.rows[11][0] + 
            latestPriceAndDate.rows[12][0] + latestPriceAndDate.rows[13][0] + 
            latestPriceAndDate.rows[14][0] + latestPriceAndDate.rows[15][0] + 
            latestPriceAndDate.rows[16][0] + latestPriceAndDate.rows[17][0] + 
            latestPriceAndDate.rows[18][0] + latestPriceAndDate.rows[19][0]) * 2.5 > 
            (latestPriceAndDate.rows[0][0] + latestPriceAndDate.rows[1][0] + 
            latestPriceAndDate.rows[2][0] + latestPriceAndDate.rows[3][0] + 
            latestPriceAndDate.rows[4][0] + latestPriceAndDate.rows[5][0] + 
            latestPriceAndDate.rows[6][0] + latestPriceAndDate.rows[7][0] + 
            latestPriceAndDate.rows[8][0] + latestPriceAndDate.rows[9][0] + 
            latestPriceAndDate.rows[10][0] + latestPriceAndDate.rows[11][0] + 
            latestPriceAndDate.rows[12][0] + latestPriceAndDate.rows[13][0] + 
            latestPriceAndDate.rows[14][0] + latestPriceAndDate.rows[15][0] + 
            latestPriceAndDate.rows[16][0] + latestPriceAndDate.rows[17][0] + 
            latestPriceAndDate.rows[18][0] + latestPriceAndDate.rows[19][0] + 
            latestPriceAndDate.rows[20][0] + latestPriceAndDate.rows[21][0] + 
            latestPriceAndDate.rows[22][0] + latestPriceAndDate.rows[23][0] + 
            latestPriceAndDate.rows[24][0] + latestPriceAndDate.rows[25][0] + 
            latestPriceAndDate.rows[26][0] + latestPriceAndDate.rows[27][0] + 
            latestPriceAndDate.rows[28][0] + latestPriceAndDate.rows[29][0] + 
            latestPriceAndDate.rows[30][0] + latestPriceAndDate.rows[31][0] + 
            latestPriceAndDate.rows[32][0] + latestPriceAndDate.rows[33][0] + 
            latestPriceAndDate.rows[34][0] + latestPriceAndDate.rows[35][0] + 
            latestPriceAndDate.rows[36][0] + latestPriceAndDate.rows[37][0] + 
            latestPriceAndDate.rows[38][0] + latestPriceAndDate.rows[39][0] + 
            latestPriceAndDate.rows[40][0] + latestPriceAndDate.rows[41][0] + 
            latestPriceAndDate.rows[42][0] + latestPriceAndDate.rows[43][0] + 
            latestPriceAndDate.rows[44][0] + latestPriceAndDate.rows[45][0] + 
            latestPriceAndDate.rows[46][0] + latestPriceAndDate.rows[47][0] + 
            latestPriceAndDate.rows[48][0] + latestPriceAndDate.rows[49][0])) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation5(ticker) {
    return await withOracleDB(async (connection) => {
        const latestPriceAndDate = await connection.execute(
            `select openPrice, timestamp from PriceHistory 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        const price1year = await connection.execute(
            `select openPrice, timestamp from PriceHistory 
            where ticker=:ticker and timestamp<add_months(:latestDate, -12) order by timestamp desc`,
            [ticker, latestPriceAndDate.rows[0][1]]);
        // return (latestPriceAndDate.rows[0][0] - price1year.rows[0][0]) / price1year.rows[0][0];
        if ((latestPriceAndDate.rows[0][0] - price1year.rows[0][0]) / price1year.rows[0][0] > 0.2) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation6(ticker) {
    return await withOracleDB(async (connection) => {
        const incomeAndEquity = await connection.execute(
            `select totalDebt, equity from Report 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        if ((incomeAndEquity.rows[0][0]/incomeAndEquity.rows[0][1]) < 1) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function getRecommendation7(ticker) {
    return await withOracleDB(async (connection) => {
        const dividend = await connection.execute(
            `select sum(amountPerShare) 
            from Divident d natural join Updates u 
            where ticker=:ticker and timestamp>add_months((
            select max(p1.timestamp) from PriceHistory p1 
            where p1.ticker=:ticker), -12)`,
            [ticker, ticker]);
        const latestPriceAndDate = await connection.execute(
            `select openPrice, timestamp from PriceHistory 
            where ticker=:ticker order by timestamp desc`,
            [ticker]);
        // return dividend.rows[0][0] / latestPriceAndDate.rows[0][0];
        if ((dividend.rows[0][0] / latestPriceAndDate.rows[0][0]) > 0.02) {
            return 1;
        }
        else {
            return 0;
        }
    }).catch(() => {
        return -1;
    });
}

async function initiateDB() {
    return await withOracleDB(async (connection) => {
        try {
            await connection.execute('DROP TABLE Holds CASCADE CONSTRAINTS');
        } catch (err) { console.log('Holds might not exist'); }
        try {
            await connection.execute('DROP TABLE Users CASCADE CONSTRAINTS');
        } catch (err) { console.log('Users might not exist'); }
        try {
            await connection.execute('DROP TABLE Derives CASCADE CONSTRAINTS');
        } catch (err) { console.log('Derives might not exist'); }
        try {
            await connection.execute('DROP TABLE Contributes CASCADE CONSTRAINTS');
        } catch (err) { console.log('Contributes might not exist'); }
        try {
            await connection.execute('DROP TABLE AnalystRating CASCADE CONSTRAINTS');
        } catch (err) { console.log('AnalystRating might not exist'); }
        try {
            await connection.execute('DROP TABLE PriceHistory CASCADE CONSTRAINTS');
        } catch (err) { console.log('PriceHistory might not exist'); }
        try {
            await connection.execute('DROP TABLE Stock CASCADE CONSTRAINTS');
        } catch (err) { console.log('Stock might not exist'); }
        try {
            await connection.execute('DROP TABLE Exchange CASCADE CONSTRAINTS');
        } catch (err) { console.log('Exchange might not exist'); }
        try {
            await connection.execute('DROP TABLE DebtEquity CASCADE CONSTRAINTS');
        } catch (err) { console.log('DebtEquity might not exist'); }
        try {
            await connection.execute('DROP TABLE Report CASCADE CONSTRAINTS');
        } catch (err) { console.log('Report might not exist'); }

        await connection.execute(`
            CREATE TABLE Exchange(
                exchange VARCHAR(255) PRIMARY KEY,
                currency CHAR(3)
            )`);
        await connection.execute(`
            CREATE TABLE Stock(
                ticker VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255),
                country VARCHAR(255),
                industry VARCHAR(255),
                exchange VARCHAR(255),
                marketCap FLOAT,
                FOREIGN KEY (exchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await connection.execute(`
            CREATE TABLE PriceHistory(
                priceHistoryID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                timestamp DATE,
                openPrice FLOAT,
                highPrice FLOAT,
                lowPrice FLOAT,
                closePrice FLOAT,
                volume NUMBER,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
            )`);
        await connection.execute(`
            CREATE TABLE DebtEquity(
                totalDebt NUMBER,
                equity NUMBER,
                debtEquityRatio FLOAT,
                PRIMARY KEY (equity, totalDebt)
            )`);
        await connection.execute(`
            CREATE TABLE Report(
                reportID VARCHAR(255) PRIMARY KEY,
                timestamp DATE,
                fiscalYear NUMBER,
                revenue NUMBER,
                netIncome NUMBER,
                EPS FLOAT,
                totalDebt NUMBER,
                equity NUMBER,
                ticker VARCHAR(255) NOT NULL,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                FOREIGN KEY (equity, totalDebt) REFERENCES DebtEquity(equity, totalDebt) ON DELETE CASCADE
            )`);
        await connection.execute(`
            CREATE TABLE Users(
                email VARCHAR(255) PRIMARY KEY,
                preferredIndustry VARCHAR(255),
                preferredExchange VARCHAR(255),
                showRecommendation NUMBER(1,0),
                FOREIGN KEY (preferredExchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
            )`);
        await connection.execute(`
            CREATE TABLE Holds(
                email VARCHAR(255),
                ticker VARCHAR(255),
                holdTime DATE,
                FOREIGN KEY (email) REFERENCES Users(email) ON DELETE CASCADE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY (ticker, email)
            )`);
        await connection.execute(`
            CREATE TABLE AnalystRating(
                analystRatingID INT PRIMARY KEY,
                ticker VARCHAR(255),
                recommendation NUMBER,
                timestamp DATE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
            )`);
        await connection.execute(`
            CREATE TABLE Contributes(
                reportID VARCHAR(255),
                analystRatingID INT,
                FOREIGN KEY (reportID) REFERENCES Report(reportID) ON DELETE CASCADE,
                FOREIGN KEY (analystRatingID) REFERENCES AnalystRating(analystRatingID) ON DELETE CASCADE,
                PRIMARY KEY(reportID, analystRatingID)
            )`);
        await connection.execute(`
            CREATE TABLE Derives(
                priceHistoryID INT,
                analystRatingID INT,
                FOREIGN KEY (priceHistoryID) REFERENCES PriceHistory(priceHistoryID) ON DELETE CASCADE,
                FOREIGN KEY (analystRatingID) REFERENCES AnalystRating(analystRatingID) ON DELETE CASCADE,
                PRIMARY KEY(priceHistoryID, analystRatingID)
            )`);
        return true;
    }).catch((err) => {
        console.error("InitiateDB failed: ", err);
        return false;
    });
}

async function insertDBperCompany(data) {
    return await withOracleDB(async (connection) => {
        let result = await connection.execute(`
            SELECT COUNT(*)
            FROM Exchange
            WHERE exchange = :1`,
            [data["exchange"]],
            { autoCommit: true }
        );
        if (result.rows[0][0] === 0) {
            await connection.execute(`
                INSERT INTO Exchange
                VALUES (:1, :2)`,
                [data["exchange"], data["currency"]],
                { autoCommit: true }
            );
        }
        result = await connection.execute(`
            INSERT INTO Stock
            VALUES (:1, :2, :3, :4, :5, :6)`,
            [data["ticker"], data["name"], data["country"], data["finnhubIndustry"], data["exchange"], data["marketCapitalization"]],
            { autoCommit: true }
        );
        console.log("insert stock finished " + data["ticker"]);
        return result.rowsAffected && result.rowsAffected > 0;
    }).catch((err) => {
        console.error("Insert failed : ", data["ticker"], err);
        return false;
    });
}

async function insertReportPerCompany(obj) {
    return await withOracleDB(async (connection) => {
        const data = (obj instanceof Map) ? Object.fromEntries(obj) : obj;
        await connection.execute(`
            INSERT INTO DebtEquity
            VALUES (:1, :2, :3)`,
            [data["liabilities"], data["equity"], data["liabilities"] / data["equity"]],
            { autoCommit: true }
        );
        let result = await connection.execute(`
            INSERT INTO Report
            VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)`,
            [data["id"], new Date(data["timestamp"]), data["year"], data["revenue"], data["income"], data["eps"], data["liabilities"], data["equity"], data["ticker"]],
            { autoCommit: true }
        );
        console.log("insert report finished " + data["ticker"]);
        return result.rowsAffected && result.rowsAffected > 0;
    });
}

async function insertPricePerStock(obj) {
    return await withOracleDB(async (connection) => {
        const ticker = obj["ticker"];
        const data = obj["data"].map(([date, info]) => [
            new Date(date),
            parseFloat(info["1. open"]),
            parseFloat(info["2. high"]),
            parseFloat(info["3. low"]),
            parseFloat(info["4. close"]),
            parseInt(info["5. volume"], 10),
            ticker
        ]);
        let result = await connection.executeMany(`
            INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
            VALUES (:1, :2, :3, :4, :5, :6, :7)`,
            data,
            { autoCommit: true }
        );
        console.log("insert history price finished: " + ticker + " rows: " + result.rowsAffected);
        return result.rowsAffected && result.rowsAffected > 0;
    }).catch((err) => {
        console.error("Insert failed : ", ticker, err);
        return false;
    });
}

async function fetchSettingDropdown(type) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`SELECT ${type}, COUNT(*) FROM Stock GROUP BY ${type}`);
        return result.rows;
    }).catch(() => {
        return [];
    });
}

async function fetchUser(email) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT * FROM Users WHERE email = :1`,
            [email]
        );
        if (result.rows.length === 0) {
            await connection.execute(`
                INSERT INTO Users
                VALUES (:1, :2, :3, :4)`,
                [email, null, null, 0],
                { autoCommit: true }
            );
            return [];
        } else {
            return result.rows;
        }
    }).catch(() => {
        return [];
    });
}

async function updateUser(email, industry, exchange, rec) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `UPDATE Users 
             SET preferredIndustry = :industry, preferredExchange = :exchange, showRecommendation = :rec
             WHERE email = :email`,
            {
                email,
                industry: industry || null,
                exchange: exchange || null,
                rec
            },
            { autoCommit: true }
        );
        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        return false;
    });
}

async function delUser(email) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            DELETE FROM Users
            WHERE email = :1`,
            [email],
            { autoCommit: true }
        );
        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        return false;
    });
}

async function fetchAllStock() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT * FROM Stock ORDER BY ticker');
        return result.rows;
    }).catch(() => {
        return [];
    });
}

async function filterStock(where) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`SELECT * FROM Stock WHERE ${where}`);
        return result.rows;
    }).catch(() => {
        return [];
    });
}

// For division
// Popular is defined as select all stock that is hold by all users
async function fetchPopularStock() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT DISTINCT h.ticker
            FROM Holds h
            WHERE NOT EXISTS (
                (SELECT u.email FROM Users u)
                MINUS
                (SELECT h1.email FROM Holds h1 WHERE h1.ticker = h.ticker)
            )
        `);
        return result.rows;
    }).catch(() => {
        return [];
    });
}

// For nested query
// The least popular of an industry is defined as the stock(s) that is hold by least amount of user
async function fetchLeastPopularStock(industry) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT s.ticker
            FROM Stock s LEFT JOIN Holds h ON h.ticker = s.ticker
            WHERE s.industry = :1
            GROUP BY s.ticker
            HAVING COUNT(*) <= ALL (
                SELECT COUNT(*)
                FROM Stock s1 LEFT JOIN Holds h1 ON h1.ticker = s1.ticker
                WHERE s1.industry = :1
                GROUP BY s1.ticker
            )`,
            [industry]
        );
        return result.rows;
    }).catch(() => {
        return [];
    });
}

async function verifyHolding(email, ticker) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT * FROM Holds WHERE email = :email AND ticker = :ticker`,
            {email, ticker}
        );
        const exists = result.rows && result.rows.length > 0;
        console.log('verifyHolding exists:', exists, 'rows:', result.rows);
        return exists;
    }).catch(() => {
        return false;
    });
}

async function addHolding(email, ticker) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            INSERT INTO Holds
            VALUES (:1, :2, SYSDATE)`,
            [email, ticker],
            { autoCommit: true }
        );
        console.log('addHolding result:', result.rowsAffected, 'for email:', email, 'ticker:', ticker);
        return result.rowsAffected && result.rowsAffected > 0;
    }).catch((err) => {
        console.error('Error in addHolding:', err);
        return false;
    });
}

async function delHolding(email, ticker) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            DELETE FROM Holds
            WHERE email = :1 AND ticker = :2`,
            [email, ticker],
            { autoCommit: true }
        );
        console.log('delHolding result:', result.rowsAffected, 'for email:', email, 'ticker:', ticker);
        return result.rowsAffected && result.rowsAffected > 0;
    }).catch((err) => {
        console.error('Error in delHolding:', err);
        return false;
    });
}

// Get all stocks held by a specific user (from Holds table)
async function getUserHeldStocks(email) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT h.ticker, s.name
             FROM Holds h
             JOIN Stock s ON h.ticker = s.ticker
             WHERE h.email = :email
             ORDER BY s.ticker`,
            [email]
        );
        return result.rows.map(row => ({ ticker: row[0], name: row[1] }));
    }).catch((err) => {
        console.error('Error in getUserHeldStocks:', err);
        return [];
    });
}

// Get price history for a specific stock ticker
async function getPriceHistory(ticker) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT timestamp, openPrice, highPrice, lowPrice, closePrice, volume
             FROM PriceHistory
             WHERE ticker = :ticker
             ORDER BY timestamp ASC`,
            [ticker]
        );
        return result.rows.map(row => ({
            date: row[0],
            open: row[1],
            high: row[2],
            low: row[3],
            close: row[4],
            volume: row[5]
        }));
    }).catch((err) => {
        console.error('Error in getPriceHistory:', err);
        return [];
    });
}

// Get all available stocks
async function getAllStocks() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT ticker, name, exchange, industry
             FROM Stock
             ORDER BY ticker`
        );
        return result.rows.map(row => ({
            ticker: row[0],
            name: row[1],
            exchange: row[2],
            industry: row[3]
        }));
    }).catch((err) => {
        console.error('Error in getAllStocks:', err);
        return [];
    });
}

// Get stocks filtered by holding duration using HAVING clause
// durationFilter: 'day' (>= 1 day), 'week' (>= 1 week), 'month' (>= 1 month), 'year' (>= 1 year)
async function getStocksByHoldingDuration(durationFilter) {
    return await withOracleDB(async (connection) => {
        let durationDays;
        switch(durationFilter) {
            case 'day':
                durationDays = 1;
                break;
            case 'week':
                durationDays = 7;
                break;
            case 'month':
                durationDays = 30;
                break;
            case 'year':
                durationDays = 365;
                break;
            default:
                return [];
        }

        const result = await connection.execute(`
            SELECT h.ticker, s.name, COUNT(*) as userCount,
                   ROUND(AVG(SYSDATE - h.holdTime), 2) as avgHoldDays
            FROM Holds h
            JOIN Stock s ON h.ticker = s.ticker
            GROUP BY h.ticker, s.name
            HAVING AVG(SYSDATE - h.holdTime) >= :1
            ORDER BY avgHoldDays DESC`,
            [durationDays]
        );

        return result.rows.map(row => ({
            ticker: row[0],
            name: row[1],
            userCount: row[2],
            avgHoldDays: row[3]
        }));
    }).catch((err) => {
        console.error('Error in getStocksByHoldingDuration:', err);
        return [];
    });
}

// Get user's held stocks filtered by holding duration using HAVING clause
// This function filters stocks held by a specific user based on how long they've held them
async function getUserHeldStocksByDuration(email, durationFilter) {
    return await withOracleDB(async (connection) => {
        let durationDays;
        switch(durationFilter) {
            case 'day':
                durationDays = 1;
                break;
            case 'week':
                durationDays = 7;
                break;
            case 'month':
                durationDays = 30;
                break;
            case 'year':
                durationDays = 365;
                break;
            default:
                return [];
        }

        const result = await connection.execute(`
            SELECT h.ticker, s.name, ROUND(SYSDATE - h.holdTime, 2) as holdDays
            FROM Holds h
            JOIN Stock s ON h.ticker = s.ticker
            WHERE h.email = :1
            GROUP BY h.ticker, s.name, h.holdTime
            HAVING (SYSDATE - h.holdTime) >= :2
            ORDER BY holdDays DESC`,
            [email, durationDays]
        );

        return result.rows.map(row => ({
            ticker: row[0],
            name: row[1],
            holdDays: row[2]
        }));
    }).catch((err) => {
        console.error('Error in getUserHeldStocksByDuration:', err);
        return [];
    });
}

async function fetchRecentPriceHistory(ticker, fields) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`
            SELECT ${fields}
            FROM PriceHistory
            WHERE ticker = :1
            ORDER BY timestamp DESC
            FETCH FIRST 1 ROW ONLY`,
            [ticker]
        );
        return result.rows;
    }).catch(() => {
        return [];
    });
}

// Join query: Get all users who hold a specific stock ticker
// Joins Holds and Stock tables using WHERE clause, user provides ticker in WHERE clause
async function getUsersHoldingStock(ticker) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `SELECT h.email, h.holdTime, s.name, s.industry, s.exchange
             FROM Holds h, Stock s
             WHERE h.ticker = s.ticker AND h.ticker = :1
             ORDER BY h.holdTime DESC`,
            [ticker]
        );
        return result.rows.map(row => ({
            email: row[0],
            holdTime: row[1],
            stockName: row[2],
            industry: row[3],
            exchange: row[4]
        }));
    }).catch((err) => {
        console.error('Error in getUsersHoldingStock:', err);
        return [];
    });
}

// other modules can check to make sure connection is connected before proceeding
const poolReady = initializeConnectionPool();
module.exports = {
    poolReady,
    withOracleDB,
    testOracleConnection,
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
    getAllStocks,
    getRecommendation1,
    getRecommendation2,
    getRecommendation3,
    getRecommendation4,
    getRecommendation5,
    getRecommendation6,
    getRecommendation7,
    insertAnalyst,
    checkAlreadyExists,
    getStocksByHoldingDuration,
    getUserHeldStocksByDuration,
    fetchRecentPriceHistory,
    getUsersHoldingStock
};