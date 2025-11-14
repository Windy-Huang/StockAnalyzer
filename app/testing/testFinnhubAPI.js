import { getStockQuote } from '../daily_update/finnhubClient.js';

const run = async () => {
  const data = await getStockQuote('AAPL');
  console.log(data);
};

run();