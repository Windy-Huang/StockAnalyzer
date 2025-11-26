import dotenv from 'dotenv';
import cron from 'node-cron';
import { updatePriceHistory, updateDividends, updateStockSplits } from './updateLogic.js';
import * as appService from '../appService.cjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Read from environment variable, defaults to false for manual mode
const ENABLE_SCHEDULED_UPDATES = process.env.RUN_SCHEDULED === 'true';
const SCHEDULE_EXPRESSION = '0 17 * * 1-5'; // 5 PM on weekdays (Mon-Fri)

/**
 * Runs all update functions: price history, dividends, and stock splits
 * This is the main update function that will be called either manually or on schedule
 */
async function runFullUpdate() {
  console.log("=== Starting full update ===");
  await appService.poolReady;

  try {
    // Update price history (daily quotes from Finnhub)
    console.log("\n[1/3] Updating price history...");
    await updatePriceHistory();
    console.log("Price history update completed");

    // Update dividends (from AlphaVantage)
    console.log("\n[2/3] Updating dividends...");
    await updateDividends();
    console.log("Dividend update completed");

    // Update stock splits (from AlphaVantage)
    console.log("\n[3/3] Updating stock splits...");
    await updateStockSplits();
    console.log("Stock split update completed");

    console.log("\n=== Full update finished successfully ===");
  } catch (err) {
    console.error("Update failed:", err);
    throw err;
  } finally {
    const oracledb = (await import('oracledb')).default;
    try {
      await oracledb.getPool().close(5);
      console.log("Pool closed");
    } catch (err) {
      console.error("Error closing pool:", err);
    }
  }
}

/**
 * Sets up scheduled updates using cron
 */
function setupScheduledUpdates() {
  console.log(`Scheduled updates enabled: ${SCHEDULE_EXPRESSION}`);
  console.log(`   Next run: 5 PM on weekdays (Mon-Fri)`);

  cron.schedule(SCHEDULE_EXPRESSION, async () => {
    console.log(`\n[${new Date().toISOString()}] Running scheduled update...`);
    try {
      await runFullUpdate();
    } catch (err) {
      console.error("Scheduled update failed:", err);
    }
  });

  console.log("Scheduler is running. Press Ctrl+C to stop.\n");
  // Keep the process alive
  process.stdin.resume();
}

// Main execution
if (ENABLE_SCHEDULED_UPDATES) {
  // Scheduled mode: set up cron job
  setupScheduledUpdates();
} else {
  // Manual mode: run once and exit
  console.log("Running in manual mode (set RUN_SCHEDULED=true in .env for automated mode)\n");
  runFullUpdate();
}
