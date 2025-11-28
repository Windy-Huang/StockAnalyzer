// This function checks the database connection and updates its status on the frontend.
async function checkDbConnection() {
    const statusElem = document.getElementById('dbStatus');
    const loadingGifElem = document.getElementById('loadingGif');

    const response = await fetch('/check-db-connection', {
        method: "GET"
    });

    // Hide the loading GIF once the response is received.
    loadingGifElem.style.display = 'none';
    // Display the statusElem's text in the placeholder.
    statusElem.style.display = 'inline';

    response.text()
    .then((text) => {
        statusElem.textContent = text;
    })
    .catch((error) => {
        statusElem.textContent = 'connection timed out';  // Adjust error handling if required.
    });
}


//////////////////////////// DB initialization from various API //////////////////////////////////////
async function initDB() {
    let response = await fetch("/initiate-db", {
        method: 'POST'
    });
    await response.json();
    response = await fetch("/insert-db", {
        method: 'POST'
    });
    console.log("Finish initiating database");
}


//////////////////////////// Stock Graph State Management //////////////////////////////////////
let selectedStock = null;
let priceChart = null;
let currentUserEmail = null; // This will be set by the login component
const CHART_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
];

//////////////////////////// Handler when stock is selected //////////////////////////////////////
let selectedTicker = "";
let selectedTickerFull = [];

async function handleStockSelection(symbol) {
    selectedTicker = symbol[0];
    selectedTickerFull = symbol;

    // Hide the duration filter and show the back button
    const portfolioControls = document.getElementById("portfolioControls");
    if (portfolioControls) {
        portfolioControls.innerHTML = '<button id="clearStockSelection" style="padding: 8px 20px; font-size: 14px;">Back to Portfolio</button>';
    }

    const container = document.getElementById("selectedStock");
    container.innerHTML = '';

    //////////////////////////// Render stock attributes here //////////////////////////////////////
    renderTitleRow(container);
    await renderStockDetail(container);
    await renderHoldOnSelect();

    //////////////////////////// Calls render graph here //////////////////////////////////////
    // Update the graph to show this specific stock
    if (selectedTicker) {
        selectedStock = selectedTicker;
        updateChartForStock(selectedTicker);
    }

    // Add listener for clear button
    const clearBtn = document.getElementById("clearStockSelection");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearStockSelection);
    }

    /////////////////////////// Renders recommendation here //////////////////////////////////
    const tickerValue = selectedTicker;
    const response = await fetch('/get-recommendation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ticker: tickerValue,
        })
    });

    const responseData = await response.json();
    const messageElement = document.getElementById('recommendation');

    if (responseData.success) {
        const recommendationSum = responseData.sum;
        const recommendationMsg = responseData.msg;
        messageElement.textContent = `${recommendationMsg} (${recommendationSum}/7)`;
    } else {
        messageElement.textContent = "Error getting recommendation!";
    }
}

function clearStockSelection() {
    selectedTicker = "";
    selectedTickerFull = [];
    selectedStock = null;

    // Clear stock details
    const container = document.getElementById("selectedStock");
    container.innerHTML = '';

    // Show the duration filter again and hide the back button
    const portfolioControls = document.getElementById("portfolioControls");
    if (portfolioControls) {
        portfolioControls.innerHTML = `
            <div id="holdingDurationFilter">
                <label for="durationSelect" style="margin-right: 10px; font-weight: bold;">Filter by holding duration:</label>
                <select id="durationSelect" style="padding: 5px 10px;">
                    <option value="" selected>All holdings (no filter)</option>
                    <option value="day">Held at least 1 day</option>
                    <option value="week">Held at least 1 week</option>
                    <option value="month">Held at least 1 month</option>
                    <option value="year">Held at least 1 year</option>
                </select>
            </div>
        `;

        // Re-add the event listener for the newly created dropdown
        addHoldingDurationFilterListener();
    }

    // Return to portfolio view (no filter initially)
    if (currentUserEmail) {
        updateChartForPortfolio();
    }
}

