import { useState } from 'react';
import './App.css';
import Sidebar from './components/sidebar';
import Dashboard from './components/dashboard';

export const API_BASE = import.meta.env.VITE_API_URL || "";

function App() {
    const [selectedTicker, setSelectedTicker] = useState("");
    const [user, setUser] = useState({email: "", industry: "", exchange: "", recommendation: false});

    return (
        <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <div className="sidebar-container" style={{ width: '300px', borderRight: '1px solid #444' }}>
                <Sidebar
                    selectedTicker={selectedTicker}
                    onSelectStock={setSelectedTicker}
                    user={user}
                />
            </div>

            <main className="main-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <Dashboard
                    selectedTicker={selectedTicker}
                    setSelectedTicker={setSelectedTicker}
                    user={user}
                    onLogin={setUser}
                />
            </main>
        </div>
    );
}

export default App;
