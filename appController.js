// Rest API endpoints

const express = require('express');
const router = express.Router();

const initService = require('./db/initialization');
const stockService = require('./db/stock');
const userService = require('./db/user');
const recommendationService = require('./db/recommendation');

const { initializeWithSP500 } = require("./clients/scripts");
const { getCompanyProfile, getCompany10QAnnual } = require("./clients/finnhubClient");

// Get recommendation (buy/hold/sell) and reasons for the stock
router.post("/v1/recommendations/:ticker", async (req, res) => {
    const { ticker } = req.params;

    try {
        const result = await recommendationService.getRecommendation(ticker);
        if (result.length > 0) {
            res.json({ success: true, msg: result });
        } else {
            // Obtain stock metrics
            const [pe, eps, roe, ma, mom, de, div] = await Promise.all([
                recommendationService.getPERation(ticker),
                recommendationService.getEPSGrowth(ticker),
                recommendationService.getROE(ticker),
                recommendationService.getMovingAverage(ticker),
                recommendationService.getMomentum(ticker),
                recommendationService.getDERatio(ticker),
                recommendationService.getDividentYield(ticker)
            ]);

            // Calculated weighted final score
            let weightedSum = 0;
            let totalValidWeight = 0;
            const tags = [];
            const processMetric = (value, weight, positiveTag, negativeTag) => {
                if (value !== -1) {
                    weightedSum += (value * weight);
                    totalValidWeight += weight;
                    if (value === 1 && positiveTag) tags.push(positiveTag);
                    if (value === 0 && negativeTag) tags.push(negativeTag);
                }
            };

            processMetric(pe,  0.5, "[Cheap Valuation]", "[Overvalued]");
            processMetric(eps, 2.0, "[Great Growth]",    "[Slow Growth]");
            processMetric(roe, 2.0, "[High Efficiency]", "[Low Efficiency]");
            processMetric(mom, 1.5, "[Strong Momentum]", "[Negative Momentum]");
            processMetric(ma,  1.0, null,   null);
            processMetric(de,  1.5, "[Healthy Debt]",    "[Huge Debt Risk]");
            processMetric(div, 0.5, "[Pays Dividend]",   null);

            // Error handling
            if (totalValidWeight === 0) {
                return res.status(501).json({ success: false, msg: "Insufficient Data" });
            }

            const finalScore = Math.round((weightedSum / totalValidWeight) * 7);
            let action = "HOLD";
            if (finalScore >= 5) {
                action = "BUY";
            } else if (finalScore <= 2) {
                action = "SELL";
            }
            let recommendation = `${action} - ${tags.join(" ")}`;

            await recommendationService.insertRecommendation(ticker, recommendation);
            res.json({ success: true, msg: recommendation });
        }
    } catch (error) {
        console.error("Recommendation Error:", error);
        res.status(500).json({ success: false, msg: "Server Error" });
    }
});

// Get popularity recommendation of an industry
router.get('/v1/recommendations', async (req, res) => {
    const { industry } = req.query;
    const tableContent = await stockService.fetchAllStock();
    const popular = await stockService.fetchPopularStock();
    res.json({ data: tableContent, popular: popular, leastPopular: (industry ? await stockService.fetchLeastPopularStock(req.query.industry) : []) });
});