function renderTitleRow(container) {
    let description = "";
    if (parent && parent.frames && parent.frames["menu"]) {
        const menuDoc = parent.frames["menu"].document;
        const buttons = menuDoc.querySelectorAll(".stockButton");
        const btn = Array.from(buttons).find(b => b.textContent === selectedTicker);
        if (btn && btn.classList.contains("popular")) {
            description = "🔥 This stock is hold by all users of this application";
        } else if (btn && btn.classList.contains("leastPopular")) {
            description = "❄️ Within your preferred industry, this stock is hold by the least users";
        }
    }

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "baseline";
    titleRow.style.gap = "10px";

    const header = document.createElement("h2");
    header.textContent = `${selectedTickerFull[1]} (${selectedTicker})`;
    header.style.margin = "8px";
    titleRow.appendChild(header);

    if (description) {
        const desc = document.createElement("span"); // or document.createElement("small")
        desc.textContent = description;
        desc.style.fontSize = "16px";
        titleRow.appendChild(desc);
    }

    container.appendChild(titleRow);
}

async function renderStockDetail(container) {
    const metaData = [
        { key: "timestamp", label: "Last updated: " },
        { key: "openPrice", label: "Open price: $" },
        { key: "highPrice", label: "High price: $" },
        { key: "lowPrice", label: "Low price: $" },
        { key: "closePrice", label: "Close price: $" },
        { key: "volume", label: "Volume: " }
    ];

    metaData.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.style.display = "flex";
        rowDiv.style.alignItems = "center";
        rowDiv.style.gap = "10px";
        rowDiv.style.margin = "1px 0";

        const labelSpan = document.createElement("span");
        labelSpan.textContent = row.label;
        labelSpan.style.fontWeight = "bold";
        rowDiv.appendChild(labelSpan);

        const valueSpan = document.createElement("span");
        valueSpan.dataset.field = row.key;
        rowDiv.appendChild(valueSpan);

        const spacer = document.createElement("span");
        spacer.style.flex = "1";
        rowDiv.appendChild(spacer);

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.textContent = "X";
        closeBtn.style.width = "20px";
        closeBtn.style.padding = "0px";
        closeBtn.addEventListener("click", async () => {
            rowDiv.remove();
            await updateStockPriceDetail(container);
        });
        rowDiv.appendChild(closeBtn);

        container.appendChild(rowDiv);
    });

    await updateStockPriceDetail(container);
}

async function updateStockPriceDetail(container) {
    let fields = "";
    const renderedFields = container.querySelectorAll("[data-field]");
    renderedFields.forEach(span => {
        const key = span.dataset.field;
        fields = fields + key + ", ";
    });
    fields = fields.replace(/, $/, '');

    const response = await fetch('/price-history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ticker: selectedTicker,
            fields: fields
        })
    });
    const responseData = await response.json();

    if (response.ok && responseData.data[0]) {
        for (let i = 0; i < renderedFields.length; i++) {
            renderedFields[i].textContent = responseData.data[0][i];
        }
    }
}


//////////////////////////// Side bar menu generation //////////////////////////////////////
async function populateMenu(option) {
    const stockMenu = document.getElementById('stockMenu');
    if (!stockMenu) return;

    stockMenu.innerHTML = "";
    const response = await fetch(`/menu?industry=${option.preferredIndustry}`, { method: 'GET' });
    const responseData = await response.json();

    if (response.ok) {
        const popular = responseData.popular.flat();
        const leastPopular = responseData.leastPopular.flat();

        responseData.data.forEach((symbol) => {
            const btn = document.createElement("button");
            btn.className = "stockButton";
            btn.textContent = symbol[0];

            if (option.display) {
                if (popular.includes(symbol[0])) {
                    btn.classList.add("popular");
                } else if (leastPopular.includes(symbol[0])) {
                    btn.classList.add("leastPopular");
                }
            }

            btn.addEventListener("click", () => {
                if (parent && parent.frames && parent.frames["contents"] &&
                    typeof parent.frames["contents"].handleStockSelection === "function") {
                    parent.frames["contents"].handleStockSelection(symbol);
                }
                parent.frames["contents"].document.dispatchEvent(new Event("click"));
            });

            stockMenu.appendChild(btn);
            stockMenu.appendChild(document.createElement("br"));
        });
    }
}

