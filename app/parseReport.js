// Class for handling report parsing
import fs from "fs";
import fetch from "node-fetch";
import { Parser } from "htmlparser2";

import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, './.env') });

// Return the appropriate key for the report table
function matchForKeyword(str) {
    const patterns = {
        revenue: /(revenue|net sales)/i,
        income: /^net income$/i,
        eps: /(basic|diluted)/i,
        liabilities: /^total liabilities$/i,
        equity: /^total liabilities and.*equity$/i
    }

    for (const [key, regex] of Object.entries(patterns)) {
        if (regex.test(str)) {
            return key;
        }
    }
    return null;
}

// Return the appropriate section (whether it is the intended table or not)
function matchForSection(str) {
    const patterns = {
        statement: /^(?=.*(income|operation|financial))(?=.*statement).*$/i,
        balance: /balance sheet/i,
    };

    for (const [key, regex] of Object.entries(patterns)) {
        if (regex.test(str)) {
            return key;
        }
    }
    return null;
}

// Create a parser to go through the HTML file to search for 2 table - income statement, balance sheet
// For each valid table, go through each row
// If the 1st column of the row contains report table attributes, take the next column that contains numeric result
async function createParser(stream) {
    return new Promise((resolve, reject) => {
        const report = new Map();
        let currentKey = null;
        let currentValue = null;
        let currentSection = null;
        let inTd = false;
        let firstCol = true;
        let str = "";

        const parser = new Parser( {
            onopentag(name) {
                if (name === "tr") {
                    firstCol = true;
                    currentKey = null;
                    currentValue = null;
                } else if (name === "td") {
                    inTd = true;
                    str = "";
                }
            },
            ontext(text) {
                // Only search for content, if it is within a table, and the table is valid
                const section = matchForSection(text.trim());
                if (section) currentSection = section;
                if (!inTd || !currentSection) return;

                const trimmed = text.trim();
                if (trimmed === "") return;
                str += trimmed;
            },
            onclosetag(tagname) {
                if (tagname === "td") {
                    if (firstCol && currentSection && currentKey === null) {
                        currentKey = matchForKeyword(str, currentSection);
                    } else if (currentKey && currentValue === null) {
                        const val = parseFloat(str.replace(/,/g, ""));
                        if (!isNaN(val)) currentValue = val;
                    }
                    firstCol = false;
                    inTd = false;
                } else if (tagname === "tr") {
                    if (currentKey && currentValue && !report.has(currentKey)) {
                        report.set(currentKey, currentValue);
                        if (report.size === 5) {
                            report.set("equity", report.get("equity") - report.get("liabilities"));
                            stream.destroy();
                            parser.end();
                        }
                    }
                }
            },
            onend() {
                resolve(report);
            },
            onerror(err) {
                reject(err);
            },
        }, { decodeEntities: true } );

        stream.on("data", chunk => parser.write(chunk));
        stream.on("end", () => parser.end());
        stream.on("error", reject); });
}

// Calls HTML parser with local file
export async function parseFinancialStatementLocal(link) {
    const stream = fs.createReadStream(link, { encoding: "utf8" });
    return await createParser(stream);
}

// Calls HTMl parser with online file (via url)
export async function parseFinancialStatementURL(url) {
    // Create appropriate request so EDGAR wouldn't mark it as spam
    const res = await fetch(url, {
        headers: {
            "User-Agent": `Download10Q/1.0 (contact: ${process.env.EMAIL})`
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    const stream = res.body;
    stream.setEncoding("utf8");
    return await createParser(stream);
}


// Unit test illustrating how to use the local and url HTML parser
(async () => {
    try {
        let result = await parseFinancialStatementURL("https://www.sec.gov/Archives/edgar/data/320193/000032019325000073/aapl-20250628.htm#i47143780af9f4d3d85123ce19d9f33bd_13");
        console.log(result);
        result = await parseFinancialStatementLocal("./example.html");
        console.log(result);
    } catch (err) {
        console.error("Error:", err);
    }
})();

