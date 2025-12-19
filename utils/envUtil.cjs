const fs = require('fs');

function loadEnvFile(filePath) {
    if (fs.existsSync(filePath)) {
        const envFile = fs.readFileSync(filePath, 'utf8');

        const envVars = envFile.split('\n').reduce((acc, line) => {
            // Skip empty lines and comments
            if (!line.trim() || line.trim().startsWith('#')) {
                return acc;
            }

            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                // Trim whitespace from both key and value
                const trimmedKey = key.trim();
                const trimmedValue = valueParts.join('=').trim();
                acc[trimmedKey] = trimmedValue;
            }
            return acc;
        }, {});

        return envVars;
    } else {
        console.error(`.env file not found at ${filePath}`);
        return {};
    }
}

module.exports = loadEnvFile;