async function refreshMenu() {
    preferredIndustry = document.getElementById("settingIndustry").value;
    display = document.getElementById("settingRec").checked;
    if (parent && parent.frames && parent.frames["menu"] && typeof parent.frames["menu"].populateMenu === "function") {
        parent.frames["menu"].populateMenu({
            preferredIndustry: preferredIndustry,
            display: display,
        });
    } else {
        console.log("Could not find menu frame or populateMenu()");
    }
}


//////////////////////////// Search bar generation //////////////////////////////////////
let filterList = "";

async function applyFilterList(attribute, text) {
    const where = filterList + attribute + " LIKE '%" + text + "%'";
    const response = await fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            where: where
        })
    });
    const responseData = await response.json();

    if (response.ok) {
        const result = document.getElementById('filterResult');
        result.innerHTML = "";

        responseData.data.forEach((symbol) => {
            const elem = document.createElement("button");
            elem.textContent = symbol;
            elem.style = "width: 750px; text-align: left;";
            elem.addEventListener("click", () => {
                if (parent && parent.frames && parent.frames["contents"] &&
                    typeof parent.frames["contents"].handleStockSelection === "function") {
                    parent.frames["contents"].handleStockSelection(symbol);
                }
                document.getElementById("clearFilter").dispatchEvent(new Event('click'));
            });
            result.appendChild(elem);
        });
    }
}

function addToFilterList(attribute, text, comparitor) {
    filterList = filterList + attribute + " LIKE '%" + text + "%' " + comparitor + " ";
}

function clearFilterList() {
    filterList = "";
}

function addSearchBarListener() {
    const attribute = document.getElementById("stockAttribute");
    const val = document.getElementById("val");
    const comparitor = document.getElementById("comparitor");
    const clearBtn = document.getElementById("clearFilter");
    if (!attribute || !val || !comparitor || !clearBtn) return;

    val.addEventListener("input", async () => {
        const text = val.value.trim();
        if (text.length === 0) {
            comparitor.disabled = true;
        } else {
            comparitor.disabled = false;
            await applyFilterList(attribute.value, text);
        }
    });

    comparitor.addEventListener("change", () => {
        if (comparitor.value !== "") {
            addToFilterList(attribute.value, val.value.trim(), comparitor.value);
            val.value = "";
            comparitor.disabled = true;
            comparitor.value = "";
        }
    });

    clearBtn.addEventListener("click", () => {
        clearFilterList();
        val.value = "";
        comparitor.disabled = true;
        comparitor.value = "";
        document.getElementById("filterResult").innerHTML = "";
    });
}


//////////////////////////// User setting popup generation //////////////////////////////////////
function addSettingListener() {
    const login = document.getElementById("userSetting");
    const cancel = document.getElementById("settingCancel");
    const submit = document.getElementById("settingSubmit");
    const del = document.getElementById("settingDelete");
    if (!login || !cancel || !submit || !del) return;

    login.addEventListener("click", () => {
        document.getElementById("userSettingPopup").style.display = "flex";
    });

    cancel.addEventListener("click", () => {
        document.getElementById("userSettingPopup").style.display = "none";
    });

    submit.addEventListener("click", async (e) => {
        await handleSettingUpdate(e);
    });

    del.addEventListener("click", async (e) => {
        await handleDeleteUser(e);
    });
}

let username = "";

async function handleSettingUpdate(e) {
    e.preventDefault();

    if (username === "") { // Not logged in, insert new / load existing user
        const email = document.getElementById("settingEmail").value.trim();
        if (email.length < 7 || !email.includes('@') || email.includes(' ')) {
            document.getElementById("settingMessage").innerText = "Invalid email";
            return;
        }

        document.getElementById("settingMessage").innerText = "";
        username = email;
        document.getElementById("userSetting").innerText = email[0].toUpperCase();
        await loadSetting();
    } else { // Logged in, update setting
        await updateSetting();
    }
}

