import https from 'https';

/**
 * Fetches dividend data for a given stock symbol from AlphaVantage API
 * API endpoint: DIVIDENDS (returns dividend history)
 *
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL', 'MSFT')
 * @returns {Promise<Array>} Array of dividend objects with { date, amount }
 */
export async function getDividends(symbol) {
  const token = process.env.ALPHAVANTAGE_API_KEY;
  if (!token) throw new Error('Missing ALPHAVANTAGE_API_KEY');

  const url = `https://www.alphavantage.co/query?function=DIVIDENDS&symbol=${symbol}&apikey=${token}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`AlphaVantage HTTP ${res.statusCode}`));
          }

          const parsed = JSON.parse(data);

          // Check for API error messages
          if (parsed['Error Message']) {
            return reject(new Error(`AlphaVantage API Error: ${parsed['Error Message']}`));
          }

          if (parsed['Note']) {
            return reject(new Error(`AlphaVantage API Rate Limit: ${parsed['Note']}`));
          }

          // Extract dividend data from response
          const dividends = parsed.data || [];
          resolve(dividends);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Fetches stock split data for a given stock symbol from AlphaVantage API
 * API endpoint: SPLITS (returns stock split history)
 *
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL', 'TSLA')
 * @returns {Promise<Array>} Array of split objects with { date, split_factor }
 */
export async function getStockSplits(symbol) {
  const token = process.env.ALPHAVANTAGE_API_KEY;
  if (!token) throw new Error('Missing ALPHAVANTAGE_API_KEY');

  const url = `https://www.alphavantage.co/query?function=SPLITS&symbol=${symbol}&apikey=${token}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`AlphaVantage HTTP ${res.statusCode}`));
          }

          const parsed = JSON.parse(data);

          // Check for API error messages
          if (parsed['Error Message']) {
            return reject(new Error(`AlphaVantage API Error: ${parsed['Error Message']}`));
          }

          if (parsed['Note']) {
            return reject(new Error(`AlphaVantage API Rate Limit: ${parsed['Note']}`));
          }

          // Extract split data from response
          const splits = parsed.data || [];
          resolve(splits);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export default { getDividends, getStockSplits };
