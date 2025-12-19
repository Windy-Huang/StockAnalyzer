import * as appService from '../appService_ora.cjs';

// remove any top-level import of finnhubClient
// import finnhubClient from './finnhubClient.cjs';  ← delete this line

function toNum(x) {
  return Number.isFinite(x) ? x : null;
}

/**
 * Gets the next available actionID from the database
 * Looks at both StockSplit and Divident tables to find the max actionID
 */
async function getNextActionID(connection) {
  const result = await connection.execute(`
    SELECT NVL(MAX(actionID), 0) as maxID FROM (
      SELECT actionID FROM StockSplit
      UNION
      SELECT actionID FROM Divident
    )
  `);
  const maxID = result.rows[0][0] || 0;
  return maxID + 1;
}

export async function updatePriceHistory() {
  await appService.poolReady;

  // dynamically import inside the function (works in ES module context)
  const { default: finnhubClient } = await import('./finnhubClient.js');

  return await appService.withOracleDB(async (connection) => {
    const result = await connection.execute(`SELECT ticker FROM Stock`);
    const tickers = result.rows.map(row => row[0]);
    console.log('Tickers count:', tickers.length);
    console.log('First few tickers:', tickers.slice(0, 10));

    for (const ticker of tickers) {
      try {
        const quote = await finnhubClient.getStockQuote(ticker);
        const timestamp = new Date();

        const open   = toNum(quote.o);
        const high   = toNum(quote.h);
        const low    = toNum(quote.l);
        const close  = toNum(quote.c);
        const volume = toNum(quote.v);

        const upd = await connection.execute(
          `UPDATE PriceHistory
             SET openPrice=:open, highPrice=:high, lowPrice=:low, closePrice=:close, volume=:volume
           WHERE ticker=:ticker AND TRUNC(timestamp)=TRUNC(:timestamp)`,
          { ticker, timestamp, open, high, low, close, volume }
        );

        if (upd.rowsAffected === 0) {
          await connection.execute(
            `INSERT INTO PriceHistory
               (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
             VALUES
               (:timestamp, :open, :high, :low, :close, :volume, :ticker)`,
            { ticker, timestamp, open, high, low, close, volume }
          );
          console.log(`Inserted ${ticker}: ${close}`);
        } else {
          console.log(`Updated ${ticker}: ${close}`);
        }

      } catch (err) {
        console.error(`Error updating ${ticker}:`, err.message);
      }
    }

    await connection.commit();
    console.log("committed.");
    return true;
  });
}

/**
 * Updates dividend data for all stocks from AlphaVantage API
 * Inserts new dividends into Divident and Updates tables
 * Enforces total disjoint ISA constraint at application level
 */