async function loadSetting() {
    document.getElementById("settingEmail").parentElement.style.display = "none";
    document.getElementById("settingIndustry").parentElement.style.display = "flex";
    document.getElementById("settingExchange").parentElement.style.display = "flex";
    document.getElementById("settingRec").parentElement.style.display = "flex";
    document.getElementById("settingDelete").hidden = false;
    await loadSettingDropdown();

    const response = await fetch('/user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: username
        })
    });
    const responseData = await response.json();

    if (response.ok && responseData.data.length === 1) {
        result = responseData.data[0];
        document.getElementById("settingIndustry").value = result[1];
        document.getElementById("settingExchange").value = result[2];
        document.getElementById("settingRec").checked = result[3] === 1;
        document.getElementById("settingIndustry").dispatchEvent(new Event("change"));
        document.getElementById("settingExchange").dispatchEvent(new Event("change"));
        await refreshMenu();
    }

    // Trigger graph to load user's portfolio
    onUserLogin(username);
}

async function loadSettingDropdown() {
    const response = await fetch(`/setting-dropdown`, { method: 'GET' });
    const responseData = await response.json();

    if (response.ok) {
        const selectInd = document.getElementById("settingIndustry");
        const indLabel = document.getElementById("industryTickers");
        const selectEx = document.getElementById("settingExchange");
        const exLabel = document.getElementById("exchangeTickers");

        selectInd.innerHTML = '<option value="" selected> </option>';
        selectEx.innerHTML = '<option value="" selected> </option>';
        indLabel.textContent = "";
        exLabel.textContent = "";

        responseData.industry.forEach(([industry, count]) => {
            const opt = document.createElement("option");
            opt.value = industry;
            opt.textContent = industry;
            opt.dataset.count = count;
            selectInd.appendChild(opt);
        });
        responseData.exchange.forEach(([exchange, count]) => {
            const opt = document.createElement("option");
            opt.value = exchange;
            opt.textContent = exchange;
            opt.dataset.count = count;
            selectEx.appendChild(opt);
        });

        selectInd.onchange = () => {
            indLabel.textContent = "";
            if (selectInd.value) {
                const option = selectInd.options[selectInd.selectedIndex];
                indLabel.textContent = `${option.dataset.count} tickers`;
            }
        };
        selectEx.onchange = () => {
            exLabel.textContent = "";
            if (selectEx.value) {
                const option = selectEx.options[selectEx.selectedIndex];
                exLabel.textContent = `${option.dataset.count} tickers`;
            }
        };
    }
}

async function updateSetting() {
    const response = await fetch('/user', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: username,
            industry: document.getElementById("settingIndustry").value,
            exchange: document.getElementById("settingExchange").value,
            rec: document.getElementById("settingRec").checked ? 1 : 0,
        })
    });

    const responseData = await response.json();
    if (responseData.success) {
        document.getElementById("settingMessage").innerText = "Update successful!";
        await new Promise(resolve => setTimeout(resolve, 1500));

        document.getElementById("settingMessage").innerText = "";
        document.getElementById("userSettingPopup").style.display = "none";
        await refreshMenu();
    } else {
        document.getElementById("settingMessage").innerText = "Error inserting to database";
    }
}

async function handleDeleteUser(e) {
    e.preventDefault();
    const msg = document.getElementById("settingMessage");

    const response = await fetch('/user', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: username
        })
    });
    const responseData = await response.json();

    if (response.ok && responseData.success) {
        msg.innerText = "Successfully deleted!";
        await new Promise(resolve => setTimeout(resolve, 1500));
        resetSettingPopup();
        await refreshMenu();
    } else {
        msg.innerText = "Error deleting user";
    }
}

