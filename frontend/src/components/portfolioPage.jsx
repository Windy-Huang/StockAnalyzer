import { useState, useEffect } from "react";
import { API_BASE } from "../App";
import StockChart from "./stockChart";

const CHART_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
];

function PortfolioPage({ user, selectedTicker }) {
    const [filter, setFilter] = useState("");
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        async function fetchHeldStocks() {
            if (selectedTicker || !user.email) return;

            try {
                let url = `${API_BASE}/v1/users/${encodeURIComponent(user.email)}/stocks`;
                if (filter) {
                    url = `${API_BASE}/v1/users/${encodeURIComponent(user.email)}/durations/${encodeURIComponent(filter)}`;
                }
                const response = await fetch(url);
                const data = await response.json();

                const promises = data.data.map(stock =>
                    fetch(`${API_BASE}/v1/stocks/${encodeURIComponent(stock.ticker)}/price-histories`)
                        .then(res => res.json())
                );
                const results = await Promise.all(promises);

                const datasets = [];
                results.forEach((result, index) => {
                    if (result.success && result.data.length > 0) {
                        const stockTicker = data.data[index].ticker;
                        datasets.push({
                            label: stockTicker,
                            data: result.data.map(point => ({
                                x: new Date(point.timestamp),
                                y: point.close_price
                            })),
                            borderColor: CHART_COLORS[index % CHART_COLORS.length],
                            backgroundColor: 'transparent',
                            tension: 0.1
                        });
                    }
                });
                setChartData(datasets);
            } catch (error) {
                console.error("Error fetching portfolio data:", error);
            }
        }

        fetchHeldStocks();
    }, [filter, selectedTicker, user]);

    return (
        <div id="portfolioPage" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                <h3>Portfolio Price History</h3>
                <div id="holdingDurationFilter" style={{ marginBottom: '20px' }}>
                    <label htmlFor="durationSelect" style={{ marginRight: '10px' }}>
                        Filter by holding duration:
                    </label>
                    <select
                        id="durationSelect"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ padding: '5px 10px' }}
                    >
                        <option value="">All holdings (no filter)</option>
                        <option value="day">Held at least 1 day</option>
                        <option value="week">Held at least 1 week</option>
                        <option value="month">Held at least 1 month</option>
                        <option value="year">Held at least 1 year</option>
                    </select>
                </div>

                {!user.email && (
                    <p style={{ textAlign: 'center', marginTop: '10px' }}>
                        Please login to view your portfolio
                    </p>
                )}
            </div>

            <div style={{ width: '100%', marginBottom: '20px' }}>
                {user.email && chartData && chartData.length > 0 ? (
                    <StockChart
                        datasets={chartData}
                    />
                ) : user.email && chartData ? (
                    <p style={{ textAlign: 'center' }}>You do not hold any stocks matching this filter.</p>
                ) : user.email ? (
                    <p style={{ textAlign: 'center' }}>Loading...</p>
                ) : null}
            </div>
        </div>
    );
}

export default PortfolioPage;