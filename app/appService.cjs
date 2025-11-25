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
    poolTimeout: 60
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

async function fetchDemotableFromDb() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT * FROM DEMOTABLE');
        return result.rows;
    }).catch(() => {
        return [];
    });
}

async function initiateDemotable() {
    return await withOracleDB(async (connection) => {
        try {
            await connection.execute(`DROP TABLE DEMOTABLE`);
        } catch(err) {
            console.log('Table might not exist, proceeding to create...');
        }

        const result = await connection.execute(`
            CREATE TABLE DEMOTABLE (
                id NUMBER PRIMARY KEY,
                name VARCHAR2(20)
            )
        `);
        return true;
    }).catch(() => {
        return false;
    });
}

async function insertDemotable(id, name) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `INSERT INTO DEMOTABLE (id, name) VALUES (:id, :name)`,
            [id, name],
            { autoCommit: true }
        );

        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        return false;
    });
}

async function updateNameDemotable(oldName, newName) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `UPDATE DEMOTABLE SET name=:newName where name=:oldName`,
            [newName, oldName],
            { autoCommit: true }
        );

        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        return false;
    });
}

async function countDemotable() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT Count(*) FROM DEMOTABLE');
        return result.rows[0][0];
    }).catch(() => {
        return -1;
    });
}

async function initiateDB() {
    return await withOracleDB(async (connection) => {
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
        console.log("db initiate finished");
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
        const data = Object.fromEntries(obj);
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
    }).catch((err) => {
        console.error("Insert failed : ", data["ticker"], err);
        return false;
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

async function logFromDb() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT * FROM Stock');
        return result.rows;
    }).catch(() => {
        return [];
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

// other modules can check to make sure connection is connected before proceeding
const poolReady = initializeConnectionPool();
module.exports = {
    poolReady,
    withOracleDB,
    testOracleConnection,
    fetchDemotableFromDb,
    initiateDemotable,
    insertDemotable,
    updateNameDemotable,
    countDemotable,
    initiateDB,
    insertDBperCompany,
    insertReportPerCompany,
    insertPricePerStock,
    logFromDb,
    getUserHeldStocks,
    getPriceHistory,
    getAllStocks
};