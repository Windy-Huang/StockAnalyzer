# Stock Price History Graph - Integration Guide

This document explains how the stock price history graph feature works and how to integrate it with the user login component.

## Overview

The stock price graph displays:
- **Default (No selection)**: Overlaid price history of all stocks the logged-in user holds
- **Stock Selected**: Price history of the selected stock only
- **No user logged in**: Empty graph with "Please login" message

## Files Modified

### Backend
- **appController.cjs**: Added 3 new API endpoints
  - `GET /user-held-stocks/:email` - Get stocks held by a user
  - `GET /price-history/:ticker` - Get price history for a stock
  - `GET /stocks` - Get all available stocks

- **appService.cjs**: Added 3 new database functions
  - `getUserHeldStocks(email)`
  - `getPriceHistory(ticker)`
  - `getAllStocks()`

### Frontend
- **contents.html**: Added canvas element for the chart
- **menu.html**: Dynamically loads stock list as buttons
- **scripts.js**: Added all graph logic and stock selection
- **styles.css**: Minimal styling for chart and selected state

## How It Works

### Stock List (Left Menu)
- On page load, `loadStockList()` fetches all stocks from `/stocks`
- Creates a button for each stock in the menu frame
- Clicking a stock button calls `selectStock(ticker)`
- Clicking again deselects and returns to portfolio view

### Graph Display
1. **No user logged in**: Shows "Please login to view your portfolio"
2. **User logged in**: Automatically shows all their held stocks overlaid
3. **Stock selected**: Shows only that stock's price history
4. **Stock deselected**: Returns to portfolio view (all held stocks)

## Integration with Login Component

Your login component needs to call these two functions when users log in/out:

```javascript
// When user logs in successfully
onUserLogin('user@example.com');

// When user logs out
onUserLogout();
```

### Example Integration

```javascript
// In your login function:
async function loginUser() {
    const email = // get email from input
    // ... your login logic ...

    if (loginSuccessful) {
        // Call this to initialize the portfolio graph
        if (typeof onUserLogin === 'function') {
            onUserLogin(email);
        }
    }
}

// In your logout function:
function logoutUser() {
    // ... your logout logic ...

    // Call this to clear the graph
    if (typeof onUserLogout === 'function') {
        onUserLogout();
    }
}
```

## API Endpoints

### Get User's Held Stocks
```http
GET /user-held-stocks/:email
```
**Response:**
```json
{
  "success": true,
  "data": [
    { "ticker": "AAPL", "name": "Apple Inc." },
    { "ticker": "MSFT", "name": "Microsoft Corporation" }
  ]
}
```

### Get Price History
```http
GET /price-history/:ticker
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-15T00:00:00.000Z",
      "open": 150.5,
      "high": 152.3,
      "low": 149.8,
      "close": 151.2,
      "volume": 50000000
    }
  ]
}
```

### Get All Stocks
```http
GET /stocks
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ",
      "industry": "Technology"
    }
  ]
}
```

## Testing

To test locally without login:
1. Open browser console
2. Call directly: `onUserLogin('test@example.com')`
3. The graph should load portfolio for that user
4. Click stocks in menu to test selection
5. Call `onUserLogout()` to reset

## Dependencies

- **Chart.js**: Loaded via CDN in contents.html
- Uses Chart.js time scale for date formatting
- No additional npm packages needed

## Notes

- Graph uses dark theme colors matching the existing UI
- Multiple stocks are shown with different colors
- Chart is responsive and adjusts to container size
- Error handling included for missing data
- Stock buttons highlight when selected
