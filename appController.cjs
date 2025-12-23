// Rest API endpoints

const express = require('express');
const router = express.Router();

const initService = require('./db/initialization');
const stockService = require('./db/stock');
const userService = require('./db/user');
const recommendationService = require('./db/recommendation');

const {initializeWithSP500, getCompany10Q, getReportByAccessNum, getCompanyProfile, getHistoricalStockPrice} = require("./startupScript.cjs");

router.post("/get-recommendation", async (req, res) => {
    const { ticker } = req.body;
    const checkResult = await recommendationService.getRecommendation(ticker);
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
        const recommendationResult1 = await recommendationService.getPERation(ticker);
        const recommendationResult2 = await recommendationService.getEPSGrowth(ticker);
        const recommendationResult3 = await recommendationService.getROE(ticker);
        const recommendationResult4 = await recommendationService.getMovingAverage(ticker);
        const recommendationResult5 = await recommendationService.getMomentum(ticker);
        const recommendationResult6 = await recommendationService.getDERatio(ticker);
        const recommendationResult7 = await recommendationService.getDividentYield(ticker);

        const insertResult = await recommendationService.insertRecommendation(ticker, recommendationResult1+recommendationResult2+recommendationResult3+recommendationResult4+recommendationResult5+recommendationResult6+recommendationResult7);

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

router.post("/initiate-db", async (req, res) => {
    try {
        const initiateResult = await initService.initiateDB();
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
    let rejected = await initializeWithSP500(initService.insertDBperCompany, getCompanyProfile, 10);
    if (!rejected) {
        rejected = await initializeWithSP500(initService.insertReportPerCompany, getCompany10Q, 5);
        if (!rejected) {
            rejected = await initializeWithSP500(initService.insertPricePerStock, getHistoricalStockPrice, 1);
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

router.post("/insert-report-parsed", async (req, res) => {
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

// Specify industry: /menu?industry=tech
router.get('/menu', async (req, res) => {
    const tableContent = await stockService.fetchAllStock();
    const popular = await stockService.fetchPopularStock();
    if (req.query.industry) {
        res.json({data: tableContent, popular: popular, leastPopular: await stockService.fetchLeastPopularStock(req.query.industry)});
    } else {
        res.json({data: tableContent, popular: popular, leastPopular: []});
    }
});

router.post("/query", async (req, res) => {
    const { where } = req.body;
    res.json({data: await stockService.filterStock(where)});
});

router.get('/setting-dropdown', async (req, res) => {
    res.json({industry: await userService.fetchSettingDropdown("industry"), exchange: await userService.fetchSettingDropdown("exchange")});
});

router.post('/user', async (req, res) => {
    const { email } = req.body;
    res.json({data: await userService.fetchUser(email)});
});

router.put('/user', async (req, res) => {
    const { email, industry, exchange, rec } = req.body;
    const result = await userService.updateUser(email, industry, exchange, rec);
    if (result) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

router.delete('/user', async (req, res) => {
    const { email } = req.body;
    res.json({success: await userService.delUser(email)});
});

router.get('/holding', async (req, res) => {
    const result = await stockService.verifyHolding(req.query.email, req.query.ticker);
    res.json({ exist: result });
});

router.put('/holding', async (req, res) => {
    const { email, ticker, add } = req.body;
    console.log('PUT /holding - email:', email, 'ticker:', ticker, 'add:', add);
    let result = false;
    if (add) {
        result = await stockService.addHolding(email, ticker);
    } else {
        result = await stockService.delHolding(email, ticker);
    }
    console.log('PUT /holding - result:', result);
    res.json({ success: result });
});

// Get all stocks held by a specific user
router.get('/user-held-stocks/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const stocks = await stockService.getUserHeldStocks(email);
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
        const priceHistory = await stockService.getPriceHistory(ticker);
        res.json({ success: true, data: priceHistory });
    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's held stocks filtered by holding duration (HAVING clause query)
router.get('/user-held-stocks/:email/duration/:duration', async (req, res) => {
    try {
        const { email, duration } = req.params;
        const stocks = await stockService.getUserHeldStocksByDuration(email, duration);
        res.json({ success: true, data: stocks });
    } catch (error) {
        console.error('Error fetching user held stocks by duration:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/price-history', async (req, res) => {
    const { ticker, fields } = req.body;
    const result = await stockService.fetchRecentPriceHistory(ticker, fields);
    res.json({ data: result });
});

module.exports = router;