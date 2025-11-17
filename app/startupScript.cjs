// Class for handling initial population of database
const fs = require("fs");
const axios = require("axios");

const dotenv = require("dotenv");
const path = require("path");
const {parseFinancialStatementURL} = require("./parseReport.cjs");
dotenv.config({ path: path.resolve(__dirname, './.env') });

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY;
const ALPHAVANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const WAIT_TIME = 35000; // cooldown time before sending the next batch

// Obtain historical stock price from alphavantage
async function getHistoricalStockPrice(ticker) {
    try {
        const url = `${ALPHAVANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${ALPHAVANTAGE_API_KEY}`;
        const response = await axios.get(url);
        const result = Object.entries(response.data["Time Series (Daily)"]).filter(([date, _]) => new Date(date) >= new Date("2020-01-01"));
        return {ticker: ticker, data: result};
    } catch (error) {
        console.error('AlphaVantage API:', ticker, error.response?.status ?? 'unknown');
        return null;
    }
}

// Obtain 10Q report per company from finnhub
async function getReportByAccessNum(accessNum) {
    try {
        const url = `${FINNHUB_BASE_URL}/stock/filings?accessNumber=${accessNum}&token=${FINNHUB_API_KEY}`;
        const response = await axios.get(url);
        const report = response.data[0];

        const parsedReport = await parseFinancialStatementURL(report["reportUrl"]);
        parsedReport.set("id", report["accessNumber"]);
        parsedReport.set("ticker", report["symbol"]);
        parsedReport.set("timestamp", report["filedDate"]);
        const [, year, month] = report["filedDate"].match(/(\d{4})-(\d{2})/) || [];
        parseInt(month) <= 2 ? parsedReport.set("year", parseInt(year)-1) :  parsedReport.set("year", parseInt(year));
        return parsedReport;
    } catch (error) {
        return null;
    }
}

// Obtain 10Q report per company from finnhub
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
        return parsedReport;
    } catch (error) {
        console.error('Finnhub API:', ticker, error.response?.status ?? 'unknown');
        return null;
    }
}

// Obtain company profile from finnhub
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

// Reads the ticker and insert the 500 companies
async function initializeWithSP500(dbFunc, finnhubFunc, chunk) {
    const tickers = fs.readFileSync("./SelectedTicker.txt", "utf8").split("\n");
    let rejected = false;

    for (let i = 0; i < tickers.length; i += chunk) {
        const section = tickers.slice(i, i + chunk);
        const startTime = Date.now();

        const promises = section.map(async ticker => {
            const profile = await finnhubFunc(ticker);
            if (profile) return dbFunc(profile);
            return null;
        });

        try {
            const results = await Promise.allSettled(promises);
            if (!rejected) {
                rejected = results.filter((elem) => {
                    return elem.status === "rejected";
                }).length !== 0;
            }
        } catch (e) {
            rejected = true;
        }

        // Sleep function to slow down finnhub request so its within rate (rate: 60/min, 30/sec)
        const elapsed = Date.now() - startTime;
        const remaining = WAIT_TIME - elapsed;
        if (remaining > 0 && i + chunk < tickers.length) {
            console.log(`Waiting ${Math.ceil(remaining/1000)}s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
    }
    return rejected;
}

module.exports = {
    initializeWithSP500,
    getCompanyProfile,
    getCompany10Q,
    getReportByAccessNum,
    getHistoricalStockPrice
};