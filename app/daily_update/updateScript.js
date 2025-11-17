import 'dotenv/config';
import cron from 'node-cron';
import { updatePriceHistory } from './updateLogic.js';
import * as appService from '../appService.cjs';

const ENABLE_SCHEDULED_UPDATES = false;
const SCHEDULE_EXPRESSION = '0 17 * * 1-5';

async function runManualUpdate() {
  console.log("manual running");
  await appService.poolReady;

  try {
    await updatePriceHistory();
    console.log("manual finished successfully");
  } catch (err) {
    console.error("manual failed", err);
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

runManualUpdate();
