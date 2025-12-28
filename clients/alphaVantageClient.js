// Class interacting with alpha vantage API

const axios = require("axios");

const loadEnvFile = require('../utils/envUtil.js');
const path = require('path');
const envVariables = loadEnvFile(path.resolve(__dirname, './../.env'));

const ALPHAVANTAGE_API_KEY = envVariables.ALPHAVANTAGE_API_KEY;
const ALPHAVANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Obtain all historical stock price
async function getHistoricalStockPrice(ticker) {
    try {
        const url = `${ALPHAVANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(url);
        const result = Object.entries(response.data["Time Series (Daily)"]);
        return {ticker: ticker, data: result};
    } catch (error) {
        console.error('AlphaVantage API:', ticker, error);
        return null;
    }
}

// Obtain all historical divident price
async function getDivident(ticker) {
    try {
        const url = `${ALPHAVANTAGE_BASE_URL}?function=DIVIDENDS&symbol=${ticker}&apikey=${ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(url);
        const result = Object.entries(response.data["data"]);
        return {ticker: ticker, data: result};
    } catch (error) {
        console.error('AlphaVantage API:', ticker, error);
        return null;
    }
}

module.exports = {
    getHistoricalStockPrice,
    getDivident
};

