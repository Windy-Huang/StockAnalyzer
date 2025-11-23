Our project provides recommendations to people on which stocks to sell or buy. People
using this application would be able to make more informed decisions when
manipulating their stock market portfolio.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cd app
   copy .env.template .env
   # Edit .env with your API keys and database credentials
   ```

## Daily Update Script

The update script keeps stock data current by fetching:
- Daily price quotes (Finnhub API)
- Corporate actions: dividends and stock splits (AlphaVantage API)

### Quick Start

Run a manual update (from team_55/ directory):
```bash
node app/daily_update/updateScript.js
```

Test the AlphaVantage API connection:
```bash
node app/testing/testAlphaVantageAPI.js
```

For more details, see [app/daily_update/README.md](app/daily_update/README.md)