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

CREATE TABLE Users(
	email VARCHAR(255) PRIMARY KEY,
    preferredIndustry VARCHAR(255),
    preferredExchange VARCHAR(255),
    showRecommendation NUMBER(1,0)
);

CREATE TABLE Holds(
	email VARCHAR(255),
	ticker VARCHAR(255),
    holdTime DATE,
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
	recommendation NUMBER,
	timestamp DATE,
	FOREIGN KEY (ticker) REFERENCES Stock(ticker) ON DELETE CASCADE
);

CREATE TABLE Contributes(
	reportID VARCHAR(255),
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
VALUES ('AAPL', 'Apple Inc.','US', 'Technology', 'NASDAQ', 3.744*POWER(10, 12));
INSERT INTO Stock
VALUES ('MSFT', 'Microsoft Corporation', 'US', 'Technology', 'NASDAQ', 3.818*POWER(10, 12));
INSERT INTO Stock
VALUES ('ORCL', 'Oracle Corp', 'US', 'Technology','NYSE', 566623.498);
INSERT INTO Stock
VALUES ('JPM', 'JPMorgan Chase', 'US', 'Banking','NYSE', 811234.108);
INSERT INTO Stock
VALUES ('EA', 'Electronic Arts Inc', 'US','Media','NASDAQ', 50142.7866);

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
VALUES (9, 'ORCL');
INSERT INTO Updates
VALUES (10, 'ORCL');

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
VALUES (9, TO_DATE('2025-10-09', 'YYYY-MM-DD'), 0.5, 'Cash');
INSERT INTO Divident
VALUES (10, TO_DATE('2025-07-10', 'YYYY-MM-DD'), 0.5, 'Cash');

INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-NOV-25','DD-MON-RR'), 270.9, 277, 270.9, 275.92, 62500078, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-NOV-25','DD-MON-RR'), 265.95, 273.33, 265.67, 271.49, 59030832, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-NOV-25','DD-MON-RR'), 270.83, 275.43, 265.92, 266.25, 45823568, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-NOV-25','DD-MON-RR'), 265.525, 272.21, 265.5, 268.56, 40424492, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-NOV-25','DD-MON-RR'), 269.99, 270.71, 265.32, 267.44, 45677278, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-NOV-25','DD-MON-RR'), 268.815, 270.49, 265.73, 267.46, 45018260, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-NOV-25','DD-MON-RR'), 271.05, 275.96, 269.6, 272.41, 47431331, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-NOV-25','DD-MON-RR'), 274.11, 276.699, 272.09, 272.95, 49602794, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-NOV-25','DD-MON-RR'), 275, 275.73, 271.7, 273.47, 48397982, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-NOV-25','DD-MON-RR'), 269.81, 275.91, 269.8, 275.25, 46208318, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-NOV-25','DD-MON-RR'), 268.96, 273.73, 267.455, 269.43, 41312412, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-NOV-25','DD-MON-RR'), 269.795, 272.29, 266.77, 268.47, 48227365, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-NOV-25','DD-MON-RR'), 267.89, 273.4, 267.89, 269.77, 51204045, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-NOV-25','DD-MON-RR'), 268.61, 271.7, 266.93, 270.14, 42586288, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-NOV-25','DD-MON-RR'), 268.325, 271.486, 267.615, 270.04, 49274846, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-NOV-25','DD-MON-RR'), 270.42, 270.85, 266.25, 269.05, 50194583, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-OCT-25','DD-MON-RR'), 276.99, 277.32, 269.16, 270.37, 86167123, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-OCT-25','DD-MON-RR'), 271.99, 274.14, 268.48, 271.4, 69886534, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-OCT-25','DD-MON-RR'), 269.275, 271.41, 267.11, 269.7, 51086742, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-OCT-25','DD-MON-RR'), 268.985, 269.89, 268.15, 269, 41534759, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('26-OCT-25','DD-MON-RR'), 264.88, 269.12, 264.6501, 268.81, 44888152, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-OCT-25','DD-MON-RR'), 261.19, 264.13, 259.18, 262.82, 38253717, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-OCT-25','DD-MON-RR'), 259.94, 260.62, 258.0101, 259.58, 32754941, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-OCT-25','DD-MON-RR'), 262.65, 262.85, 255.43, 258.45, 45015254, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-OCT-25','DD-MON-RR'), 261.88, 265.29, 261.83, 262.77, 46695948, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-OCT-25','DD-MON-RR'), 255.885, 264.375, 255.63, 262.24, 90483029, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-OCT-25','DD-MON-RR'), 248.02, 253.38, 247.27, 252.29, 49146961, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-OCT-25','DD-MON-RR'), 248.25, 249.04, 245.13, 247.45, 39776974, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-OCT-25','DD-MON-RR'), 249.485, 251.82, 247.47, 249.34, 33893611, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-OCT-25','DD-MON-RR'), 246.6, 248.845, 244.7, 247.77, 35477986, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-OCT-25','DD-MON-RR'), 249.38, 249.69, 245.56, 247.66, 38142942, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-OCT-25','DD-MON-RR'), 254.94, 256.38, 244, 245.27, 61999098, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-OCT-25','DD-MON-RR'), 257.805, 258, 253.14, 254.04, 38322012, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-OCT-25','DD-MON-RR'), 256.52, 258.52, 256.11, 258.06, 36496895, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-OCT-25','DD-MON-RR'), 256.805, 257.4, 255.43, 256.48, 31955776, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-OCT-25','DD-MON-RR'), 257.99, 259.07, 255.05, 256.69, 44664118, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-OCT-25','DD-MON-RR'), 254.665, 259.24, 253.95, 258.02, 49155614, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('01-OCT-25','DD-MON-RR'), 256.575, 258.18, 254.15, 257.13, 42630239, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-SEP-25','DD-MON-RR'), 255.04, 258.79, 254.93, 255.45, 48713940, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-SEP-25','DD-MON-RR'), 254.855, 255.919, 253.11, 254.63, 37704259, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-SEP-25','DD-MON-RR'), 254.56, 255, 253.01, 254.43, 40127687, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('25-SEP-25','DD-MON-RR'), 254.095, 257.6, 253.78, 255.46, 46076258, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-SEP-25','DD-MON-RR'), 253.205, 257.17, 251.712, 256.87, 55202075, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-SEP-25','DD-MON-RR'), 255.22, 255.74, 251.04, 252.31, 42303710, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-SEP-25','DD-MON-RR'), 255.875, 257.34, 253.58, 254.43, 60275187, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-SEP-25','DD-MON-RR'), 248.3, 256.64, 248.12, 256.08, 105517416, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-SEP-25','DD-MON-RR'), 241.225, 246.3, 240.2106, 245.5, 163741314, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-SEP-25','DD-MON-RR'), 239.97, 241.2, 236.65, 237.88, 44249576, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-SEP-25','DD-MON-RR'), 238.97, 240.1, 237.7301, 238.99, 46508017, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-SEP-25','DD-MON-RR'), 237.175, 241.22, 236.3235, 238.15, 63421099, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-SEP-25','DD-MON-RR'), 237, 238.19, 235.03, 236.7, 42699524, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-SEP-25','DD-MON-RR'), 229.22, 234.51, 229.02, 234.07, 55824216, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-SEP-25','DD-MON-RR'), 226.875, 230.45, 226.65, 230.03, 50208578, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-SEP-25','DD-MON-RR'), 232.185, 232.42, 225.95, 226.79, 83440810, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-SEP-25','DD-MON-RR'), 237, 238.7805, 233.36, 234.35, 66313918, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-SEP-25','DD-MON-RR'), 239.3, 240.15, 236.34, 237.88, 48999495, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-SEP-25','DD-MON-RR'), 239.995, 241.32, 238.4901, 239.69, 54870397, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-SEP-25','DD-MON-RR'), 238.45, 239.8999, 236.74, 239.78, 47549429, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-SEP-25','DD-MON-RR'), 237.21, 238.85, 234.36, 238.47, 66061716, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('01-SEP-25','DD-MON-RR'), 229.25, 230.85, 226.97, 229.72, 44075638, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-AUG-25','DD-MON-RR'), 232.51, 233.38, 231.37, 232.14, 39418437, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-AUG-25','DD-MON-RR'), 230.82, 233.41, 229.335, 232.56, 38074700, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('26-AUG-25','DD-MON-RR'), 228.61, 230.9, 228.26, 230.49, 31259513, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('25-AUG-25','DD-MON-RR'), 226.87, 229.49, 224.69, 229.31, 54575107, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-AUG-25','DD-MON-RR'), 226.48, 229.3, 226.23, 227.16, 30983133, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-AUG-25','DD-MON-RR'), 226.17, 229.09, 225.41, 227.76, 42477811, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-AUG-25','DD-MON-RR'), 226.27, 226.52, 223.7804, 224.9, 30621249, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-AUG-25','DD-MON-RR'), 229.98, 230.47, 225.77, 226.01, 42263865, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-AUG-25','DD-MON-RR'), 231.275, 232.87, 229.35, 230.56, 39402564, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-AUG-25','DD-MON-RR'), 231.7, 233.12, 230.11, 230.89, 37476188, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-AUG-25','DD-MON-RR'), 234, 234.28, 229.335, 231.59, 56038657, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-AUG-25','DD-MON-RR'), 234.055, 235.12, 230.85, 232.78, 51916275, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-AUG-25','DD-MON-RR'), 231.07, 235, 230.43, 233.33, 69878546, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-AUG-25','DD-MON-RR'), 228.005, 230.8, 227.07, 229.65, 55672301, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-AUG-25','DD-MON-RR'), 227.92, 229.56, 224.76, 227.18, 61806132, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-AUG-25','DD-MON-RR'), 220.83, 231, 219.25, 229.35, 113853967, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-AUG-25','DD-MON-RR'), 218.875, 220.85, 216.58, 220.03, 90224834, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-AUG-25','DD-MON-RR'), 205.63, 215.38, 205.59, 213.25, 108483103, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-AUG-25','DD-MON-RR'), 203.4, 205.34, 202.16, 202.92, 44155079, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-AUG-25','DD-MON-RR'), 204.505, 207.88, 201.675, 203.35, 75109298, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('31-JUL-25','DD-MON-RR'), 210.865, 213.58, 201.5, 202.38, 104434473, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-JUL-25','DD-MON-RR'), 208.49, 209.84, 207.16, 207.57, 80698431, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-JUL-25','DD-MON-RR'), 211.895, 212.39, 207.72, 209.05, 45512514, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-JUL-25','DD-MON-RR'), 214.175, 214.81, 210.82, 211.27, 51411723, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-JUL-25','DD-MON-RR'), 214.03, 214.845, 213.06, 214.05, 37858017, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-JUL-25','DD-MON-RR'), 214.7, 215.24, 213.4, 213.88, 40268781, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-JUL-25','DD-MON-RR'), 213.9, 215.69, 213.53, 213.76, 46022620, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-JUL-25','DD-MON-RR'), 215, 215.15, 212.41, 214.15, 46989301, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-JUL-25','DD-MON-RR'), 213.14, 214.95, 212.2301, 214.4, 46404072, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-JUL-25','DD-MON-RR'), 212.1, 215.78, 211.63, 212.48, 51377434, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-JUL-25','DD-MON-RR'), 210.87, 211.79, 209.7045, 211.18, 48974591, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-JUL-25','DD-MON-RR'), 210.57, 211.8, 209.59, 210.02, 48068141, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-JUL-25','DD-MON-RR'), 210.295, 212.4, 208.64, 210.16, 47490532, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-JUL-25','DD-MON-RR'), 209.22, 211.89, 208.92, 209.11, 42296339, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-JUL-25','DD-MON-RR'), 209.925, 210.91, 207.54, 208.62, 38840111, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-JUL-25','DD-MON-RR'), 210.565, 212.13, 209.86, 211.16, 39765812, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-JUL-25','DD-MON-RR'), 210.505, 213.48, 210.03, 212.41, 44443635, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-JUL-25','DD-MON-RR'), 209.53, 211.33, 207.22, 211.14, 48749367, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-JUL-25','DD-MON-RR'), 210.1, 211.43, 208.45, 210.01, 42848928, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-JUL-25','DD-MON-RR'), 212.68, 216.23, 208.8, 209.95, 50228984, 'AAPL');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-JUL-24','DD-MON-RR'), 212.68, 216.23, 208.8, 209.95, 50228984, 'AAPL');

INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-NOV-25','DD-MON-RR'), 475, 476.9, 468.02, 474, 32913821, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-NOV-25','DD-MON-RR'), 478.5, 478.92, 468.27, 472.12, 31769248, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-NOV-25','DD-MON-RR'), 492.71, 493.57, 475.5, 478.43, 26802542, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-NOV-25','DD-MON-RR'), 490.1, 495.1872, 482.83, 487.12, 23245314, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-NOV-25','DD-MON-RR'), 495.365, 502.98, 486.78, 493.79, 33815114, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-NOV-25','DD-MON-RR'), 508.45, 512.12, 504.91, 507.49, 19092752, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-NOV-25','DD-MON-RR'), 498.23, 511.6, 497.44, 510.18, 28505746, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-NOV-25','DD-MON-RR'), 510.31, 513.5, 501.29, 503.29, 25273114, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-NOV-25','DD-MON-RR'), 509.355, 511.67, 499.1201, 511.14, 26574851, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-NOV-25','DD-MON-RR'), 504.8, 509.6, 502.3488, 508.68, 17980020, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-NOV-25','DD-MON-RR'), 500.035, 506.85, 498.8, 506, 26101480, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-NOV-25','DD-MON-RR'), 496.945, 499.377, 493.25, 496.82, 24019764, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-NOV-25','DD-MON-RR'), 505.66, 505.7, 495.81, 497.1, 27406496, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-NOV-25','DD-MON-RR'), 513.3, 514.83, 506.575, 507.16, 22883851, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-NOV-25','DD-MON-RR'), 511.76, 515.55, 507.84, 514.33, 20958663, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-NOV-25','DD-MON-RR'), 519.805, 524.96, 514.59, 517.03, 22374742, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-OCT-25','DD-MON-RR'), 528.875, 529.32, 515.1, 517.81, 34006424, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-OCT-25','DD-MON-RR'), 530.48, 534.97, 522.12, 525.76, 41023088, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-OCT-25','DD-MON-RR'), 544.94, 546.27, 536.7287, 541.55, 36023004, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-OCT-25','DD-MON-RR'), 550, 553.72, 540.77, 542.07, 29986683, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('26-OCT-25','DD-MON-RR'), 531.78, 534.58, 529.01, 531.52, 18734716, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-OCT-25','DD-MON-RR'), 522.79, 525.345, 520.71, 523.61, 15532360, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-OCT-25','DD-MON-RR'), 522.46, 523.95, 518.61, 520.56, 14023532, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-OCT-25','DD-MON-RR'), 521.15, 525.23, 517.71, 520.54, 18962694, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-OCT-25','DD-MON-RR'), 517.5, 518.69, 513.04, 517.66, 15586204, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-OCT-25','DD-MON-RR'), 514.61, 518.7, 513.43, 516.79, 14665620, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-OCT-25','DD-MON-RR'), 509.04, 515.48, 507.31, 513.58, 19867765, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-OCT-25','DD-MON-RR'), 512.58, 516.85, 508.13, 511.61, 15559565, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-OCT-25','DD-MON-RR'), 514.955, 517.19, 510, 513.43, 14694654, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-OCT-25','DD-MON-RR'), 510.225, 515.282, 506, 513.57, 14684300, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-OCT-25','DD-MON-RR'), 516.41, 516.41, 511.68, 514.05, 14284238, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-OCT-25','DD-MON-RR'), 519.64, 523.58, 509.63, 510.96, 24133840, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-OCT-25','DD-MON-RR'), 522.335, 524.325, 517.4, 522.4, 18343602, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-OCT-25','DD-MON-RR'), 523.28, 526.95, 523.09, 524.85, 13363447, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-OCT-25','DD-MON-RR'), 528.285, 529.8, 521.44, 523.98, 14615208, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-OCT-25','DD-MON-RR'), 518.61, 531.03, 518.2, 528.57, 21388581, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-OCT-25','DD-MON-RR'), 517.1, 520.49, 515, 517.35, 15112321, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('01-OCT-25','DD-MON-RR'), 517.64, 521.6, 510.6791, 515.74, 21222886, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-SEP-25','DD-MON-RR'), 514.8, 520.505, 511.69, 519.71, 22632336, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-SEP-25','DD-MON-RR'), 513.24, 518.16, 509.66, 517.95, 19728229, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-SEP-25','DD-MON-RR'), 511.5, 516.845, 508.88, 514.6, 17617775, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('25-SEP-25','DD-MON-RR'), 510.06, 513.94, 506.62, 511.46, 16213129, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-SEP-25','DD-MON-RR'), 508.3, 510.01, 505.04, 507.03, 15786468, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-SEP-25','DD-MON-RR'), 510.38, 512.48, 506.92, 510.15, 13533711, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-SEP-25','DD-MON-RR'), 513.8, 514.5899, 507.31, 509.23, 19799580, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-SEP-25','DD-MON-RR'), 515.59, 517.74, 512.545, 514.45, 20009314, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-SEP-25','DD-MON-RR'), 510.56, 519.3, 510.31, 517.93, 52474093, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-SEP-25','DD-MON-RR'), 511.49, 513.07, 507.66, 508.45, 18913696, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-SEP-25','DD-MON-RR'), 510.62, 511.29, 505.93, 510.02, 15816585, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-SEP-25','DD-MON-RR'), 516.88, 517.23, 508.6, 509.04, 19711922, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-SEP-25','DD-MON-RR'), 508.79, 515.47, 507, 515.36, 17143786, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-SEP-25','DD-MON-RR'), 506.65, 512.55, 503.85, 509.9, 23624884, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-SEP-25','DD-MON-RR'), 502.25, 503.17, 497.88, 501.01, 18881608, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-SEP-25','DD-MON-RR'), 502.98, 503.2299, 496.72, 500.37, 21611816, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-SEP-25','DD-MON-RR'), 501.43, 502.25, 497.7, 498.41, 14410542, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-SEP-25','DD-MON-RR'), 498.105, 501.195, 495.03, 498.2, 16771015, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-SEP-25','DD-MON-RR'), 509.07, 511.97, 492.37, 495, 31994846, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-SEP-25','DD-MON-RR'), 504.3, 508.15, 503.15, 507.97, 15509486, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-SEP-25','DD-MON-RR'), 503.79, 507.79, 502.32, 505.35, 15995154, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('01-SEP-25','DD-MON-RR'), 500.465, 506, 496.81, 505.12, 18127995, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-AUG-25','DD-MON-RR'), 508.66, 509.6, 504.4915, 506.69, 20961569, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-AUG-25','DD-MON-RR'), 507.09, 511.09, 505.5, 509.64, 18015593, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('26-AUG-25','DD-MON-RR'), 502, 507.29, 499.9, 506.74, 17277893, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('25-AUG-25','DD-MON-RR'), 504.355, 504.9778, 498.51, 502.04, 30835709, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-AUG-25','DD-MON-RR'), 506.63, 508.19, 504.12, 504.26, 21638579, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-AUG-25','DD-MON-RR'), 504.25, 510.73, 502.41, 507.23, 24324161, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-AUG-25','DD-MON-RR'), 503.69, 507.63, 502.7201, 504.24, 18443254, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-AUG-25','DD-MON-RR'), 509.865, 511, 504.44, 505.72, 27723025, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-AUG-25','DD-MON-RR'), 515, 515.1641, 508.55, 509.77, 21481016, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-AUG-25','DD-MON-RR'), 521.585, 522.82, 514.02, 517.1, 23760583, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-AUG-25','DD-MON-RR'), 522.77, 526.1, 519.08, 520.17, 25213272, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-AUG-25','DD-MON-RR'), 522.56, 525.9499, 520.14, 522.48, 20269074, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-AUG-25','DD-MON-RR'), 532.11, 532.7, 519.37, 520.58, 19619160, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-AUG-25','DD-MON-RR'), 523.75, 530.98, 522.7, 529.24, 18688921, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-AUG-25','DD-MON-RR'), 522.3, 527.59, 519.72, 521.77, 20194372, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-AUG-25','DD-MON-RR'), 522.6, 524.66, 519.41, 522.04, 15531009, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-AUG-25','DD-MON-RR'), 526.8, 528.09, 517.5511, 520.84, 16079144, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-AUG-25','DD-MON-RR'), 530.9, 531.7, 524.03, 524.94, 21355702, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-AUG-25','DD-MON-RR'), 537.18, 537.3, 527.24, 527.75, 19171569, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-AUG-25','DD-MON-RR'), 528.27, 538.25, 528.13, 535.64, 25349004, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('31-JUL-25','DD-MON-RR'), 535, 535.8, 520.86, 524.11, 28977628, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-JUL-25','DD-MON-RR'), 555.225, 555.45, 531.9, 533.5, 51617326, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-JUL-25','DD-MON-RR'), 515.17, 515.95, 509.435, 513.24, 26380434, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-JUL-25','DD-MON-RR'), 515.53, 517.62, 511.56, 512.57, 16469235, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-JUL-25','DD-MON-RR'), 514.08, 515, 510.12, 512.5, 14308027, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-JUL-25','DD-MON-RR'), 512.465, 518.29, 510.3592, 513.71, 19125699, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-JUL-25','DD-MON-RR'), 508.77, 513.67, 507.3, 510.88, 16107000, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-JUL-25','DD-MON-RR'), 506.75, 506.79, 500.7, 505.87, 16396585, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-JUL-25','DD-MON-RR'), 510.97, 511.2, 505.27, 505.27, 13868644, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-JUL-25','DD-MON-RR'), 506.705, 512.09, 505.55, 510.06, 14066805, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-JUL-25','DD-MON-RR'), 514.48, 514.64, 507.43, 510.05, 21209666, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-JUL-25','DD-MON-RR'), 505.68, 513.37, 505.62, 511.7, 17503129, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-JUL-25','DD-MON-RR'), 505.18, 506.72, 501.89, 505.62, 15154374, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-JUL-25','DD-MON-RR'), 503.02, 508.3, 502.79, 505.82, 14927202, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-JUL-25','DD-MON-RR'), 501.515, 503.97, 501.03, 503.02, 12058848, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-JUL-25','DD-MON-RR'), 498.47, 505.03, 497.795, 503.32, 16459512, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-JUL-25','DD-MON-RR'), 503.05, 504.44, 497.75, 501.48, 16498740, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-JUL-25','DD-MON-RR'), 500.3, 506.78, 499.74, 503.51, 18659538, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-JUL-25','DD-MON-RR'), 497.24, 498.2, 494.11, 496.62, 11846586, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-JUL-25','DD-MON-RR'), 497.38, 498.75, 495.225, 497.72, 13981605, 'MSFT');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-JUL-24','DD-MON-RR'), 497.38, 498.75, 495.225, 497.72, 13981605, 'MSFT');

INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-NOV-25','DD-MON-RR'), 298.24, 299.82, 294.51, 298, 10702971, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-NOV-25','DD-MON-RR'), 301.29, 301.68, 292.8101, 298.02, 11766810, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-NOV-25','DD-MON-RR'), 306.34, 309.92, 298.16, 298.38, 7501582, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-NOV-25','DD-MON-RR'), 299.74, 304.4499, 299.265, 303.27, 5546555, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-NOV-25','DD-MON-RR'), 299.5, 302.945, 297.02, 299.41, 8077315, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-NOV-25','DD-MON-RR'), 304, 305.59, 297.6714, 300.37, 8344046, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-NOV-25','DD-MON-RR'), 307.51, 307.64, 301.23, 303.61, 10326983, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-NOV-25','DD-MON-RR'), 319.23, 320.6325, 309.1, 309.48, 8973258, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-NOV-25','DD-MON-RR'), 316.26, 322.25, 316.21, 320.41, 10578266, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-NOV-25','DD-MON-RR'), 317.5, 319.05, 315.28, 315.62, 5030216, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-NOV-25','DD-MON-RR'), 315, 319.555, 314.21, 316.89, 5794505, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-NOV-25','DD-MON-RR'), 311.89, 314.43, 307.642, 314.21, 7302347, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-NOV-25','DD-MON-RR'), 310.99, 314.84, 310.26, 313.42, 7206111, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-NOV-25','DD-MON-RR'), 309.61, 313.1, 305.63, 311.68, 6832481, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-NOV-25','DD-MON-RR'), 306.71, 312.22, 305.1, 309.25, 7085164, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-NOV-25','DD-MON-RR'), 311, 312.32, 306.21, 309.35, 7770040, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-OCT-25','DD-MON-RR'), 308.54, 312.87, 307.25, 311.12, 7721297, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-OCT-25','DD-MON-RR'), 305.79, 312.61, 305.1, 309.44, 7514556, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-OCT-25','DD-MON-RR'), 303.51, 308.245, 303.01, 305.51, 7520324, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-OCT-25','DD-MON-RR'), 304.86, 307.9674, 303.16, 305.36, 6335993, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('26-OCT-25','DD-MON-RR'), 302.16, 304.53, 301.01, 304.15, 5642222, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-OCT-25','DD-MON-RR'), 296.08, 302.6, 295.45, 300.44, 7228330, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-OCT-25','DD-MON-RR'), 294.38, 296.3699, 292.51, 294.54, 5438810, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-OCT-25','DD-MON-RR'), 297.77, 298.0599, 290.5448, 294.11, 8054115, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-OCT-25','DD-MON-RR'), 301.66, 304.05, 297, 297.09, 7372671, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-OCT-25','DD-MON-RR'), 298.5, 303.69, 298.1601, 302.36, 6894943, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-OCT-25','DD-MON-RR'), 299.16, 299.55, 294.2, 297.56, 10153454, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-OCT-25','DD-MON-RR'), 305.35, 308.6799, 297.07, 298.54, 10549447, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-OCT-25','DD-MON-RR'), 306.39, 312.1199, 305.44, 305.69, 11354778, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-OCT-25','DD-MON-RR'), 305.84, 307, 294.21, 302.08, 16178755, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-OCT-25','DD-MON-RR'), 305.6, 309.46, 305.45, 307.97, 10788680, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-OCT-25','DD-MON-RR'), 305.66, 310.47, 300.81, 300.89, 8597384, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-OCT-25','DD-MON-RR'), 305.05, 308.035, 303.3947, 305.53, 7060332, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-OCT-25','DD-MON-RR'), 308.21, 308.7832, 303.55, 304.03, 6489883, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-OCT-25','DD-MON-RR'), 309.35, 310.01, 304.7, 307.69, 8454217, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-OCT-25','DD-MON-RR'), 310.18, 311.7474, 305.1301, 309.18, 7214502, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-OCT-25','DD-MON-RR'), 308.51, 311.66, 308.21, 310.03, 6029854, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('01-OCT-25','DD-MON-RR'), 310, 310.56, 306.14, 307.55, 7599973, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-SEP-25','DD-MON-RR'), 313.97, 314.59, 307.41, 310.71, 9235211, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-SEP-25','DD-MON-RR'), 316.25, 317.41, 310.11, 315.43, 11823315, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-SEP-25','DD-MON-RR'), 317.06, 318.01, 313.66, 315.69, 6462442, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('25-SEP-25','DD-MON-RR'), 314.9, 317.81, 313.704, 316.06, 7258136, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-SEP-25','DD-MON-RR'), 314.12, 315.65, 311.8, 313.45, 7083198, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-SEP-25','DD-MON-RR'), 314.05, 316.5773, 311.665, 313.42, 7310513, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-SEP-25','DD-MON-RR'), 311.815, 316.3141, 310.58, 312.74, 8584420, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-SEP-25','DD-MON-RR'), 309.8, 313.7, 309.555, 312.44, 7520190, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-SEP-25','DD-MON-RR'), 313.6, 315.8, 309.12, 314.78, 23568551, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-SEP-25','DD-MON-RR'), 311.79, 313.44, 309.61, 313.23, 8050671, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-SEP-25','DD-MON-RR'), 310.39, 312.91, 308.7722, 311.75, 8657765, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-SEP-25','DD-MON-RR'), 310, 310.9, 307.1347, 309.19, 10525594, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-SEP-25','DD-MON-RR'), 307.17, 309.95, 307.17, 308.9, 7122015, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-SEP-25','DD-MON-RR'), 305, 307.55, 303.695, 306.91, 6846674, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-SEP-25','DD-MON-RR'), 301.24, 305.73, 300.7925, 305.56, 7942489, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-SEP-25','DD-MON-RR'), 296.7, 301.54, 295.4, 300.54, 7787303, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-SEP-25','DD-MON-RR'), 292.6, 299, 292.31, 297.85, 7848196, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-SEP-25','DD-MON-RR'), 294.89, 296.46, 291.44, 292.91, 8188506, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-SEP-25','DD-MON-RR'), 303.65, 305.15, 294.31, 294.38, 9837709, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-SEP-25','DD-MON-RR'), 300, 304.43, 298.28, 303.82, 6605797, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('02-SEP-25','DD-MON-RR'), 300.57, 300.57, 296.38, 299.51, 6173800, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('01-SEP-25','DD-MON-RR'), 300.26, 300.455, 294.5, 299.7, 7221855, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-AUG-25','DD-MON-RR'), 302.04, 302.95, 299.73, 301.42, 6796380, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-AUG-25','DD-MON-RR'), 300.025, 301.2399, 298.7, 301.07, 6410535, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('26-AUG-25','DD-MON-RR'), 297.25, 301.07, 297.04, 299.28, 6056513, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('25-AUG-25','DD-MON-RR'), 294.16, 298.74, 293.5001, 298.57, 6714749, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-AUG-25','DD-MON-RR'), 296.24, 297.3475, 294.14, 294.9, 5856258, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-AUG-25','DD-MON-RR'), 293.2, 297.16, 290.13, 296.24, 8552847, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-AUG-25','DD-MON-RR'), 291.94, 292.7661, 289.4725, 291.47, 6624161, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('19-AUG-25','DD-MON-RR'), 290.81, 293.33, 287.27, 292.24, 7374244, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('18-AUG-25','DD-MON-RR'), 290.83, 292.48, 289.53, 290.66, 6031520, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-AUG-25','DD-MON-RR'), 290, 291.9, 288.41, 291.53, 5386856, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-AUG-25','DD-MON-RR'), 294.84, 295.5, 289.82, 290.49, 7340518, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-AUG-25','DD-MON-RR'), 290.58, 294.2, 289.6391, 294.16, 6322381, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('12-AUG-25','DD-MON-RR'), 293.95, 294.55, 287.16, 290.53, 8420407, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('11-AUG-25','DD-MON-RR'), 291.5, 294.75, 290.34, 292.85, 8572034, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-AUG-25','DD-MON-RR'), 289.4, 291.32, 288.78, 289.56, 5510113, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-AUG-25','DD-MON-RR'), 288.98, 291.23, 284.706, 288.76, 6634506, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-AUG-25','DD-MON-RR'), 292.94, 293.46, 286.41, 286.94, 8057109, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('05-AUG-25','DD-MON-RR'), 292.3, 293.29, 290.16, 291.35, 6330155, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('04-AUG-25','DD-MON-RR'), 294.69, 295.785, 287.24, 291.37, 7182333, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('03-AUG-25','DD-MON-RR'), 290.26, 294.32, 290.26, 294.26, 6649542, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('31-JUL-25','DD-MON-RR'), 290.4, 291.795, 284.2376, 289.37, 12007111, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('30-JUL-25','DD-MON-RR'), 299.14, 300.975, 295.5, 296.24, 14749652, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('29-JUL-25','DD-MON-RR'), 297.42, 300.61, 297.38, 299.63, 8061742, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('28-JUL-25','DD-MON-RR'), 300, 301.2931, 296.2, 297.04, 7635719, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('27-JUL-25','DD-MON-RR'), 297.66, 299.43, 296.82, 298.28, 5840417, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('24-JUL-25','DD-MON-RR'), 296.7, 298.9, 295.955, 298.62, 5918875, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('23-JUL-25','DD-MON-RR'), 297.42, 299.5899, 296.2, 296.55, 7001242, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('22-JUL-25','DD-MON-RR'), 292.84, 296.99, 292.55, 296.76, 7083510, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('21-JUL-25','DD-MON-RR'), 291.5, 293.625, 289.18, 291.43, 6717461, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('20-JUL-25','DD-MON-RR'), 291, 294.18, 290.58, 290.97, 7898141, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('17-JUL-25','DD-MON-RR'), 289.52, 292.5, 288.23, 291.27, 12217018, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('16-JUL-25','DD-MON-RR'), 283.44, 290.2965, 283.44, 289.9, 8509504, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('15-JUL-25','DD-MON-RR'), 288.4, 290.73, 283.01, 285.82, 9979768, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('14-JUL-25','DD-MON-RR'), 288, 291.95, 285.48, 286.55, 12526110, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('13-JUL-25','DD-MON-RR'), 287.07, 289.3, 285.2556, 288.7, 9079941, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('10-JUL-25','DD-MON-RR'), 285.52, 287.38, 283.655, 286.86, 7384674, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('09-JUL-25','DD-MON-RR'), 283, 288.31, 283, 288.19, 8413847, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('08-JUL-25','DD-MON-RR'), 287.18, 287.195, 282.48, 283.16, 11273801, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('07-JUL-25','DD-MON-RR'), 289.275, 289.7, 280.31, 282.78, 15440856, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-JUL-25','DD-MON-RR'), 295.25, 296.04, 290.08, 291.97, 8825732, 'JPM');
INSERT INTO PriceHistory (timestamp, openPrice, highPrice, lowPrice, closePrice, volume, ticker)
VALUES (TO_DATE('06-JUL-24','DD-MON-RR'), 295.25, 296.04, 290.08, 291.97, 8825732, 'JPM');

