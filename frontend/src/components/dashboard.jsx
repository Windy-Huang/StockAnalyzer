import { useState } from "react";
import SearchBar from "./searchBar";
import Login from "./loginPopup";
import StockPage from "./stockPage";
import PortfolioPage from "./portfolioPage";

function Dashboard({ selectedTicker, setSelectedTicker, user, onLogin }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="moecontents">
            <SearchBar
                user={user}
                onLoginClick={() => setIsLoginOpen(true)}
                onSelect={setSelectedTicker}
            />

            <Login
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onLogin={onLogin}
                user={user}
                setSelectedTicker={setSelectedTicker}
            />

            <div style={{ padding: '15px' }}>
                {selectedTicker ? (
                    <div>
                        <StockPage
                            selectedTicker={selectedTicker}
                            setSelectedTicker={setSelectedTicker}
                            user={user}
                        />
                    </div>
                ) : (
                    <div>
                        <PortfolioPage
                            selectedTicker={selectedTicker}
                            user={user}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;