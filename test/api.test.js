const { expect } = require('chai');
const request = require('supertest');
const { StatusCodes } = require('http-status-codes');
const app = require('../server');
const db = require('../db/db');
const { initiateDB } = require('../db/initialization');

describe('Integration Tests', function() {

    // Initialize fake db
    before(async function() {
        await initiateDB();
        await db.query(`INSERT INTO Exchange (exchange, currency) VALUES ('NASDAQ', 'USD')`);
        await db.query(`INSERT INTO Exchange (exchange, currency) VALUES ('NYSE', 'USD')`);
        await db.query(`INSERT INTO Stock (ticker, industry, exchange, initialized) VALUES ('AAPL', 'Technology', 'NASDAQ', 1)`);
        await db.query(`INSERT INTO Stock (ticker, industry, exchange, initialized) VALUES ('MSFT', 'Technology', 'NYSE', 0)`);
        await db.query(`INSERT INTO PriceHistory (timestamp, close_price, ticker) VALUES ('2026-01-01', 100.0, 'AAPL')`);
        await db.query(`INSERT INTO Report (report_id, timestamp, ticker) VALUES ('test-report', '2026-01-01', 'AAPL')`);
        await db.query(`INSERT INTO Users (email) VALUES ('test')`);
        await db.query(`INSERT INTO Holds (email, ticker, hold_time) VALUES ('test', 'AAPL', '2025-01-01')`);
    });

    describe("USER operations", () => {
        it("Obtain dropdown options", async () => {
            const res = await request(app).get('/v1/settings');
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("industry").that.is.an("array");
            expect(res.body).to.have.property("exchange").that.is.an("array");
            expect(res.body.industry).to.have.length(1);
            expect(res.body.exchange).to.have.length(2);
        });

        it("Add new user", async () => {
            const res = await request(app).post('/v1/users/a');
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("data").that.is.an("array");
            expect(res.body.data).to.deep.equal([["a", "", "", ""]]);
        });

        it("Update user settings", async () => {
            await request(app).post('/v1/users/a');
            const res = await request(app).put('/v1/users/a')
                .set("Content-Type", "application/json")
                .send({industry: "Technology", exchange: "", rec: "1"});
            expect(res.status).to.equal(StatusCodes.OK);

            const res2 = await request(app).post('/v1/users/a');
            expect(res2.status).to.equal(StatusCodes.OK);
            expect(res2.body).to.have.property("data").that.is.an("array");
            expect(res2.body.data).to.deep.equal([["a", "Technology", null, 1]]);
        });

        it("Delete user", async () => {
            await request(app).post('/v1/users/a');
            const res = await request(app).delete('/v1/users/a');
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("success");
            expect(res.body.success).to.equal(true);
        });

        it("Hold and unhold stock", async () => {
            const user = await request(app).post('/v1/users/a');
            expect(user.status).to.equal(StatusCodes.OK);

            let hold = await request(app).get('/v1/users/a/holdings/AAPL');
            expect(hold.status).to.equal(StatusCodes.OK);
            expect(hold.body).to.have.property("exist");
            expect(hold.body.exist).to.equal(false);

            await request(app).put('/v1/users/a/holdings/AAPL')
                .query({ add: "add" });
            hold = await request(app).get('/v1/users/a/holdings/AAPL');
            expect(hold.body).to.have.property("exist");
            expect(hold.body.exist).to.equal(true);

            await request(app).put('/v1/users/a/holdings/AAPL');
            hold = await request(app).get('/v1/users/a/holdings/AAPL');
            expect(hold.body).to.have.property("exist");
            expect(hold.body.exist).to.equal(false);

            await request(app).delete('/v1/users/a');
        });
    });

    describe("STOCK operations", () => {
        it("Filter stocks", async () => {
            let res = await request(app).put('/v1/stocks')
                .set("Content-Type", "application/json")
                .send({where: "ticker ILIKE '%%'"});
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("data").that.is.an("array");
            expect(res.body.data).to.have.length(2);

            res = await request(app).put('/v1/stocks')
                .set("Content-Type", "application/json")
                .send({where: "exchange ILIKE '%NY%'"});
            expect(res.body.data).to.have.length(1);

            res = await request(app).put('/v1/stocks')
                .set("Content-Type", "application/json")
                .send({where: "ticker ILIKE '%kjdnf%'"});
            expect(res.body.data).to.have.length(0);
        });

        it("Get latest price history", async () => {
            const res = await request(app).put('/v1/stocks/AAPL/price-histories')
                .set("Content-Type", "application/json")
                .send({fields: "close_price"});
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("data").that.is.an("array");
            expect(Number(res.body.data[0][0])).to.equal(100);
        });

        it("Get user held stocks", async () => {
            const res = await request(app).get('/v1/users/test/stocks');
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("data").that.is.an("array");
            expect(res.body.data).to.deep.equal([ { ticker: 'AAPL', name: null } ]);
        });

        it("Get user held stocks with duration filter", async () => {
            if (process.env.NODE_ENV === "test") {
                console.log("Skipped as pg-mem cannot implement time calculations");
            } else {
                let res = await request(app).get('/v1/users/test/durations/day');
                expect(res.status).to.equal(StatusCodes.OK);
                expect(res.body).to.have.property("data").that.is.an("array");
                expect(res.body.data).to.have.length(1);

                // Unhold + hold to refresh hold_date
                await request(app).put('/v1/users/test/holdings/AAPL');
                await request(app).put('/v1/users/test/holdings/AAPL')
                    .query({ add: "add" });
                res = await request(app).get('/v1/users/test/durations/day');
                expect(res.body.data).to.deep.equal([]);
            }
        });
    });

    // pg-mem cannot execute division
    describe("RECOMMENDATION operations", () => {
        it("Get popularity recommendations", async () => {
            let res = await request(app).get('/v1/recommendations')
                .query({ industry: "Technology" });
            expect(res.status).to.equal(StatusCodes.OK);
            expect(res.body).to.have.property("data").that.is.an("array");
            expect(res.body).to.have.property("popular").that.is.an("array");
            expect(res.body).to.have.property("leastPopular").that.is.an("array");
            expect(res.body.data).to.deep.equal([["AAPL", null, null, "Technology", "NASDAQ", null]]);
            if (!process.env.NODE_ENV) {
                expect(res.body.popular).to.deep.equal(["AAPL"]);
                expect(res.body.leastPopular).to.deep.equal(["MSFT"]);
            }

            await request(app).put('/v1/users/test/holdings/AAPL');
            res = await request(app).get('/v1/recommendations')
                .query({ industry: "Technology" });
            expect(res.body.data).to.deep.equal([["AAPL", null, null, "Technology", "NASDAQ", null]]);
            if (!process.env.NODE_ENV) {
                expect(res.body.popular).to.deep.equal([]);
                expect(res.body.leastPopular).to.deep.equal(["AAPL","MSFT"]);
            }
        });

        it("Analyst rating", async () => {
            const res = await request(app).post('/v1/recommendations/AAPL');
            expect(res.status).to.equal(200);
            expect(res.body.success).to.equal(true);
        });
    });

});