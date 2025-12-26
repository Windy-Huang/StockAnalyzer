import {useEffect, useState} from "react";
import {API_BASE} from "../App.jsx";

function SearchBar({ onLoginClick, user, onSelect }) {
    const [attribute, setAttribute] = useState("ticker");
    const [input, setInput] = useState("");
    const [comparitor, setComparitor] = useState("");
    const [filterList, setFilterList] = useState("");
    const [results, setResults] = useState([]);

    useEffect(() => {
        function addToFilterList() {
            if (comparitor !== "") {
                setFilterList(filterList + attribute + " ILIKE '%" + input + "%' " + comparitor + " ");
                setInput("");
                setComparitor("");
            }
        }

        addToFilterList();
    }, [comparitor]);

    useEffect(() => {
        async function applyFilter() {
            if (input.length > 0) {
                const where = filterList + attribute + " ILIKE '%" + input + "%'";
                try {
                    const response = await fetch(`${API_BASE}/v1/stocks`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ where: where })
                    });
                    const data = await response.json();

                    if (response.ok) setResults(data.data);
                } catch (error) {
                    console.error("Error searching:", error);
                }
            }
        }

        applyFilter();
    }, [attribute, input]);

    const handleClear = () => {
        setAttribute("ticker");
        setInput("");
        setComparitor("");
        setFilterList("");
        setResults([]);
    };

    const handleSelect = (symbol) => {
        handleClear();
        onSelect(symbol);
    }

    const inputStyle = {
        padding: '8px 12px',
        borderRadius: '5px',
        border: '1px solid #404040',
        backgroundColor: '#2a2a2a',
        color: '#ffffff',
        fontSize: '14px',
        outline: 'none'
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div id="searchBar" style={{
                display: 'flex',
                gap: '10px',
                padding: '10px 20px',
                alignItems: 'center',
                backgroundColor: '#1C1C1C',
                width: '100%',
                boxSizing: 'border-box'
            }}>

                {/* Attributes */}
                <select
                    id="stockAttribute"
                    value={attribute}
                    style={inputStyle}
                    onChange={(e) => setAttribute(e.target.value)}
                >
                    <option value="ticker">Ticker</option>
                    <option value="name">Name</option>
                    <option value="country">Country</option>
                    <option value="industry">Industry</option>
                    <option value="exchange">Exchange</option>
                </select>

                {/* Input */}
                <input
                    type="text"
                    id="val"
                    placeholder="Enter filter..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={{
                        ...inputStyle,
                        minWidth: '750px'
                    }}
                />

                {/* Comparitor */}
                <select
                    id="comparitor"
                    value={comparitor}
                    onChange={(e) => setComparitor(e.target.value)}
                    disabled={input.length === 0}
                    style={{
                        ...inputStyle,
                        width: '70px',
                        backgroundColor: input.length === 0 ? '#555' : '#2a2a2a',
                        cursor: input.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: input.length === 0 ? 0.6 : 1
                    }}
                >
                    <option value="" disabled selected> </option>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </select>

                {/* Content dropdown */}
                {results.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '90%',
                        left: '160px',
                        width: '750px',
                        backgroundColor: '#000000',
                        zIndex: 50,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}>
                        {results.map((symbol) => (
                            <div
                                onClick={() => handleSelect(symbol)}
                                style={{
                                    padding: '10px',
                                    cursor: 'pointer',
                                    color: 'white',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#222'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                {symbol.join(', ')}
                            </div>
                        ))}
                    </div>
                )}

                {/* Clear Button */}
                <button
                    id="clearFilter"
                    onClick={handleClear}
                >
                    Clear
                </button>

                {/* Login */}
                <button
                    id="userSetting"
                    onClick={onLoginClick}
                    style={{width: '80px'}}
                >
                    {user.email ? user.email[0].toUpperCase() : "Login"}
                </button>
            </div>
        </div>
    );
}

export default SearchBar;