// Insert new company into db
router.post("/v1/companies", async (req, res) => {
    try {
        if (!await initService.initiateDB()) throw new Error("DB Init Failed");

        const steps = [
            { task: initService.insertDBperCompany, api: getCompanyProfile, limit: 10 },
            { task: initService.insertReportPerCompany, api: getCompany10QAnnual, limit: 5 }
        ];
        for (const step of steps) {
            const rejected = await initializeWithSP500(step.task, step.api, step.limit);
            if (rejected) throw new Error(`Failed at step: ${step.task.name}`);
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Insert new report for a company with access number
// Error code
// 404 means provided accessNum is invalid
// 422 means error in parsing, requires user assistance
// 500 means error in DB insertion
// 501 means error in DB insertion - PK already exist
// 502 means error in DB insertion - FK does not exist
router.post("/v1/reports/:id", async (req, res) => {
    const { id } = req.params;
    const parsedReport = await getReportByAccessNum(id);
    if (parsedReport) {
        if (parsedReport.size < 9) {
            res.status(422).json({ success: false, report: Object.fromEntries(parsedReport) });
        } else {
            try {
                await initService.insertReportPerCompany(parsedReport);
                res.json({ success: true });
            } catch (e) {
                console.error("Insert failed:", e);
                if (e.errorNum === 1) {
                    res.status(501).json({ success: false });
                } else if (e.errorNum === 2291) {
                    res.status(502).json({ success: false });
                } else {
                    res.status(500).json({ success: false });
                }
            }
        }
    } else {
        res.status(404).json({ success: false });
    }
});

// Insert new report for company with entered fields
router.post("/v1/reports", async (req, res) => {
    const { report } = req.body;
    try {
        await initService.insertReportPerCompany(report);
        res.json({ success: true });
    } catch (e) {
        console.error("Insert failed:", e);
        if (e.errorNum === 1) {
            res.status(501).json({ success: false });
        } else if (e.errorNum === 2291) {
            res.status(502).json({ success: false });
        } else {
            res.status(500).json({ success: false });
        }
    }
});

// Obtain settings and counts for the db
router.get('/v1/settings', async (req, res) => {
    res.json({industry: await userService.fetchSettingDropdown("industry"), exchange: await userService.fetchSettingDropdown("exchange")});
});

// Obtain the setting of the specified user
router.post('/v1/users/:email', async (req, res) => {
    const { email } = req.params;
    res.json({data: await userService.fetchUser(email)});
});

// Update the setting of the specified user
router.put('/v1/users/:email', async (req, res) => {
    const { email } = req.params;
    const { industry, exchange, rec } = req.body;
    const result = await userService.updateUser(email, industry, exchange, rec);
    if (result) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

// Delete the specified user
router.delete('/v1/users/:email', async (req, res) => {
    const { email } = req.params;
    res.json({success: await userService.delUser(email)});
});

// Check whether the user hold this stock or not
router.get('/v1/users/:email/holdings/:ticker', async (req, res) => {
    const { email, ticker } = req.params;
    const result = await stockService.verifyHolding(email, ticker);
    res.json({ exist: result });
});

// Hold or unhold a stock for the specified user
router.put('/v1/users/:email/holdings/:ticker', async (req, res) => {
    const { email, ticker } = req.params;
    const { add } = req.query;

    let result = false;
    if (add) {
        result = await stockService.addHolding(email, ticker);
    } else {
        result = await stockService.delHolding(email, ticker);
    }
    console.log('PUT /holding - email:', email, 'ticker:', ticker, 'add:', add, 'result:', result);
    res.json({ success: result });
});

// Obtain stocks that satisfy the filter condition
router.put("/v1/stocks", async (req, res) => {
    const { where } = req.body;
    res.json({data: await stockService.filterStock(where)});
});

// Get price history for a specific stock
router.get('/v1/stocks/:ticker/price-histories', async (req, res) => {
    try {
        const { ticker } = req.params;
        const priceHistory = await stockService.getPriceHistory(ticker);
        res.json({ success: true, data: priceHistory });
    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get most recent price history for a specific stock
router.put('/v1/stocks/:ticker/price-histories', async (req, res) => {
    const { ticker } = req.params;
    const { fields } = req.body;
    const result = await stockService.fetchRecentPriceHistory(ticker, fields);
    res.json({ data: result });
});

// Get all stocks held by a specific user
router.get('/v1/users/:email/stocks', async (req, res) => {
    try {
        const { email } = req.params;
        const stocks = await stockService.getUserHeldStocks(email);
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching user held stocks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's held stocks filtered by holding duration
router.get('/v1/users/:email/durations/:duration', async (req, res) => {
    try {
        const { email, duration } = req.params;
        const stocks = await stockService.getUserHeldStocksByDuration(email, duration);
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching user held stocks by duration:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;