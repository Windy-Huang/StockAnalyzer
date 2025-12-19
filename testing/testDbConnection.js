// app/testDbConnection.js
import * as appService from '../appService_ora.cjs';

async function testConnection() {
  console.log('Testing Oracle connection...');

  await appService.poolReady; // wait for pool to initialize

  try {
    const result = await appService.withOracleDB(async (connection) => {
      const test = await connection.execute('SELECT * FROM demotable');
      console.log('Connection OK. Query result:', test.rows);
      return true;
    });

    console.log('successful:', result);
  } catch (err) {
    console.error('failed:', err);
  } finally {
    const oracledb = (await import('oracledb')).default;
    try {
      await oracledb.getPool().close(5);
      console.log('Pool closed.');
    } catch (err) {
      console.error('Error closing pool:', err);
    }
  }
}

testConnection();
