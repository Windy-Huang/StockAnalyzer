-- =========================================================
-- DROP existing objects (ignore errors if they don’t exist)
-- =========================================================
BEGIN
    FOR t IN (SELECT table_name FROM user_tables) LOOP
        EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
    END LOOP;

    FOR s IN (SELECT sequence_name FROM user_sequences) LOOP
        EXECUTE IMMEDIATE 'DROP SEQUENCE ' || s.sequence_name;
    END LOOP;
END;
/

-- Table declaration
CREATE TABLE Exchange(
	exchange VARCHAR(255) PRIMARY KEY,
	currency CHAR(3)
);

CREATE TABLE Stock(
    ticker VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    country VARCHAR(255),
    industry VARCHAR(255),
    exchange VARCHAR(255),
    marketCap FLOAT,
    FOREIGN KEY (exchange) REFERENCES Exchange(exchange) ON DELETE CASCADE
);

-- IsA implemented with no table for corporate action, since the constraint is total and disjoint
-- SQL does not allow for foreign key to reference Stock or reference Divident 
-- Therefore, the decision is to implement the foreign key check at application level and not at SQL

CREATE TABLE Updates(
	actionID INT,
	ticker VARCHAR(255),
	FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
	PRIMARY KEY(actionID, ticker)
);

CREATE TABLE StockSplit(
	actionID INT PRIMARY KEY,
	timestamp DATE,
	splitRatio FLOAT
);

CREATE TABLE Divident(
	actionID INT PRIMARY KEY,
	timestamp DATE,
	amountPerShare FLOAT,
	dividentType VARCHAR(255)
);
CREATE TABLE PriceHistory(
    priceHistoryID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	timestamp DATE,
	openPrice FLOAT,
	highPrice FLOAT,
	lowPrice FLOAT,
	closePrice FLOAT,
	volume NUMBER,
	ticker VARCHAR(255) NOT NULL,
	FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
);

-- If priceHistoryID is not specified, it will auto increment
-- sequence for auto-incrementing PriceHistory IDs
-- CREATE SEQUENCE priceHistory_seq
-- 	START WITH 6       -- since you already insert 5 sample rows
-- 	INCREMENT BY 1
-- 	NOCACHE
-- 	NOCYCLE;

CREATE TABLE Users(
	email VARCHAR(255) PRIMARY KEY,
	preferredCountry VARCHAR(255),
	preferredIndustry VARCHAR(255)
);

CREATE TABLE Holds(
	email VARCHAR(255),
	ticker VARCHAR(255),
	FOREIGN KEY (email) REFERENCES Users(email) ON DELETE CASCADE,
	FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
	PRIMARY KEY (ticker, email)
);

CREATE TABLE DebtEquity(
    totalDebt NUMBER,
    equity NUMBER,
    debtEquityRatio FLOAT,
    PRIMARY KEY (equity, totalDebt)
);

CREATE TABLE Report(
    reportID VARCHAR(255) PRIMARY KEY,
    timestamp DATE,
    fiscalYear NUMBER,
    revenue NUMBER,
    netIncome NUMBER,
    EPS FLOAT,
    totalDebt NUMBER,
    equity NUMBER,
    ticker VARCHAR(255) NOT NULL,
    FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE,
    FOREIGN KEY (equity, totalDebt) REFERENCES DebtEquity(equity, totalDebt) ON DELETE CASCADE
);

CREATE TABLE AnalystRating(
	analystRatingID INT PRIMARY KEY,
	ticker VARCHAR(255),
	buyRate FLOAT,
	holdRATE FLOAT,
	sellRate FLOAT,
	targetPrice FLOAT,
	timestamp DATE,
	FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
);

CREATE TABLE Contributes(
	reportID VARCHAR(12),
	analystRatingID INT,
	FOREIGN KEY (reportID) REFERENCES Report(reportID) ON DELETE CASCADE,
	FOREIGN KEY (analystRatingID) REFERENCES AnalystRating(analystRatingID) ON DELETE CASCADE,
	PRIMARY KEY(reportID, analystRatingID)
);

