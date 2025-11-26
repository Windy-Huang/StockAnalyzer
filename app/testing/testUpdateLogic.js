import dotenv from 'dotenv';
import { updatePriceHistory, updateDividends, updateStockSplits } from '../daily_update/updateLogic.js';
import * as appService from '../appService.cjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Comprehensive test suite for update logic
 * Tests price history, dividend, and stock split updates
 */

async function testPriceHistoryUpdate() {
  console.log('\n=== Testing Price History Update ===\n');

  try {
    console.log('Running updatePriceHistory()...');
    const result = await updatePriceHistory();

    if (result) {
      console.log('SUCCESS: Price history update completed');
    } else {
      console.log('WARNING: Price history update returned false');
    }
  } catch (err) {
    console.error('ERROR: Price history update failed');
    console.error(err.message);
    throw err;
  }
}

async function testDividendUpdate() {
  console.log('\n=== Testing Dividend Update ===\n');

  try {
    console.log('Running updateDividends()...');
    const result = await updateDividends();

    if (result) {
      console.log('SUCCESS: Dividend update completed');
    } else {
      console.log('WARNING: Dividend update returned false');
    }
  } catch (err) {
    console.error('ERROR: Dividend update failed');
    console.error(err.message);
    throw err;
  }
}

async function testStockSplitUpdate() {
  console.log('\n=== Testing Stock Split Update ===\n');

  try {
    console.log('Running updateStockSplits()...');
    const result = await updateStockSplits();

    if (result) {
      console.log('SUCCESS: Stock split update completed');
    } else {
      console.log('WARNING: Stock split update returned false');
    }
  } catch (err) {
    console.error('ERROR: Stock split update failed');
    console.error(err.message);
    throw err;
  }
}

async function verifyDatabaseRecords() {
  console.log('\n=== Verifying Database Records ===\n');

  try {
    await appService.withOracleDB(async (connection) => {
      // Check PriceHistory count
      const priceResult = await connection.execute(
        `SELECT COUNT(*) as count FROM PriceHistory`
      );
      console.log(`PriceHistory records: ${priceResult.rows[0][0]}`);

      // Check Divident count
      const divResult = await connection.execute(
        `SELECT COUNT(*) as count FROM Divident`
      );
      console.log(`Dividend records: ${divResult.rows[0][0]}`);

      // Check StockSplit count
      const splitResult = await connection.execute(
        `SELECT COUNT(*) as count FROM StockSplit`
      );
      console.log(`StockSplit records: ${splitResult.rows[0][0]}`);

      // Check Updates count (should match Divident + StockSplit)
      const updatesResult = await connection.execute(
        `SELECT COUNT(*) as count FROM Updates`
      );
      console.log(`Updates records: ${updatesResult.rows[0][0]}`);

      // Verify ISA constraint: Updates count should equal Divident + StockSplit
      const totalActions = divResult.rows[0][0] + splitResult.rows[0][0];
      const updatesCount = updatesResult.rows[0][0];

      if (totalActions === updatesCount) {
        console.log('\nTotal Disjoint ISA Constraint: VALID');
        console.log(`  Dividends + Splits = ${totalActions}`);
        console.log(`  Updates = ${updatesCount}`);
      } else {
        console.log('\nWARNING: Total Disjoint ISA Constraint may be violated');
        console.log(`  Dividends + Splits = ${totalActions}`);
        console.log(`  Updates = ${updatesCount}`);
      }

      // Sample recent records
      console.log('\nRecent price history (last 3):');
      const recentPrices = await connection.execute(
        `SELECT ticker, timestamp, closePrice
         FROM PriceHistory
         ORDER BY timestamp DESC
         FETCH FIRST 3 ROWS ONLY`
      );
      recentPrices.rows.forEach(row => {
        console.log(`  ${row[0]}: $${row[2]} on ${row[1].toISOString().split('T')[0]}`);
      });

      // Sample dividends
      console.log('\nRecent dividends (last 3):');
      const recentDivs = await connection.execute(
        `SELECT u.ticker, d.timestamp, d.amountPerShare, d.dividentType
         FROM Divident d
         JOIN Updates u ON d.actionID = u.actionID
         ORDER BY d.timestamp DESC
         FETCH FIRST 3 ROWS ONLY`
      );
      recentDivs.rows.forEach(row => {
        console.log(`  ${row[0]}: $${row[2]} (${row[3]}) on ${row[1].toISOString().split('T')[0]}`);
      });

      // Sample splits
      console.log('\nRecent stock splits (last 3):');
      const recentSplits = await connection.execute(
        `SELECT u.ticker, s.timestamp, s.splitRatio
         FROM StockSplit s
         JOIN Updates u ON s.actionID = u.actionID
         ORDER BY s.timestamp DESC
         FETCH FIRST 3 ROWS ONLY`
      );
      recentSplits.rows.forEach(row => {
        console.log(`  ${row[0]}: ${row[2]} on ${row[1].toISOString().split('T')[0]}`);
      });
    });
  } catch (err) {
    console.error('ERROR: Database verification failed');
    console.error(err.message);
    throw err;
  }
}

async function runAllTests() {
  console.log('===========================================');
  console.log('  Update Logic Test Suite');
  console.log('===========================================');

  await appService.poolReady;

  try {
    // Test 1: Price History Update
    await testPriceHistoryUpdate();

    console.log('\nWaiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: Dividend Update
    // Note: This will be slow due to API rate limits
    console.log('\nNOTE: Dividend update may take several minutes due to API rate limits');
    await testDividendUpdate();

    console.log('\nWaiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 3: Stock Split Update
    console.log('\nNOTE: Stock split update may take several minutes due to API rate limits');
    await testStockSplitUpdate();

    // Test 4: Verify database records
    await verifyDatabaseRecords();

    console.log('\n===========================================');
    console.log('  All Tests Completed Successfully');
    console.log('===========================================\n');

  } catch (err) {
    console.error('\nTest suite failed:', err);
  } finally {
    const oracledb = (await import('oracledb')).default;
    try {
      await oracledb.getPool().close(5);
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing pool:', err);
    }
  }
}

// Run tests
runAllTests();
