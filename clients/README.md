# Daily Update Script

This script keeps stock data up-to-date by fetching:
- Daily price quotes (Finnhub API)
- Corporate actions: dividends and stock splits (AlphaVantage API)

## Installation

```bash
npm install axios dotenv node-cron
```

## Configuration

1. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```

2. Edit `.env` and add your API keys:
   ```
   FINNHUB_API_KEY=your_finnhub_key
   ALPHAVANTAGE_API_KEY=your_alphavantage_key
   RUN_SCHEDULED=false
   ```

## Usage

IMPORTANT: All commands should be run from the parent directory (team_55/), not from the app/ directory.

### Manual Mode (default)
Runs once and exits:
```bash
# From team_55/ directory:
node app/daily_update/updateScript.js
```

### Scheduled Mode
Set `RUN_SCHEDULED=true` in `app/.env` to run automatically at 5 PM on weekdays:
```bash
# In app/.env:
RUN_SCHEDULED=true

# Then run from team_55/ directory:
node app/daily_update/updateScript.js
```

The script will keep running and execute updates on schedule.

## Testing

IMPORTANT: Run all tests from the parent directory (team_55/).

Test AlphaVantage API:
```bash
node app/testing/testAlphaVantageAPI.js
```

Test Finnhub API:
```bash
node app/testing/testFinnhubAPI.js
```

Test complete update logic:
```bash
node app/testing/testUpdateLogic.js
```

## Files

- `updateScript.js` - Main entry point, handles manual/scheduled execution
- `updateLogic.js` - Core update functions for price history, dividends, and splits
- `finnhubClient.js` - Finnhub API wrapper for stock quotes
- `alphaVantageClient.js` - AlphaVantage API wrapper for dividends and splits

## Database Schema

The script maintains a Total Disjoint ISA relationship:
- `Updates` (supertype): actionID + ticker
- `Divident` (subtype): actionID, timestamp, amountPerShare, dividentType
- `StockSplit` (subtype): actionID, timestamp, splitRatio

Each corporate action must be either a dividend OR a stock split (total + disjoint).

## Rate Limits

- Finnhub Free: 60 calls/minute
- AlphaVantage Free: 25 calls/day

The script includes delays to respect these limits.