function resetSettingPopup() {
    document.getElementById("settingEmail").parentElement.style.display = "flex";
    document.getElementById("settingEmail").value = "";
    document.getElementById("settingIndustry").parentElement.style.display = "none";
    document.getElementById("settingExchange").parentElement.style.display = "none";
    document.getElementById("settingRec").parentElement.style.display = "none";
    document.getElementById("settingRec").checked = false;
    document.getElementById("settingMessage").innerText = "";
    document.getElementById("settingDelete").hidden = true;

    username = "";
    document.getElementById("userSetting").innerText = "Login";
    document.getElementById("userSettingPopup").style.display = "none";

    parent.frames["contents"].document.dispatchEvent(new Event("click"));
}


//////////////////////////// Stock holding logic //////////////////////////////////////
function addHoldListener() {
    const btn = document.getElementById("holdButton");
    if (!btn) return;

    btn.addEventListener('click', async() => {
        const action = btn.textContent === "Hold" ? "added to" : "removed from";
        const response = await fetch('/holding', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: username,
                ticker: selectedTicker,
                add: btn.textContent === "Hold"
            })
        });
        btn.hidden = true;
        await refreshMenu();

        // Navigate back to portfolio to see updated holdings in the overlaid graph
        clearStockSelection();

        // Show a brief confirmation message
        const chartMessage = document.getElementById('chartMessage');
        if (chartMessage) {
            chartMessage.textContent = `${selectedTicker} ${action} your portfolio`;
            setTimeout(() => {
                if (chartMessage.textContent === `${selectedTicker} ${action} your portfolio`) {
                    chartMessage.textContent = '';
                }
            }, 3000);
        }
    });
}

async function renderHoldOnSelect() {
    const btn = document.getElementById("holdButton");
    btn.hidden = false;

    if (username) {
        btn.disabled = false;
        btn.style.cursor = "pointer";
        document.getElementById("holdButton").dataset.tooltip = "";

        const response = await fetch(`/holding?email=${username}&ticker=${selectedTicker}`, { method: 'GET' });
        const responseData = await response.json();
        responseData.exist ? btn.textContent = "Unhold" : btn.textContent = "Hold";
    } else if (username === "") {
        btn.disabled = true;
        btn.style.cursor = "not-allowed";
        document.getElementById("holdButton").dataset.tooltip = "Please login";
    }
}


//////////////////////////// Insert report logic //////////////////////////////////////
function addInsertReportListener() {
    const btn = document.getElementById("insertButton");
    const cancel = document.getElementById("reportCancel");
    const submit = document.getElementById("reportSubmit");
    if (!btn || !cancel || !submit) return;

    document.addEventListener('click', () => {
        if (selectedTicker) btn.hidden = false;
    });

    btn.addEventListener("click", () => {
        resetReportPopup();
        document.getElementById("insertReportPopup").style.display = "flex";
    });

    cancel.addEventListener("click", () => {
        document.getElementById("insertReportPopup").style.display = "none";
    });

    submit.addEventListener("click", async (e) => {
        await handleInsertReport(e);
    });
}

function resetReportPopup() {
    const form = document.getElementById("insertReportForm");
    const accessNumRow = document.getElementById("accessNumRow");
    const error = document.getElementById("errorMessage");
    const unit = document.getElementById("unit");

    form.reset();
    accessNumRow.style.display = "";
    form.querySelectorAll(".report-field-row").forEach(row => row.remove());
    error.textContent = "";
    unit.textContent = "";
}

let parsed;

