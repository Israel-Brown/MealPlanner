const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index'); // Make sure your index.js exports the app

describe('Authentication Endpoints', () => {
    test('Should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/register')
            .send({
                email: 'test@example.com',
                password: 'Password123',
                name: 'Test User'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', 'test@example.com');
        expect(res.body).toHaveProperty('name', 'Test User');
    });

    test('Should login a user', async () => {
        // First register a user
        await request(app)
            .post('/api/v1/register')
            .send({
                email: 'test@example.com',
                password: 'Password123',
                name: 'Test User'
            });

        // Then attempt to login
        const res = await request(app)
            .post('/api/v1/login')
            .send({
                email: 'test@example.com',
                password: 'Password123'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });
});