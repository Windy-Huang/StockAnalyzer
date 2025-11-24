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

// initialize connection pool
async function initializeConnectionPool() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Connection pool started');
    } catch (err) {
        console.error('Initialization error: ' + err.message);
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
            await connection.execute('DROP TABLE Holds CASCADE CONSTRAINTS');
        } catch (err) { console.log('Holds might not exist'); }
        try {
            await connection.execute('DROP TABLE Users CASCADE CONSTRAINTS');
        } catch (err) { console.log('Users might not exist'); }
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
                FOREIGN KEY (email) REFERENCES Users(email) ON DELETE CASCADE,
                FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
                PRIMARY KEY (ticker, email)
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

async function fetchSettingDropdown(type) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`SELECT ${type}, COUNT(*) FROM Stock GROUP BY ${type}`);
        console.log(result.rows);
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

async function fetchStock() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT ticker FROM Stock ORDER BY ticker');
        console.log(result.rows);
        return result.rows;
    }).catch(() => {
        return [];
    });
}

async function filterStock(where) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(`SELECT * FROM Stock WHERE ${where}`);
        console.log(result.rows);
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
        console.log(result.rows);
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
            SELECT h.ticker
            FROM Holds h, Stock s
            WHERE h.ticker = s.ticker AND s.industry = :1
            GROUP BY h.ticker
            HAVING COUNT(*) <= ALL (
                SELECT COUNT(*)
                FROM Holds h1, Stock s1
                WHERE h1.ticker = s1.ticker AND s1.industry = :1
                GROUP BY h1.ticker
            )`,
            [industry]
        );
        console.log(result.rows);
        return result.rows;
    }).catch(() => {
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
    fetchUser,
    updateUser,
    fetchSettingDropdown,
    fetchStock,
    filterStock,
    fetchPopularStock,
    fetchLeastPopularStock
};