async function handleInsertReport(e) {
    e.preventDefault();
    const popup = document.getElementById("insertReportPopup");
    const accessRow = document.getElementById("accessNumRow");
    const accessInput = document.getElementById("accessNum");
    const error = document.getElementById("errorMessage");

    if (accessRow.style.display !== "none") { // prompt access num for auto-parse
        const accessNum = accessInput.value.trim();
        if (!accessNum) {
            error.textContent = "Please enter an access number";
            return;
        } else if (!(/^[0-9-]+$/.test(accessNum))) {
            error.textContent = "Invalid characters in access number";
            return;
        }

        const response = await fetch('/insert-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accessNum: accessNum
            })
        });
        const responseData = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                error.textContent = "No report have this access number";
            } else if (response.status === 422) {
                error.textContent = "Not all values can be detected, please manually enter";
                accessRow.style.display = "none";
                parsed = responseData.report;
                renderManualReportFields();
            } else if (response.status === 501) {
                error.textContent = "Report with this access number already exists";
            } else if (response.status === 502) {
                error.textContent = "The stock for this report is not in the database";
            } else {
                error.textContent = "Error inserting report";
            }
        } else {
            error.innerText = "Insert successful!";
            await new Promise(resolve => setTimeout(resolve, 1500));
            popup.style.display = "none";
        }
    } else { // Insert user parsed report
        validateReportFields();
        if (Object.keys(parsed).length < 9) return;

        const response = await fetch('/insert-report-parsed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                report: parsed
            })
        });
        const responseData = await response.json();

        if (responseData.success) {
            error.innerText = "Insert successful!";
        } else {
            if (response.status === 501) {
                error.textContent = "Report with this access number already exists";
            } else if (response.status === 502) {
                error.textContent = "The stock for this report is not in the database";
            } else {
                error.textContent = "Error inserting report";
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        popup.style.display = "none";
    }
}

function renderManualReportFields() {
    const form = document.getElementById("insertReportForm");
    const error = document.getElementById("errorMessage");
    const fields = ["revenue", "income", "eps", "liabilities", "equity"];
    document.getElementById("unit").textContent = "(In units of million, except eps)";

    for (const key of fields) {
        const row = document.createElement("div");
        row.className = "form-row report-field-row";

        const label = document.createElement("label");
        label.htmlFor = `report-${key}`;
        label.textContent = key;

        const input = document.createElement("input");
        input.type = "text";
        input.id = `report-${key}`;
        input.name = key;
        input.value = parsed[key] ? parsed[key] : "";

        row.appendChild(label);
        row.appendChild(input);
        form.insertBefore(row, error);
    }
}

function validateReportFields() {
    const form = document.getElementById("insertReportForm");
    const error = document.getElementById("errorMessage");
    const rows = form.querySelectorAll(".report-field-row");

    rows.forEach(row => {
        const input = row.querySelector("input[type='text']");
        const val = input.value.trim();
        if (!val) {
            error.textContent = "Please fill in all fields";
            return;
        } else if (Number.isNaN(Number(val))) {
            error.textContent = "Only numerical character allowed in all fields";
            return;
        } else {
            parsed[input.name] = val;
        }
    });
}


//////////////////////////// Stock Graph Functions //////////////////////////////////////

// Update chart to show portfolio (all held stocks)
async function updateChartForPortfolio(durationFilter = null) {
    const chartMessage = document.getElementById('chartMessage');
    const chartTitle = document.getElementById('chartTitle');


    if (!currentUserEmail) {
        if (chartMessage) chartMessage.textContent = 'Please login to view your portfolio';
        if (priceChart) {
            priceChart.destroy();
            priceChart = null;
        }
        return;
    }

    try {
        // Get user's held stocks - either filtered by duration or all
        let response, data;
        if (durationFilter) {
            const url = `/user-held-stocks/${encodeURIComponent(currentUserEmail)}/duration/${durationFilter}`;
            response = await fetch(url);
        } else {
            const url = `/user-held-stocks/${encodeURIComponent(currentUserEmail)}`;
            response = await fetch(url);
        }
        data = await response.json();

        if (!data.success || data.data.length === 0) {
            const filterText = durationFilter ? ` matching the selected duration filter` : '';
            if (chartMessage) chartMessage.textContent = `You do not hold any stocks${filterText}`;
            if (chartTitle) {
                const durationLabels = {
                    'day': ' (Held >= 1 day)',
                    'week': ' (Held >= 1 week)',
                    'month': ' (Held >= 1 month)',
                    'year': ' (Held >= 1 year)'
                };
                chartTitle.textContent = `Portfolio Price History${durationFilter ? durationLabels[durationFilter] : ''}`;
            }
            if (priceChart) {
                priceChart.destroy();
                priceChart = null;
            }
            return;
        }

        // Fetch price history for all held stocks
        const priceDataPromises = data.data.map(stock =>
            fetch(`/price-history/${stock.ticker}`).then(res => res.json())
        );
        const priceDataResults = await Promise.all(priceDataPromises);

        // Prepare datasets for chart
        const datasets = [];
        priceDataResults.forEach((result, index) => {
            if (result.success && result.data.length > 0) {
                const stock = data.data[index];
                datasets.push({
                    label: stock.ticker,
                    data: result.data.map(point => ({
                        x: new Date(point.date),
                        y: point.close
                    })),
                    borderColor: CHART_COLORS[index % CHART_COLORS.length],
                    backgroundColor: 'transparent',
                    tension: 0.1
                });
            }
        });

        // Update title based on filter
        if (chartTitle) {
            const durationLabels = {
                'day': ' (Held >= 1 day)',
                'week': ' (Held >= 1 week)',
                'month': ' (Held >= 1 month)',
                'year': ' (Held >= 1 year)'
            };
            chartTitle.textContent = `Portfolio Price History${durationFilter ? durationLabels[durationFilter] : ''}`;
        }
        if (chartMessage) chartMessage.textContent = '';
        renderChart(datasets);

    } catch (error) {
        console.error('Error updating portfolio chart:', error);
        if (chartMessage) chartMessage.textContent = 'Error loading portfolio data';
    }
}

