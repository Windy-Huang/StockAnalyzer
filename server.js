const express = require('express');
const cors = require('cors');
const appController = require('./appController');

const loadEnvFile = require('./utils/envUtil');
const path = require('path');
const envVariables = loadEnvFile(path.resolve(__dirname, '.env'));

const app = express();
const PORT = envVariables.PORT || 65534;

// Middleware
app.use(cors());             // Allow requests from React Frontend
app.use(express.json());     // Parse JSON
app.get('/', (req, res) => {
    res.status(200).send("Node Backend is Running!");
});

// Mount the router (API routes)
app.use('/', appController);

// Start the server if node server.js is entered
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
}

// Export app to use in testing
module.exports = app;