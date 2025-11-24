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

async function insertTest(event) {
    event.preventDefault();

    const accessNum = document.getElementById('insertName').value;
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
    const messageElement = document.getElementById('insertResultMsg');

    if (!response.ok) {
        if (response.status === 404) {
            messageElement.textContent = "invalid accessNUM";
        } else if (response.status === 422) {
            messageElement.textContent = "cannot parse, help me";
            console.log(responseData.report);
        } else {
            messageElement.textContent = "Error inserting data!";
        }
    } else {
        messageElement.textContent = "Data inserted successfully!";
    }
}

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

function addHoldListener() {
    const btn = document.getElementById("holdButton");
    if (!btn) return;

    document.addEventListener('click', async () => {
        if (selectedTicker) btn.hidden = false;
        if (username && selectedTicker) {
            btn.disabled = false;
            btn.style.cursor = "pointer";
            document.querySelector(".holdWrapper").dataset.tooltip = "";

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

// ---------------------------------------------------------------
// Initializes the webpage functionalities.
// Add or remove event listeners based on the desired functionalities.
window.onload = function() {
    // document.getElementById("initDB").addEventListener("click", initDB);
    populateMenu({preferredIndustry: "", display: false});
    addSearchBarListener();
    addSettingListener();
    addHoldListener();
};

// General function to refresh the displayed table data. 
// You can invoke this after any table-modifying operation to keep consistency.
function fetchTableData() {
    fetchAndDisplayUsers();
}
