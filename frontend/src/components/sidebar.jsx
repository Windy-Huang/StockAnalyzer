import { useEffect, useState } from 'react';
import { API_BASE } from '../App';

function Sidebar({ selectedTicker, onSelectStock, user }) {
    const [stocks, setStocks] = useState([]);
    const [popular, setPopular] = useState([]);
    const [leastPopular, setLeastPopular] = useState([]);

    useEffect(() => {
        async function fetchMenu() {
            try {
                const response = await fetch(`${API_BASE}/v1/recommendations?industry=${encodeURIComponent(user.industry)}`);
                const data = await response.json();
                setStocks(data.data);
                setPopular(data.popular.flat());
                setLeastPopular(data.leastPopular.flat());
            } catch (error) {
                console.error("Error fetching menu:", error);
            }
        }

        fetchMenu();
    }, [user, selectedTicker]);

    return (
        <div className="moemenu" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="menuHeader">Stock tickers</h2>
            <div id="stockMenu" style={{ flex: 1, overflowY: 'auto' }}>
                {stocks.map((stock) => {
                    const ticker = stock[0];

                    let classString = "stockButton";
                    if (user.recommendation && popular.includes(ticker)) {
                        classString += " popular";
                    } else if (user.recommendation && leastPopular.includes(ticker)) {
                        classString += " leastPopular";
                    }

                    return (
                        <button
                            key={ticker}
                            className={classString}
                            onClick={() => onSelectStock(stock)}
                            style={{ display: 'block', width: '100%' }}
                        >
                            {ticker}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default Sidebar;