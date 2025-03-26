// database.js
const mongoose = require('mongoose');

let isConnected = false;

async function connectToDatabase(connectionString) {
    // Don't try to connect if we're already connected
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('Using existing database connection');
        return;
    }

    // If there's a pending connection to another database, disconnect first
    if (mongoose.connection.readyState !== 0) {
        console.log('Disconnecting existing connection before connecting to new database');
        await mongoose.disconnect();
    }

    try {
        await mongoose.connect(connectionString);
        isConnected = true;
        console.log('Connected to MongoDB:', connectionString.substring(0, 20) + '...');
    } catch (error) {
        console.error('MongoDB connection error:', error);

        // Don't exit the process during tests - just throw the error
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        } else {
            throw error; // Let Jest handle the error
        }
    }
}

// Add this function to help with test cleanup
async function disconnectFromDatabase() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        isConnected = false;
        console.log('Disconnected from MongoDB');
    }
}

module.exports = { connectToDatabase, disconnectFromDatabase };