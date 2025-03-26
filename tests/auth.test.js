const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');

describe('Authentication Endpoints', () => {
    // Use unique emails for each test run
    const testEmail = `test-${Date.now()}@example.com`;

    test('Should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/register')
            .send({
                email: testEmail, // Use unique email
                password: 'Password123',
                name: 'Test User'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', testEmail); // Check for dynamic email
        expect(res.body).toHaveProperty('name', 'Test User');
    });

    test('Should login a user', async () => {
        // First register a user with unique email
        const loginEmail = `login-${Date.now()}@example.com`;

        await request(app)
            .post('/api/v1/register')
            .send({
                email: loginEmail,
                password: 'Password123',
                name: 'Test User'
            });

        // Then login with that user
        const res = await request(app)
            .post('/api/v1/login')
            .send({
                email: loginEmail,
                password: 'Password123'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });
});