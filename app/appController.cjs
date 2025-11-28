const express = require('express');
const appService = require('./appService.cjs');
const {initializeWithSP500, getCompany10Q, getReportByAccessNum, getCompanyProfile, getHistoricalStockPrice} = require("./startupScript.cjs");

const router = express.Router();

// ----------------------------------------------------------
// API endpoints
// Modify or extend these routes based on your project's needs.
router.get('/check-db-connection', async (req, res) => {
    const isConnect = await appService.testOracleConnection();
    if (isConnect) {
        res.send('connected');
    } else {
        res.send('unable to connect');
    }
});

router.post("/initiate-db", async (req, res) => {
    try {
        const initiateResult = await appService.initiateDB();
        if (initiateResult) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post("/insert-db", async (req, res) => {
    let rejected = await initializeWithSP500(appService.insertDBperCompany, getCompanyProfile, 2);
    if (!rejected) {
        rejected = await initializeWithSP500(appService.insertReportPerCompany, getCompany10Q, 2);
        if (!rejected) {
            rejected = await initializeWithSP500(appService.insertPricePerStock, getHistoricalStockPrice, 1);
            if (!rejected) res.json({ success: true });
        }
    }
    if (rejected) res.status(500).json({ success: false });
});

// Error code
// 404 means provided accessNum is invalid
// 422 means error in parsing, requires user assistance
// 500 means error in DB insertion
// 501 means error in DB insertion - PK already exist
// 502 means error in DB insertion - FK does not exist
router.post("/insert-report", async (req, res) => {
    const { accessNum } = req.body;
    console.log(accessNum);
    const parsedReport = await getReportByAccessNum(accessNum);
    if (parsedReport) {
        if (parsedReport.size < 9) {
            res.status(422).json({ success: false, report: Object.fromEntries(parsedReport) });
        } else {
            try {
                await appService.insertReportPerCompany(parsedReport);
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

router.post("/insert-report-parsed", async (req, res) => {
    const { report } = req.body;
    try {
        await appService.insertReportPerCompany(report);
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

// Specify industry: /menu?industry=tech
router.get('/menu', async (req, res) => {
    const tableContent = await appService.fetchAllStock();
    const popular = await appService.fetchPopularStock();
    if (req.query.industry) {
        res.json({data: tableContent, popular: popular, leastPopular: await appService.fetchLeastPopularStock(req.query.industry)});
    } else {
        res.json({data: tableContent, popular: popular, leastPopular: []});
    }
});

router.post("/query", async (req, res) => {
    const { where } = req.body;
    res.json({data: await appService.filterStock(where)});
});

router.get('/setting-dropdown', async (req, res) => {
    res.json({industry: await appService.fetchSettingDropdown("industry"), exchange: await appService.fetchSettingDropdown("exchange")});
});

router.post('/user', async (req, res) => {
    const { email } = req.body;
    res.json({data: await appService.fetchUser(email)});
});

router.put('/user', async (req, res) => {
    const { email, industry, exchange, rec } = req.body;
    const result = await appService.updateUser(email, industry, exchange, rec);
    if (result) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

router.delete('/user', async (req, res) => {
    const { email } = req.body;
    res.json({success: await appService.delUser(email)});
});

router.get('/holding', async (req, res) => {
    const result = await appService.verifyHolding(req.query.email, req.query.ticker);
    res.json({ exist: result });
});

router.put('/holding', async (req, res) => {
    const { email, ticker, add } = req.body;
    console.log('PUT /holding - email:', email, 'ticker:', ticker, 'add:', add);
    let result = false;
    if (add) {
        result = await appService.addHolding(email, ticker);
    } else {
        result = await appService.delHolding(email, ticker);
    }
    console.log('PUT /holding - result:', result);
    res.json({ success: result });
});

// Get all stocks held by a specific user
router.get('/user-held-stocks/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const stocks = await appService.getUserHeldStocks(email);
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching user held stocks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get price history for a specific stock
router.get('/price-history/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const priceHistory = await appService.getPriceHistory(ticker);
        res.json({ success: true, data: priceHistory });
    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all available stocks
router.get('/stocks', async (req, res) => {
    try {
        const stocks = await appService.getAllStocks();
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching stocks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get stocks filtered by holding duration (HAVING clause query)
router.get('/stocks-by-holding-duration/:duration', async (req, res) => {
    try {
        const { duration } = req.params;
        const stocks = await appService.getStocksByHoldingDuration(duration);
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching stocks by holding duration:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's held stocks filtered by holding duration (HAVING clause query)
router.get('/user-held-stocks/:email/duration/:duration', async (req, res) => {
    try {
        const { email, duration } = req.params;
        const stocks = await appService.getUserHeldStocksByDuration(email, duration);
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching user held stocks by duration:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/price-history', async (req, res) => {
    const { ticker, fields } = req.body;
    const result = await appService.fetchRecentPriceHistory(ticker, fields);
    res.json({ data: result });
});

// Get all users holding a specific stock (JOIN query with WHERE clause)
router.get('/users-holding-stock/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const users = await appService.getUsersHoldingStock(ticker);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users holding stock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;