const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // MongoDB Atlas connection - driver handles TLS automatically
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Connection pool settings
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4, skip trying IPv6
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Run integrity check after connection (non-blocking)
        setTimeout(async () => {
            try {
                const { runIntegrityCheck, verifyRestartSafety } = require('../utils/integrityChecker');
                await verifyRestartSafety();
                await runIntegrityCheck();
            } catch (err) {
                console.error('Integrity check error (non-fatal):', err.message);
            }
        }, 2000); // Wait 2 seconds for all models to load

    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }
        // Don't exit immediately - allow retry or manual handling
        console.error('Check: 1) IP whitelist on Atlas 2) Network connectivity 3) Credentials');
        process.exit(1);
    }
};

module.exports = connectDB;

