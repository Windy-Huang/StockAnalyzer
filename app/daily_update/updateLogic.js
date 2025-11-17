import * as appService from '../appService.cjs';

// remove any top-level import of finnhubClient
// import finnhubClient from './finnhubClient.cjs';  ← delete this line

function toNum(x) {
  return Number.isFinite(x) ? x : null;
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
               (priceHistoryID, timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
             VALUES
               (priceHistory_seq.NEXTVAL, :timestamp, :open, :high, :low, :close, :volume, :ticker)`,
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
