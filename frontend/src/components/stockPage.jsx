import { useState, useEffect } from "react";
import { API_BASE } from "../App";
import StockChart from "./stockChart";

const INITIAL_FIELDS = [
    { key: "timestamp", label: "Last updated: " },
    { key: "open_price", label: "Open price: $" },
    { key: "high_price", label: "High price: $" },
    { key: "low_price", label: "Low price: $" },
    { key: "close_price", label: "Close price: $" },
    { key: "volume", label: "Volume: " }
];

function StockPage({ selectedTicker, setSelectedTicker, user }) {
    const [activeFields, setActiveFields] = useState(INITIAL_FIELDS);
    const [fieldValues, setFieldValues] = useState({});
    const [chartData, setChartData] = useState(null);
    const [description, setDescription] = useState("");
    const [rating, setRating] = useState("");
    const [hold, setHold] = useState(false);
    const ticker = selectedTicker[0];

    useEffect(() => {
        setActiveFields(INITIAL_FIELDS);
        setFieldValues({});
        setChartData(null);
        setDescription("");

        const fetchData = async () => {
            // Fetch latest price history of stock
            try {
                const response = await fetch(`${API_BASE}/v1/stocks/${encodeURIComponent(ticker)}/price-histories`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields: INITIAL_FIELDS.map(f => f.key).join(", ") })
                });
                const data = await response.json();

                if (response.ok && data.data[0]) {
                    const valuesObj = {};
                    data.data[0].forEach((val, index) => {
                        const key = INITIAL_FIELDS[index].key;
                        valuesObj[key] = val;
                    });
                    setFieldValues(valuesObj);
                }
            } catch (err) { console.error(err); }

            // Fetch all price history of stock
            try {
                const res = await fetch(`${API_BASE}/v1/stocks/${encodeURIComponent(ticker)}/price-histories`);
                const json = await res.json();
                if (json.success && json.data) {
                    setChartData(json.data.map(point => ({
                        x: new Date(point.timestamp),
                        y: point.close_price
                    })));
                }
            } catch (err) { console.error(err); }

            // Fetch computed recommendation for stock
            try {
                const res = await fetch(`${API_BASE}/v1/recommendations/${encodeURIComponent(ticker)}`, { method: 'POST' });
                const json = await res.json();
                if (json.success) setRating(json.msg);
            } catch (err) { console.error(err); }

            // Check whether user hold this stock, check whether it is popular
            if (user.email) {
                try {
                    const result = await fetch(`${API_BASE}/v1/users/${encodeURIComponent(user.email)}/holdings/${encodeURIComponent(ticker)}`);
                    const json = await result.json();
                    setHold(json.exist);
                } catch (err) { console.error(err); }

                try {
                    const response = await fetch(`${API_BASE}/v1/recommendations?industry=${encodeURIComponent(user.industry)}`);
                    const data = await response.json();
                    if (data.popular.flat().includes(ticker)) {
                        setDescription("🔥 This stock is hold by all users of this application");
                    } else if (data.leastPopular.flat().includes(ticker)) {
                        setDescription("❄️ Within your preferred industry, this stock is hold by the least users");
                    }
                } catch (err) { console.error(err) }
            }
        };

        fetchData();
    }, [selectedTicker, user]);

    const handleRemoveRow = (key) => {
        setActiveFields(prev => prev.filter(field => field.key !== key));
    };

    const toggleHold = async () => {
        const url = `${API_BASE}/v1/users/${encodeURIComponent(user.email)}/holdings/${encodeURIComponent(ticker)}${!hold ? "?add=true" : ""}`;
        await fetch(url, { method: 'PUT' });
        setHold(!hold);
        setSelectedTicker("");
    };

    return (
        <div id="selectedStock">
            {user.email && (
                <div style={{ display: 'flex', justifyContent: 'center'}}>
                    <button
                        onClick={() => setSelectedTicker("")}
                        style={{ marginBottom: '15px' }}
                    >
                        Back to Portfolio
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, fontSize: '30px' }}>{selectedTicker[1]} ({ticker})</h2>
                {user.recommendation && (
                    <span style={{padding: '10px'}}>{description}</span>
                )}
            </div>

            <div style={{ marginBottom: '20px' }}>
                {activeFields.map((field) => (
                    <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1px 0' }}>
                        <span style={{ fontWeight: 'bold' }}>{field.label}</span>
                        <span>{fieldValues[field.key]}</span>
                        <div style={{ flex: 1 }}></div>
                        <button
                            onClick={() => handleRemoveRow(field.key)}
                            style={{ width: '25px', height: '25px', padding: 0, backgroundColor: '#444', color: 'white' }}
                        >
                            X
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
                {chartData ? (
                    <StockChart
                        datasets={[{
                            label: ticker,
                            data: chartData,
                            borderColor: '#FF6384',
                            backgroundColor: 'transparent',
                            tension: 0.1
                        }]}
                    />
                ) : (
                    <p>Loading Chart...</p>
                )}
            </div>

            <div>
                <div className="btnWrapper" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    Recommendation:<div>{rating}</div>
                    <button
                        id="holdButton"
                        onClick={toggleHold}
                        disabled={!user.email}
                        style={{ width: '100px', opacity: user.email ? 1 : 0.6, cursor: user.email ? 'pointer' : 'not-allowed' }}
                        data-tooltip={!user.email ? "Please login" : ""}
                    >
                        {hold ? "Unhold" : "Hold"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StockPage;