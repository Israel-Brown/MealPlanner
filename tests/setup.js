const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let mongoServer;

// Setup before tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Cleanup after tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Clear collections between tests
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Helper to generate test tokens
const generateTestToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secure-secret-key', {
        expiresIn: '1h'
    });
};

module.exports = { generateTestToken };