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
    console.log("start");
    let response = await fetch("/initiate-db", {
        method: 'POST'
    });
    await response.json();
    console.log("finished initiate");
    response = await fetch("/insert-db", {
        method: 'POST'
    });
    console.log("finished insert");
}


//////////////////////////// Handler when stock is selected //////////////////////////////////////
let selectedTicker = "";
let selectedTickerFull = [];

function handleStockSelection(symbol) {
    selectedTicker = symbol[0];
    selectedTickerFull = symbol;
    const container = document.getElementById("selectedStock");
    container.innerHTML = "";

    //////////////////////////// Render stock attributes here //////////////////////////////////////
    renderTitleRow(container);
    renderStockDetail(container);

    //////////////////////////// Calls render graph here //////////////////////////////////////


    /////////////////////////// Renders recommendation here //////////////////////////////////
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
    header.textContent = `Ticker: ${selectedTicker}`;
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

function renderStockDetail(container) {
    const attributes = [
        { label: "Company Name: ", value: selectedTickerFull[1] },
        { label: "Country: ", value: selectedTickerFull[2] },
        { label: "Industry: ", value: selectedTickerFull[3] },
        { label: "Exchange: ", value: selectedTickerFull[4] },
        { label: "Market Capital: $", value: selectedTickerFull[5] }
    ];

    attributes.forEach(row => {
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
        valueSpan.textContent = row.value;
        rowDiv.appendChild(valueSpan);

        const spacer = document.createElement("span");
        spacer.style.flex = "1";
        rowDiv.appendChild(spacer);

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.textContent = "X";
        closeBtn.style.width = "20px";
        closeBtn.style.padding = "0px";
        closeBtn.addEventListener("click", () => {
            rowDiv.remove();
        });
        rowDiv.appendChild(closeBtn);

        container.appendChild(rowDiv);
    });
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
                console.log("Clicked stock:", symbol);
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
                console.log("Clicked stock:", symbol);
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
    if (!login || !cancel || !submit) return;

    login.addEventListener("click", () => {
        document.getElementById("userSettingPopup").style.display = "flex";
    });

    cancel.addEventListener("click", () => {
        document.getElementById("userSettingPopup").style.display = "none";
    });

    submit.addEventListener("click", async (e) => {
        await handleSettingUpdate(e);
    });
}

let username = "";

async function handleSettingUpdate(e) {
    e.preventDefault();

    if (username === "") { // Not logged in, insert new / load existing user
        const email = document.getElementById("settingEmail").value.trim();
        if (email.length < 7 || !email.includes('@')) {
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

    console.log(responseData.data);
    if (response.ok && responseData.data.length === 1) {
        result = responseData.data[0];
        document.getElementById("settingIndustry").value = result[1];
        document.getElementById("settingExchange").value = result[2];
        document.getElementById("settingRec").checked = result[3] === 1;
        document.getElementById("settingIndustry").dispatchEvent(new Event("change"));
        document.getElementById("settingExchange").dispatchEvent(new Event("change"));
        await refreshMenu();
    }
}

async function loadSettingDropdown() {
    const response = await fetch(`/setting-dropdown`, { method: 'GET' });
    const responseData = await response.json();

    if (response.ok) {
        const selectInd = document.getElementById("settingIndustry");
        const indLabel = document.getElementById("industryTickers");
        const selectEx = document.getElementById("settingExchange");
        const exLabel = document.getElementById("exchangeTickers");

        responseData.industry.forEach(([industry, count]) => {
            const opt = document.createElement("option");
            opt.value = industry;
            opt.textContent = industry;
            opt.dataset.count = count;
            selectInd.appendChild(opt);
        });
        selectInd.addEventListener("change", () => {
            indLabel.textContent = "";
            if (selectInd.value) {
                indLabel.textContent = `${selectInd.options[selectInd.selectedIndex].dataset.count} tickers`;
            }
        });

        responseData.exchange.forEach(([exchange, count]) => {
            const opt = document.createElement("option");
            opt.value = exchange;
            opt.textContent = exchange;
            opt.dataset.count = count;
            selectEx.appendChild(opt);
        });
        selectEx.addEventListener("change", () => {
            exLabel.textContent = "";
            if (selectEx.value) {
                exLabel.textContent = `${selectEx.options[selectEx.selectedIndex].dataset.count} tickers`;
            }
        });
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
        document.getElementById("settingMessage").innerText = "";
        document.getElementById("userSettingPopup").style.display = "none";
        await refreshMenu();
    } else {
        document.getElementById("settingMessage").innerText = "Error inserting to database";
    }
}


//////////////////////////// Stock holding logic //////////////////////////////////////
function addHoldListener() {
    const btn = document.getElementById("holdButton");
    if (!btn) return;

    document.addEventListener('click', async () => {
        if (selectedTicker) btn.hidden = false;
        if (username && selectedTicker) {
            btn.disabled = false;
            btn.style.cursor = "pointer";
            document.getElementById("holdButton").dataset.tooltip = "";

            const response = await fetch(`/holding?email=${username}&ticker=${selectedTicker}`, { method: 'GET' });
            const responseData = await response.json();
            if (responseData.exist) {
                btn.textContent = "Unhold";
            } else {
                btn.textContent = "Hold";
            }
       }
    });

    btn.addEventListener('click', async() => {
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
        await refreshMenu();
        handleStockSelection(selectedTickerFull);
    });
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

    form.reset();
    accessNumRow.style.display = "";
    form.querySelectorAll(".report-field-row").forEach(row => row.remove());
    error.textContent = "";
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
            }
        } else {
            popup.style.display = "none";
        }
    } else { // Insert user parsed report
        validateReportFields();

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
            popup.style.display = "none";
        } else {
            error.textContent = "Error inserting into database";
        }
    }
}

function renderManualReportFields() {
    const form = document.getElementById("insertReportForm");
    const error = document.getElementById("errorMessage");
    const fields = ["revenue", "income", "eps", "liabilities", "equity"];

    const unit = document.createElement("p");
    unit.innerText = "(In units of million, except eps)";
    form.insertBefore(unit, error);

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
        console.log(input.name);
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

// ---------------------------------------------------------------
// Initializes the webpage functionalities.
// Add or remove event listeners based on the desired functionalities.
window.onload = function() {
    // document.getElementById("initDB").addEventListener("click", initDB);
    populateMenu({preferredIndustry: "", display: false});
    addSearchBarListener();
    addSettingListener();
    addHoldListener();
    addInsertReportListener();
};
