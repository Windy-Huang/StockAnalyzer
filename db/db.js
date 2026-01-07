// Configure the Postgres DB connection requirements

const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const loadEnvFile = require('../utils/envUtil');
const path = require('path');
const envVariables = loadEnvFile(path.resolve(__dirname, './../.env'));

let pool;
if (envVariables.NODE_ENV === 'test') {
    // Mock a db for testing
    const memDb = newDb();
    const { Pool: MemPool } = memDb.adapters.createPg();
    pool = new MemPool();
} else {
    // Instantiate connection to real db
    pool = new Pool({
        user: envVariables.PG_USER,
        password: envVariables.PG_PASS,
        host: envVariables.PG_HOST,
        port: envVariables.PG_PORT,
        database: envVariables.PG_DB,
        ssl: envVariables.PGSSLMODE === 'require' ? {rejectUnauthorized: false} : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
}

async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error('Query error:', err.message);
        throw err;
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};