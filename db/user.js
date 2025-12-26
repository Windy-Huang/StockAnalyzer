// Endpoints associated with user settings

const db = require('./db');

async function fetchUser(email) {
    try {
        const result = await db.query(`SELECT * FROM Users WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            await db.query(`INSERT INTO Users VALUES ($1, NULL, NULL, 0)`, [email]);
            return [[email, "", "", ""]];
        }
        return result.rows.map(r => [r.email, r.preferred_industry, r.preferred_exchange, r.show_recommendation]);
    } catch (err) {
        return [];
    }
}

async function updateUser(email, industry, exchange, rec) {
    try {
        const result = await db.query(`
            UPDATE Users 
            SET preferred_industry = $2, preferred_exchange = $3, show_recommendation = $4
            WHERE email = $1`,
            [email, industry || null, exchange || null, rec]
        );
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function delUser(email) {
    try {
        const result = await db.query(`DELETE FROM Users WHERE email = $1`, [email]);
        return result.rowCount > 0;
    } catch (err) {
        return false;
    }
}

async function fetchSettingDropdown(type) {
    try {
        const col = type === 'industry' ? 'industry' : 'exchange';
        const result = await db.query(`SELECT ${col}, COUNT(*) FROM Stock GROUP BY ${col}`);
        return result.rows.map(row => [row[col], parseInt(row.count)]);
    } catch (err) {
        return [];
    }
}

module.exports = {
    fetchUser,
    updateUser,
    delUser,
    fetchSettingDropdown
};