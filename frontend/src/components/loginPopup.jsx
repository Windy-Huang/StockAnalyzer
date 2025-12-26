import { useState, useEffect } from "react";
import { API_BASE } from "../App";

function Login({ isOpen, onClose, onLogin, user, setSelectedTicker }) {
    const [email, setEmail] = useState("");
    const [industry, setIndustry] = useState("");
    const [exchange, setExchange] = useState("");
    const [recommendation, setRecommendation] = useState(false);
    const [industryOptions, setIndustryOptions] = useState([]);
    const [exchangeOptions, setExchangeOptions] = useState([]);
    const [message, setMessage] = useState("");

    // Reset state of popup when it opens
    useEffect(() => {
        setEmail(user.email);
        setIndustry(user.industry);
        setExchange(user.exchange);
        setRecommendation(user.recommendation);
        setMessage("");
    }, [isOpen]);
    if (!isOpen) return null;

    // Dynamically load the dropdown menu and its label
    const fetchDropdownOptions = async () => {
        try {
            const response = await fetch(`${API_BASE}/v1/settings`);
            const data = await response.json();
            if (response.ok) {
                setIndustryOptions(data.industry || []);
                setExchangeOptions(data.exchange || []);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const getCount = (options, selectedValue) => {
        const found = options.find(item => item[0] === selectedValue);
        return found ? `${found[1]} tickers` : "";
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            if (email.length < 7 || !email.includes('@') || email.includes(' ')) {
                throw new Error("Invalid email format");
            }

            const response = await fetch(`${API_BASE}/v1/users/${encodeURIComponent(email)}`, { method: 'POST' });
            const data = await response.json();

            if (response.ok && data.data.length === 1) {
                const userData = data.data[0];
                onLogin({
                    email: userData[0],
                    industry: userData[1],
                    exchange: userData[2],
                    recommendation: userData[3] === 1
                });
                onClose();
                setSelectedTicker("");
                await fetchDropdownOptions();
            }
        } catch (err) {
            setMessage(err.message);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE}/v1/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    industry: industry,
                    exchange: exchange,
                    rec: recommendation ? 1 : 0,
                })
            });
            const data = await response.json();

            if (data.success) {
                setMessage("Update successful!");
                setTimeout(() => {
                    onClose();
                    onLogin({ email: email, industry: industry, exchange: exchange, recommendation: recommendation });
                }, 1500);
            }
        } catch (err) {
            setMessage(err.message);
        }
    };

    const handleDelete = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE}/v1/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
            const data = await response.json();

            if (response.ok && data.success) {
                setMessage("Successfully deleted!");
                setTimeout(() => {
                    onClose();
                    onLogin({ email: "", industry: "", exchange: "", recommendation: false });
                    setSelectedTicker("");
                }, 1500);
            }
        } catch (err) {
            setMessage(err.message);
        }
    }

    return (
        <div className="popup" style={{ position: 'fixed', top: '8%', right: '0%', zIndex: 1000, display: 'block' }}>
            {!user.email && (<form>
                <div className="form-row">
                    <h2>User Settings</h2>
                </div>
                <div className="form-row">
                    <label>Email</label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div>{message}</div>
                <div className="button-row">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit" onClick={handleLogin}>Submit</button>
                </div>
            </form>)}

            {user.email && (<form>
                <div className="form-row">
                    <h2>User Settings</h2>
                </div>
                <div className="form-row" style={{ display: 'flex', marginBottom: '10px', alignItems: 'center' }}>
                    <label htmlFor="settingIndustry">Preferred Industry</label>
                    <div style={{ flex: 1 }}>
                        <select
                            id="settingIndustry"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                        >
                            <option value=""> </option>
                            {industryOptions.map(([name, count]) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <span style={{ marginLeft: '10px' }}>
                        {getCount(industryOptions, industry)}
                    </span>
                </div>

                <div className="form-row" style={{ display: 'flex', marginBottom: '10px', alignItems: 'center' }}>
                    <label htmlFor="settingExchange">Preferred Exchange</label>
                    <div style={{ flex: 1 }}>
                        <select
                            id="settingExchange"
                            value={exchange}
                            onChange={(e) => setExchange(e.target.value)}
                        >
                            <option value=""> </option>
                            {exchangeOptions.map(([name, count]) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <span style={{ marginLeft: '10px'}}>
                        {getCount(exchangeOptions, exchange)}
                    </span>
                </div>

                <div className="form-row" style={{ display: 'flex', marginBottom: '10px' }}>
                    <label htmlFor="settingRec">Show recommendations</label>
                    <input
                        type="checkbox"
                        id="settingRec"
                        checked={recommendation}
                        onChange={(e) => setRecommendation(e.target.checked)}
                    />
                </div>
                <div>{message}</div>
                <div className="button-row">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit" onClick={handleUpdate}>Update</button>
                    <button type="delete" onClick={handleDelete}>Delete</button>
                </div>
            </form>)}
        </div>
    );
}

export default Login;