export async function updateDividends() {
  await appService.poolReady;

  // dynamically import inside the function
  const { default: alphaVantageClient } = await import('./alphaVantageClient.js');

  return await appService.withOracleDB(async (connection) => {
    const result = await connection.execute(`SELECT ticker FROM Stock`);
    const tickers = result.rows.map(row => row[0]);
    console.log('Fetching dividends for', tickers.length, 'tickers');

    let totalInserted = 0;

    for (const ticker of tickers) {
      try {
        const dividends = await alphaVantageClient.getDividends(ticker);

        if (!dividends || dividends.length === 0) {
          console.log(`No dividends found for ${ticker}`);
          continue;
        }

        // Process each dividend
        for (const div of dividends) {
          try {
            // Parse dividend data from AlphaVantage response
            // Expected format: { ex_dividend_date, amount }
            const timestamp = new Date(div.ex_dividend_date || div.date);
            const amountPerShare = parseFloat(div.amount);
            const dividentType = div.type || 'Cash'; // Default to 'Cash' if not specified

            if (!timestamp || isNaN(amountPerShare)) {
              console.warn(`Invalid dividend data for ${ticker}:`, div);
              continue;
            }

            // Check if this dividend already exists (by ticker and date)
            const existingCheck = await connection.execute(
              `SELECT d.actionID
               FROM Divident d
               JOIN Updates u ON d.actionID = u.actionID
               WHERE u.ticker = :ticker AND TRUNC(d.timestamp) = TRUNC(:timestamp)`,
              { ticker, timestamp }
            );

            if (existingCheck.rows.length > 0) {
              // Dividend already exists, skip
              continue;
            }

            // Get next actionID
            const actionID = await getNextActionID(connection);

            // Insert into Divident table (subtype)
            await connection.execute(
              `INSERT INTO Divident (actionID, timestamp, amountPerShare, dividentType)
               VALUES (:actionID, :timestamp, :amountPerShare, :dividentType)`,
              { actionID, timestamp, amountPerShare, dividentType }
            );

            // Insert into Updates table (supertype with ISA relationship)
            await connection.execute(
              `INSERT INTO Updates (actionID, ticker)
               VALUES (:actionID, :ticker)`,
              { actionID, ticker }
            );

            console.log(`Inserted dividend for ${ticker}: $${amountPerShare} on ${timestamp.toISOString().split('T')[0]}`);
            totalInserted++;

          } catch (err) {
            console.error(`Error inserting dividend for ${ticker}:`, err.message);
          }
        }

        // Add delay to respect API rate limits (AlphaVantage free tier: 25 calls/day)
        // Wait 3 seconds between calls to be safe
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (err) {
        console.error(`Error fetching dividends for ${ticker}:`, err.message);
      }
    }

    await connection.commit();
    console.log(`Dividend update complete. Inserted ${totalInserted} new dividends.`);
    return true;
  });
}

/**
 * Updates stock split data for all stocks from AlphaVantage API
 * Inserts new stock splits into StockSplit and Updates tables
 * Enforces total disjoint ISA constraint at application level
 */
export async function updateStockSplits() {
  await appService.poolReady;

  // dynamically import inside the function
  const { default: alphaVantageClient } = await import('./alphaVantageClient.js');

  return await appService.withOracleDB(async (connection) => {
    const result = await connection.execute(`SELECT ticker FROM Stock`);
    const tickers = result.rows.map(row => row[0]);
    console.log('Fetching stock splits for', tickers.length, 'tickers');

    let totalInserted = 0;

    for (const ticker of tickers) {
      try {
        const splits = await alphaVantageClient.getStockSplits(ticker);

        if (!splits || splits.length === 0) {
          console.log(`No stock splits found for ${ticker}`);
          continue;
        }

        // Process each split
        for (const split of splits) {
          try {
            // Parse split data from AlphaVantage response
            // Expected format: { effective_date, split_factor } where split_factor is like "4:1"
            const timestamp = new Date(split.effective_date || split.date);

            // Parse split factor (e.g., "4:1" means 4-for-1, ratio = 1/4 = 0.25)
            let splitRatio;
            if (split.split_factor) {
              const [numerator, denominator] = split.split_factor.split(':').map(parseFloat);
              splitRatio = denominator / numerator; // 1/4 for a 4:1 split
            } else {
              splitRatio = parseFloat(split.ratio);
            }

            if (!timestamp || isNaN(splitRatio)) {
              console.warn(`Invalid split data for ${ticker}:`, split);
              continue;
            }

            // Check if this split already exists (by ticker and date)
            const existingCheck = await connection.execute(
              `SELECT s.actionID
               FROM StockSplit s
               JOIN Updates u ON s.actionID = u.actionID
               WHERE u.ticker = :ticker AND TRUNC(s.timestamp) = TRUNC(:timestamp)`,
              { ticker, timestamp }
            );

            if (existingCheck.rows.length > 0) {
              // Split already exists, skip
              continue;
            }

            // Get next actionID
            const actionID = await getNextActionID(connection);

            // Insert into StockSplit table (subtype)
            await connection.execute(
              `INSERT INTO StockSplit (actionID, timestamp, splitRatio)
               VALUES (:actionID, :timestamp, :splitRatio)`,
              { actionID, timestamp, splitRatio }
            );

            // Insert into Updates table (supertype with ISA relationship)
            await connection.execute(
              `INSERT INTO Updates (actionID, ticker)
               VALUES (:actionID, :ticker)`,
              { actionID, ticker }
            );

            console.log(`Inserted stock split for ${ticker}: ${split.split_factor || splitRatio} on ${timestamp.toISOString().split('T')[0]}`);
            totalInserted++;

          } catch (err) {
            console.error(`Error inserting split for ${ticker}:`, err.message);
          }
        }

        // Add delay to respect API rate limits (AlphaVantage free tier: 25 calls/day)
        // Wait 3 seconds between calls to be safe
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (err) {
        console.error(`Error fetching splits for ${ticker}:`, err.message);
      }
    }

    await connection.commit();
    console.log(`Stock split update complete. Inserted ${totalInserted} new splits.`);
    return true;
  });
}