INSERT INTO Users
VALUES ('a@example.com', 'Technology', 'NASDAQ', 1);
INSERT INTO Users
VALUES ('b@example.com', 'Technology', NULL, 1);
INSERT INTO Users
VALUES ('c@example.com', 'Technology', 'NYSE', 0);
INSERT INTO Users
VALUES ('d@example.com', 'Banking', NULL, 1);
INSERT INTO Users
VALUES ('e@example.com', 'Media', NULL, 1);
INSERT INTO Users
VALUES ('f@example.com', NULL, NULL, 0);

INSERT INTO Holds
VALUES ('a@example.com', 'AAPL', TO_DATE('24-NOV-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('a@example.com', 'MSFT', TO_DATE('23-NOV-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('a@example.com', 'JPM', TO_DATE('01-NOV-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('b@example.com', 'AAPL', TO_DATE('30-OCT-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('b@example.com', 'ORCL', TO_DATE('09-JUL-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('c@example.com', 'AAPL', TO_DATE('13-JUL-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('c@example.com', 'MSFT', TO_DATE('23-NOV-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('c@example.com', 'ORCL', TO_DATE('09-JUL-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('d@example.com', 'AAPL',TO_DATE('24-NOV-24','DD-MON-RR'));
INSERT INTO Holds
VALUES ('d@example.com', 'JPM',TO_DATE('24-NOV-25','DD-MON-RR'));
INSERT INTO Holds
VALUES ('e@example.com', 'AAPL',TO_DATE('24-NOV-25','DD-MON-RR'));

INSERT INTO DebtEquity
VALUES (265665, 65830, 265665/65830);
INSERT INTO DebtEquity
VALUES (264904, 66708, 264904/66708);
INSERT INTO DebtEquity
VALUES (273275,363076, 273275/363076);
INSERT INTO DebtEquity
VALUES (235290,287723, 235290/287723);
INSERT INTO DebtEquity
VALUES (4199993,360212, 4199993/360212);
INSERT INTO DebtEquity
VALUES (3864212,345836, 3864212/345836);

INSERT INTO Report
VALUES ('0000320193-25-000073', TO_DATE('2025-07-31', 'YYYY-MM-DD'), 2025, 94036, 23434, 1.57, 265665, 65830, 'AAPL');
INSERT INTO Report
VALUES ('0000320193-24-000081', TO_DATE('2024-08-01', 'YYYY-MM-DD'), 2024, 85777, 21448, 1.4, 264904, 66708, 'AAPL');
INSERT INTO Report
VALUES ('0001193125-25-256321', TO_DATE('2025-10-28', 'YYYY-MM-DD'), 2025, 77673,27747,3.73,273275,363076, 'MSFT');
INSERT INTO Report
VALUES ('0000950170-24-118967', TO_DATE('2024-10-29', 'YYYY-MM-DD'), 2024, 65585,24667,3.32,235290,287723, 'MSFT');
INSERT INTO Report
VALUES ('0001628280-25-048859', TO_DATE('2025-11-04', 'YYYY-MM-DD'), 2025, 46427,14393,5.08,4199993,360212, 'JPM');
INSERT INTO Report
VALUES ('0000019617-24-000611', TO_DATE('2024-10-29', 'YYYY-MM-DD'), 2024, 42654,12898,4.38,3864212,345836, 'JPM');

INSERT INTO AnalystRating
VALUES (1, 'AAPL', 7, TO_DATE('2025-11-23', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (2, 'AAPL', 7, TO_DATE('2025-11-22', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (3, 'MSFT', 6, TO_DATE('2025-11-23', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (4, 'MSFT', 6, TO_DATE('2025-11-22', 'YYYY-MM-DD'));
INSERT INTO AnalystRating
VALUES (5, 'JPM', 5, TO_DATE('2025-11-23', 'YYYY-MM-DD'));

INSERT INTO Contributes
VALUES ('0000320193-25-000073', 1);
INSERT INTO Contributes
VALUES ('0000320193-25-000073', 2);
INSERT INTO Contributes
VALUES ('0001193125-25-256321', 3);
INSERT INTO Contributes
VALUES ('0001193125-25-256321', 4);
INSERT INTO Contributes
VALUES ('0001628280-25-048859', 5);

INSERT INTO Derives
VALUES (1, 1);
INSERT INTO Derives
VALUES (2, 2);
INSERT INTO Derives
VALUES (101, 3);
INSERT INTO Derives
VALUES (102, 4);
INSERT INTO Derives
VALUES (201, 5);