CREATE TABLE Derives(
	priceHistoryID INT,
	analystRatingID INT,
	FOREIGN KEY (priceHistoryID) REFERENCES PriceHistory(priceHistoryID) ON DELETE CASCADE,
	FOREIGN KEY (analystRatingID) REFERENCES AnalystRating(analystRatingID) ON DELETE CASCADE,
	PRIMARY KEY(priceHistoryID, analystRatingID)
);


-- Insert into table
INSERT INTO Exchange
VALUES ('NASDAQ', 'USD');
INSERT INTO Exchange
VALUES ('NYSE', 'USD');
INSERT INTO Exchange
VALUES ('HKEX', 'HKD');
INSERT INTO Exchange
VALUES ('LSE', 'GBP');
INSERT INTO Exchange
VALUES ('SSE', 'CNY');

INSERT INTO Stock
VALUES ('AAPL', 'Apple Inc.','United States', 'Technology', 'NASDAQ', 3.744*POWER(10, 12));
INSERT INTO Stock
VALUES ('MSFT', 'Microsoft Corporation', 'United States', 'Technology', 'NASDAQ', 3.818*POWER(10, 12));
INSERT INTO Stock
VALUES ('MS', 'Morgan Stanley', 'United States', 'Financial Services','NYSE', 2.524*POWER(10, 11));
INSERT INTO Stock
VALUES ('BMO', 'Bank of Montreal', 'Canada', 'Financial Services','NYSE', 8.948*POWER(10, 10));
INSERT INTO Stock
VALUES ('BA', 'The Boeing Company', 'United States','Industrials','NYSE', 1.610*POWER(10, 11));

INSERT INTO Updates
VALUES (1, 'AAPL');
INSERT INTO Updates
VALUES (2, 'AAPL');
INSERT INTO Updates
VALUES (3, 'MSFT');
INSERT INTO Updates
VALUES (4, 'MSFT');
INSERT INTO Updates
VALUES (5, 'MSFT');
INSERT INTO Updates
VALUES (6, 'MSFT');
INSERT INTO Updates
VALUES (7, 'MSFT');
INSERT INTO Updates
VALUES (8, 'MSFT');
INSERT INTO Updates
VALUES (9, 'BMO');
INSERT INTO Updates
VALUES (10, 'BMO');

INSERT INTO StockSplit
VALUES (1, TO_DATE('2020-08-31', 'YYYY-MM-DD'), 1/4);
INSERT INTO StockSplit
VALUES (2, TO_DATE('2013-06-09', 'YYYY-MM-DD'), 1/7);
INSERT INTO StockSplit
VALUES (3, TO_DATE('2005-02-28', 'YYYY-MM-DD'), 1/2);
INSERT INTO StockSplit
VALUES (4, TO_DATE('2003-02-18', 'YYYY-MM-DD'), 1/2);
INSERT INTO StockSplit
VALUES (5, TO_DATE('1999-03-29', 'YYYY-MM-DD'), 1/2);

INSERT INTO Divident
VALUES (6, TO_DATE('2025-11-20', 'YYYY-MM-DD'), 0.91, 'Cash');
INSERT INTO Divident
VALUES (7, TO_DATE('2025-08-21', 'YYYY-MM-DD'), 0.83, 'Cash');
INSERT INTO Divident
VALUES (8, TO_DATE('2025-05-15', 'YYYY-MM-DD'), 0.83, 'Cash');
INSERT INTO Divident
VALUES (9, TO_DATE('2025-05-28', 'YYYY-MM-DD'), 0.163, 'Cash');
INSERT INTO Divident
VALUES (10, TO_DATE('2025-02-25', 'YYYY-MM-DD'), 0.159, 'Cash');

INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('2025-10-17', 'YYYY-MM-DD'), 248.02, 253.38, 247.27, 252.29, 48876500, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('2025-10-17', 'YYYY-MM-DD'), 509.04, 515.48, 507.31, 513.58, 19798500, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('2025-10-17', 'YYYY-MM-DD'), 160.70, 157.85, 157.85, 158.67, 7963600, 'MS');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('2025-10-17', 'YYYY-MM-DD'), 124.89, 126.03, 124.29, 124.92, 766100, 'BMO');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('2025-10-17', 'YYYY-MM-DD'), 210.91, 214.68, 210.75, 212.94, 6431200, 'BA');

