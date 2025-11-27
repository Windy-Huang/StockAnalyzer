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

router.post("/get-recommendation", async (req, res) => {
    const { ticker } = req.body;
    const checkResult = await appService.checkAlreadyExists(ticker);
    if (checkResult != -1) {
        if (checkResult == 0) {
            res.json({ 
                success: true,  
                sum: 0,
                msg: "Strongly not recommended"
            });
        }
        if (checkResult == 1) {
            res.json({ 
                success: true,  
                sum: 1,
                msg: "Not recommended"
            });
        }
        if (checkResult == 2) {
            res.json({ 
                success: true,  
                sum: 2,
                msg: "Somewhat not recommended"
            });
        }
        if (checkResult == 3) {
            res.json({ 
                success: true,  
                sum: 3,
                msg: "Somewhat not recommended"
            });
        }
        if (checkResult == 4) {
            res.json({ 
                success: true,  
                sum: 4,
                msg: "Somewhat recommended"
            });
        }
        if (checkResult == 5) {
            res.json({ 
                success: true,  
                sum: 5,
                msg: "Somewhat recommended"
            });
        }
        if (checkResult == 6) {
            res.json({ 
                success: true,  
                sum: 6,
                msg: "Recommended"
            });
        }
        if (checkResult == 7) {
            res.json({ 
                success: true,  
                sum: 7,
                msg: "Strongly recommended"
            });
        }
    }
    else {
        const recommendationResult1 = await appService.getRecommendation1(ticker);
        const recommendationResult2 = await appService.getRecommendation2(ticker);
        const recommendationResult3 = await appService.getRecommendation3(ticker);
        const recommendationResult4 = await appService.getRecommendation4(ticker);
        const recommendationResult5 = await appService.getRecommendation5(ticker);
        const recommendationResult6 = await appService.getRecommendation6(ticker);
        const recommendationResult7 = await appService.getRecommendation7(ticker);

        const insertResult = await appService.insertAnalyst(ticker, recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7);

        if (recommendationResult1 == -1 || recommendationResult2 == -1 || recommendationResult3 == -1 || recommendationResult4 == -1 || recommendationResult5 == -1 || recommendationResult6 == -1 || recommendationResult7 == -1) {
            res.status(500).json({ 
                success: false, 
                sum: -1,
                msg: "error"
            });
        } else {
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 0) {
                res.json({ 
                    success: true,  
                    sum: 0,
                    msg: "Strongly not recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 1) {
                res.json({ 
                    success: true,  
                    sum: 1,
                    msg: "Not recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 2) {
                res.json({ 
                    success: true,  
                    sum: 2,
                    msg: "Somewhat not recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 3) {
                res.json({ 
                    success: true,  
                    sum: 3,
                    msg: "Somewhat not recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 4) {
                res.json({ 
                    success: true,  
                    sum: 4,
                    msg: "Somewhat recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 5) {
                res.json({ 
                    success: true,  
                    sum: 5,
                    msg: "Somewhat recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 6) {
                res.json({ 
                    success: true,  
                    sum: 6,
                    msg: "Recommended"
                });
            }
            if (recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7 == 7) {
                res.json({ 
                    success: true,  
                    sum: 7,
                    msg: "Strongly recommended"
                });
            }
        }
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
    let rejected = await initializeWithSP500(appService.insertDBperCompany, getCompanyProfile, 2);
    if (!rejected) {
        rejected = await initializeWithSP500(appService.insertReportPerCompany, getCompany10Q, 2);
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

router.post("/insert-report-parsed", async (req, res) => {
    const { report } = req.body;
    const result = await appService.insertReportPerCompany(parsedReport);
    res.json({ success: result });
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

module.exports = router;