// Update chart to show single stock
async function updateChartForStock(ticker) {
    const chartMessage = document.getElementById('chartMessage');
    const chartTitle = document.getElementById('chartTitle');

    try {
        const response = await fetch(`/price-history/${ticker}`);
        const data = await response.json();

        if (!data.success || data.data.length === 0) {
            if (chartMessage) chartMessage.textContent = `No price history data for ${ticker}`;
            if (priceChart) {
                priceChart.destroy();
                priceChart = null;
            }
            return;
        }

        const dataset = {
            label: ticker,
            data: data.data.map(point => ({
                x: new Date(point.date),
                y: point.close
            })),
            borderColor: CHART_COLORS[0],
            backgroundColor: 'transparent',
            tension: 0.1
        };

        if (chartTitle) chartTitle.textContent = `${ticker} Price History`;
        if (chartMessage) chartMessage.textContent = '';
        renderChart([dataset]);

    } catch (error) {
        console.error('Error updating stock chart:', error);
        if (chartMessage) chartMessage.textContent = 'Error loading stock data';
    }
}

// Render the chart with given datasets
function renderChart(datasets) {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;

    // Destroy existing chart
    if (priceChart) {
        priceChart.destroy();
    }

    // Create new chart
    priceChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: '#404040'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (USD)',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: '#404040'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// Function to be called by login component when user logs in
function onUserLogin(email) {
    currentUserEmail = email;
    selectedStock = null;
    updateChartForPortfolio();
}

// Function to be called by login component when user logs out
function onUserLogout() {
    currentUserEmail = null;
    selectedStock = null;
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
    const chartMessage = document.getElementById('chartMessage');
    if (chartMessage) chartMessage.textContent = 'Please login to view your portfolio';
}

//////////////////////////// Holding Duration Filter Logic //////////////////////////////////////
function addHoldingDurationFilterListener() {
    const durationSelect = document.getElementById("durationSelect");
    if (!durationSelect) return;

    durationSelect.addEventListener("change", () => {
        const duration = durationSelect.value;
       
        // Only update chart if user is logged in and not viewing a specific stock
        if (currentUserEmail && !selectedTicker) {
            console.log("Updating chart with duration:", duration);
            if (duration) {
                updateChartForPortfolio(duration);
            } else {
                // If empty value selected, show all holdings
                updateChartForPortfolio();
            }
        } else {
            console.log("Not updating chart - conditions not met");
        }
    });
}

// ---------------------------------------------------------------
// Initializes the webpage functionalities.
// Add or remove event listeners based on the desired functionalities.
window.onload = function() {
    //document.getElementById("initDB").addEventListener("click", initDB);
    populateMenu({preferredIndustry: "", display: false});
    addSearchBarListener();
    addSettingListener();
    addHoldListener();
    addInsertReportListener();
    addHoldingDurationFilterListener();
};
