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

router.get('/demotable', async (req, res) => {
    const tableContent = await appService.fetchDemotableFromDb();
    res.json({data: tableContent});
});

router.post("/initiate-demotable", async (req, res) => {
    const initiateResult = await appService.initiateDemotable();
    if (initiateResult) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

router.post("/insert-demotable", async (req, res) => {
    const { id, name } = req.body;
    const insertResult = await appService.insertDemotable(id, name);
    if (insertResult) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

router.post("/update-name-demotable", async (req, res) => {
    const { oldName, newName } = req.body;
    const updateResult = await appService.updateNameDemotable(oldName, newName);
    if (updateResult) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

router.get('/count-demotable', async (req, res) => {
    const tableCount = await appService.countDemotable();
    if (tableCount >= 0) {
        res.json({ 
            success: true,  
            count: tableCount
        });
    } else {
        res.status(500).json({ 
            success: false, 
            count: tableCount
        });
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
    let rejected = await initializeWithSP500(appService.insertDBperCompany, getCompanyProfile, 30);
    if (!rejected) {
        console.log(`Waiting 65s before inserting report...`);
        await new Promise(resolve => setTimeout(resolve, 65000));
        rejected = await initializeWithSP500(appService.insertReportPerCompany, getCompany10Q, 10);
        if (!rejected) {
            rejected = await initializeWithSP500(appService.insertPricePerStock, getHistoricalStockPrice, 2);
            if (!rejected) res.json({ success: true });
        }
    }
    if (rejected) res.status(500).json({ success: false });
});

// Error code
// 404 means provided accessNum is invalid
// 422 means error in parsing, requires user assistance
// 500 means error in DB insertion
router.post("/insert-report", async (req, res) => {
    const { accessNum } = req.body;
    console.log(accessNum);
    const parsedReport = await getReportByAccessNum(accessNum);
    if (parsedReport) {
        if (parsedReport.size < 9) {
            res.status(422).json({ success: false, report: Object.fromEntries(parsedReport) });
        } else {
            const result = await appService.insertReportPerCompany(parsedReport);
            if (result) {
                res.json({ success: true });
            } else {
                res.status(500).json({ success: false });
            }
        }
    } else {
        res.status(404).json({ success: false });
    }
});

// Specify industry: /menu?industry=tech
router.get('/menu', async (req, res) => {
    const tableContent = await appService.fetchStock();
    const popular = await appService.fetchPopularStock();
    console.log(req.query.industry);
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

module.exports = router;