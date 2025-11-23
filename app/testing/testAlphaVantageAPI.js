import dotenv from 'dotenv';
import { getDividends, getStockSplits } from '../daily_update/alphaVantageClient.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Test script for AlphaVantage API client
 * Tests both dividend and stock split data fetching
 */

async function testDividends() {
  console.log('\n=== Testing Dividend API ===');

  try {
    const ticker = 'MSFT'; // Microsoft pays regular dividends
    console.log(`\nFetching dividends for ${ticker}...`);

    const dividends = await getDividends(ticker);

    if (!dividends || dividends.length === 0) {
      console.log(`No dividends found for ${ticker}`);
      return;
    }

    console.log(`Found ${dividends.length} dividend records`);
    console.log('\nFirst 3 dividends:');
    dividends.slice(0, 3).forEach((div, idx) => {
      console.log(`  ${idx + 1}. Date: ${div.ex_dividend_date || div.date}, Amount: $${div.amount}`);
    });

  } catch (err) {
    console.error('Error testing dividends:', err.message);
  }
}

async function testStockSplits() {
  console.log('\n=== Testing Stock Split API ===');

  try {
    const ticker = 'AAPL'; // Apple has had stock splits
    console.log(`\nFetching stock splits for ${ticker}...`);

    const splits = await getStockSplits(ticker);

    if (!splits || splits.length === 0) {
      console.log(`No stock splits found for ${ticker}`);
      return;
    }

    console.log(`Found ${splits.length} stock split records`);
    console.log('\nAll splits:');
    splits.forEach((split, idx) => {
      console.log(`  ${idx + 1}. Date: ${split.effective_date || split.date}, Ratio: ${split.split_factor || split.ratio}`);
    });

  } catch (err) {
    console.error('Error testing stock splits:', err.message);
  }
}

async function runTests() {
  console.log('===========================================');
  console.log('  AlphaVantage API Client Test Suite');
  console.log('===========================================');

  // Check for API key
  if (!process.env.ALPHAVANTAGE_API_KEY) {
    console.error('\nERROR: ALPHAVANTAGE_API_KEY not found in environment');
    console.log('Please set your API key in the .env file');
    process.exit(1);
  }

  console.log('API Key found');

  // Run tests sequentially with delays to respect rate limits
  await testDividends();

  console.log('\nWaiting 15 seconds before next test (respecting rate limits)...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  await testStockSplits();

  console.log('\n===========================================');
  console.log('  All tests completed');
  console.log('===========================================\n');
}

runTests();
