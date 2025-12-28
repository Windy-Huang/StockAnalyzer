// Class interacting with finnhub API

const axios = require("axios");
const { parseFinancialStatementURL } = require("./parseReport");

const loadEnvFile = require('../utils/envUtil.js');
const path = require('path');
const envVariables = loadEnvFile(path.resolve(__dirname, './../.env'));

const FINNHUB_API_KEY = envVariables.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Obtain company profile
async function getCompanyProfile(ticker) {
    try {
        const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Finnhub API:', ticker, error.response?.status ?? 'unknown');
        return null;
    }
}

// Obtain latest 10Q report per company
async function getCompany10Q(ticker) {
    try {
        const url = `${FINNHUB_BASE_URL}/stock/filings?symbol=${ticker}&form=10-Q&token=${FINNHUB_API_KEY}`;
        const response = await axios.get(url);
        const report = response.data[0];

        const parsedReport = await parseFinancialStatementURL(report["reportUrl"]);
        parsedReport.set("id", report["accessNumber"]);
        parsedReport.set("ticker", ticker);
        parsedReport.set("timestamp", report["filedDate"]);
        const [, year, month] = report["filedDate"].match(/(\d{4})-(\d{2})/) || [];
        parseInt(month) <= 2 ? parsedReport.set("year", parseInt(year)-1) :  parsedReport.set("year", parseInt(year));
        return [parsedReport];
    } catch (error) {
        console.error('Finnhub API:', ticker, error.response?.status ?? 'unknown');
        return null;
    }
}

// Obtain last 4 10Q report per company
async function getCompany10QAnnual(ticker) {
    try {
        const url = `${FINNHUB_BASE_URL}/stock/filings?symbol=${ticker}&form=10-Q&token=${FINNHUB_API_KEY}`;
        const response = await axios.get(url);
        const reports = response.data.slice(0, 4);

        const parsedReports = [];
        for (const r of reports) {
            const res = await parseFinancialStatementURL(r["reportUrl"]);
            res.set("id", r["accessNumber"]);
            res.set("ticker", ticker);
            res.set("timestamp", r["filedDate"]);
            const [, year, month] = r["filedDate"].match(/(\d{4})-(\d{2})/) || [];
            parseInt(month) <= 2 ? res.set("year", parseInt(year) - 1) : res.set("year", parseInt(year));
            parsedReports.push(res);
        }
        return parsedReports;
    } catch (error) {
        console.error('Finnhub API:', ticker, error);
        return null;
    }
}

// Obtain daily price per company
async function getDailyStockPrice(ticker) {
    try {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
        const response = await axios.get(url);

        const toNum = (x) => {return Number.isFinite(x) ? x : null};
        return {
            ticker: ticker,
            timestamp: new Date(),
            open_price: toNum(response.data['o']),
            high_price: toNum(response.data['h']),
            low_price: toNum(response.data['l']),
            close_price: toNum(response.data['c']),
        };
    } catch (error) {
        console.error('Finnhub API:', ticker, error.response?.status ?? 'unknown');
        return null;
    }
}

module.exports = {
    getCompanyProfile,
    getCompany10Q,
    getCompany10QAnnual,
    getDailyStockPrice,
};