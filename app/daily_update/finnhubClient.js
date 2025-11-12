const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, './.env') });

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetch latest quote data for ticker
 */
async function getStockQuote(ticker) {
  try {
    const url = `${BASE_URL}/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    console.log('Using API key:', FINNHUB_API_KEY);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Finnhub API error:', error.response?.data || error.message);
  }
}
/**
 * Fetch company news between two dates
 */
async function getCompanyNews(ticker, from, to) {
  const url = `${BASE_URL}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  const response = await axios.get(url);
  return response.data;
}

module.exports = {
    getStockQuote,
    getCompanyNews
};