INSERT INTO Users
VALUES ('a@example.com', 'United States', 'Technology');
INSERT INTO Users
VALUES ('b@example.com', 'United States', NULL);
INSERT INTO Users
VALUES ('c@example.com', NULL, 'Technology');
INSERT INTO Users
VALUES ('d@example.com', 'Canada', 'Financial Services');
INSERT INTO Users
VALUES ('e@example.com', NULL, NULL);

INSERT INTO Holds
VALUES ('a@example.com', 'AAPL');
INSERT INTO Holds
VALUES ('a@example.com', 'MSFT');
INSERT INTO Holds
VALUES ('b@example.com', 'AAPL');
INSERT INTO Holds
VALUES ('d@example.com', 'BMO');
INSERT INTO Holds
VALUES ('e@example.com', 'BA');

INSERT INTO DebtEquity
VALUES (265665*POWER(10, 6), 65830*POWER(10, 6), 265665/65830);
INSERT INTO DebtEquity
VALUES (264437*POWER(10, 6), 66796*POWER(10, 6), 264437/66796);
INSERT INTO DebtEquity
VALUES (240733*POWER(10, 6), 321891*POWER(10, 6), 240733/321891);
INSERT INTO DebtEquity
VALUES (231203*POWER(10, 6), 302695*POWER(10, 6), 231203/302695);
INSERT INTO DebtEquity
VALUES (1192449*POWER(10, 6), 107847*POWER(10, 6), 1192449/107847);

INSERT INTO Report
VALUES ('251173509', TO_DATE('2025-08-01', 'YYYY-MM-DD'), 2025, 94036*POWER(10, 6), 23434*POWER(10, 6), 1.57, 265665*POWER(10, 6), 65830*POWER(10, 6), 'AAPL');
INSERT INTO Report
VALUES ('25905357', TO_DATE('2025-05-02', 'YYYY-MM-DD'), 2025, 95359*POWER(10, 6), 24780*POWER(10, 6), 1.65, 264437*POWER(10, 6), 66796*POWER(10, 6), 'AAPL');
INSERT INTO Report
VALUES ('25895090', TO_DATE('2025-03-31', 'YYYY-MM-DD'), 2025, 70066*POWER(10, 6), 25824*POWER(10, 6), 3.47, 240733*POWER(10, 6), 321891*POWER(10, 6), 'MSFT');
INSERT INTO Report
VALUES ('25569453', TO_DATE('2025-01-29', 'YYYY-MM-DD'), 2024, 69632*POWER(10, 6), 24108*POWER(10, 6), 3.24, 231203*POWER(10, 6), 302695*POWER(10, 6), 'MSFT');
INSERT INTO Report
VALUES ('25913081', TO_DATE('2025-03-31', 'YYYY-MM-DD'), 2025, 17739*POWER(10, 6), 4371*POWER(10, 6), 2.62, 1192449*POWER(10, 6), 107847*POWER(10, 6), 'MS');

INSERT INTO AnalystRating
VALUES (1, 'AAPL', 0.65, 0.20, 0.15, NULL, TO_DATE('2025-10-16', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (2, 'AAPL', 0.65, 0.20, 0.15, 250.92, TO_DATE('2025-10-17', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (3, 'MSFT', 0.30, 0.60, 0.10, NULL, TO_DATE('2025-10-16', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (4, 'MSFT', 0.30, 0.60, 0.10, 510.02, TO_DATE('2025-10-17', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (5, 'MS', 0.30, 0.40, 0.30, 158.90, TO_DATE('2025-10-17', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (6, 'BMO', 0.50, 0.30, 0.20, 124.72, TO_DATE('2025-10-17', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (7, 'BA', 0.15, 0.70, 0.15, 211.83, TO_DATE('2025-10-17', 'YYYY-MM-DD'));

INSERT INTO Contributes
VALUES ('251173509', 1);
INSERT INTO Contributes
VALUES ('251173509', 2);
INSERT INTO Contributes
VALUES ('25895090', 3);
INSERT INTO Contributes
VALUES ('25895090', 4);
INSERT INTO Contributes
VALUES ('25913081', 5);

INSERT INTO Derives
VALUES (1, 2);
INSERT INTO Derives
VALUES (2, 4);
INSERT INTO Derives
VALUES (3, 5);
INSERT INTO Derives
VALUES (4, 6);
INSERT INTO Derives
VALUES (5, 7);