import https from 'https';

export async function getStockQuote(symbol) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new Error('Missing FINNHUB_API_KEY');

  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`Finnhub HTTP ${res.statusCode}`));
          }
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export default { getStockQuote };
