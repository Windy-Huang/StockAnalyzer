import dotenv from 'dotenv';
import { getStockQuote } from '../daily_update/finnhubClient.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const run = async () => {
  console.log('===========================================');
  console.log('  Finnhub API Client Test');
  console.log('===========================================\n');

  // Check for API key
  if (!process.env.FINNHUB_API_KEY) {
    console.error('ERROR: FINNHUB_API_KEY not found in environment');
    console.log('Please set your API key in the .env file');
    process.exit(1);
  }

  console.log('API Key found');
  console.log('Fetching stock quote for AAPL...\n');

  try {
    const data = await getStockQuote('AAPL');
    console.log('Success! Received stock quote:');
    console.log('  Current Price:', data.c);
    console.log('  High:', data.h);
    console.log('  Low:', data.l);
    console.log('  Open:', data.o);
    console.log('  Previous Close:', data.pc);
    console.log('\nRaw response:', data);
  } catch (err) {
    console.error('Error fetching stock quote:', err.message);
    process.exit(1);
  }

  console.log('\n===========================================');
  console.log('  Test completed successfully');
  console.log('===========================================\n');
};

run();