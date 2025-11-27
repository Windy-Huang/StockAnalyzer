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
    console.log(where);
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
    let result = false;
    if (add) {
        result = await appService.addHolding(email, ticker);
    } else {
        result = await appService.delHolding(email, ticker);
    }
    res.json({ success: result });
});

module.exports = router;