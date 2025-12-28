// Controllers that interact with third party clients

const fs = require('fs')
const finnhub = require('./finnhubClient');
const alphaVantage = require('./alphaVantageClient');
const initService = require('./../db/initialization');
const stockService = require('./../db/stock');

const WAIT_TIME = 15000; // cooldown time before sending the next batch
const API_LIMIT = 25;
const INIT_LIMIT = 10;

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

        // Sleep function to slow down finnhub request so its within rate
        const elapsed = Date.now() - startTime;
        const remaining = WAIT_TIME - elapsed;
        if (remaining > 0 && i + chunk < tickers.length) {
            console.log(`Waiting ${Math.ceil(remaining/1000)}s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
    }
    return rejected;
}

async function completeInitialization() {
    const stocks = (await stockService.getUninitializedStocks()).slice(0, INIT_LIMIT);
    if (stocks.length === 0) return 0;

    for (const info of stocks) {
        const ticker = info[0];
        const dividents = await alphaVantage.getDivident(ticker);
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
        const prices = await alphaVantage.getHistoricalStockPrice(ticker);
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

        try {
            await initService.insertDividentPerStock(dividents) && await initService.insertPricePerStock(prices);
        } catch (err) { console.log(err); }
    }

    return stocks.length * 2;
}

async function dailyDivUpdate(used) {
    const staleStocks = (await stockService.getStaleStocks()).slice(0, API_LIMIT-used);
    for (const info of staleStocks) {
        try {
            const dividents = await alphaVantage.getDivident(info[0]);
            await initService.insertDividentPerStock(dividents);
        } catch (err) { console.log(err); }
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
    }
}

async function dailyReportPriceUpdate() {
    const stocks = await stockService.fetchAllStock();
    for (const info of stocks) {
        const ticker = info[0];
        const price = await finnhub.getDailyStockPrice(ticker);
        await initService.insertDailyPricePerStock(price);

        try {
            const report = await finnhub.getCompany10Q(ticker);
            await initService.insertReportPerCompany(report);
        } catch (err) { console.log("Report all ready up to date " + ticker); }
    }
}

module.exports = {
    initializeWithSP500,
    completeInitialization,
    dailyDivUpdate,
    dailyReportPriceUpdate
};