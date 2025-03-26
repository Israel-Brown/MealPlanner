const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../index'); // Adjust the path to your app
const { connectToDatabase, disconnectFromDatabase } = require('../database');

let mongoServer;

// Setup before tests
beforeAll(async () => {
    // Ensure process.env.NODE_ENV is set to 'test'
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await connectToDatabase(mongoUri);
});

// Cleanup after tests
afterAll(async () => {
    await disconnectFromDatabase();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Clear collections between tests
afterEach(async () => {
    if (mongoose.connection.db) {
        // Ensure this is actually running
        console.log('Clearing database collections');
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
});

// Helper to generate test tokens
const generateTestToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secure-secret-key', {
        expiresIn: '1h'
    });
};

describe('Authentication Endpoints', () => {
    // Create a unique email for each test run to prevent conflicts
    const testEmail = `test-${Date.now()}@example.com`;

    test('Should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/register')
            .send({
                email: testEmail,
                password: 'Password123',
                name: 'Test User'
            });

        console.log('Register response:', res.body); // Add debugging
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
    });

    test('Should login a user', async () => {
        // Use a unique email for this test too
        const loginEmail = `login-${Date.now()}@example.com`;

        // First register a user
        const registerRes = await request(app)
            .post('/api/v1/register')
            .send({
                email: loginEmail,
                password: 'Password123',
                name: 'Test User'
            });

        console.log('Register response for login test:', registerRes.body);

        // Then attempt to login
        const loginRes = await request(app)
            .post('/api/v1/login')
            .send({
                email: loginEmail,
                password: 'Password123'
            });

        console.log('Login response:', loginRes.body);
        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body).toHaveProperty('token');
    });
});

module.exports = { generateTestToken };