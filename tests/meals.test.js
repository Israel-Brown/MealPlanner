const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const jwt = require('jsonwebtoken');

describe('Meals API Endpoints', () => {
    let authToken;
    let userId;
    let mealId;

    // Setup - create a test user and get token
    beforeAll(async () => {
        // Register a test user
        const registerRes = await request(app)
            .post('/api/v1/register')
            .send({
                email: 'meal-test@example.com',
                password: 'Password123',
                name: 'Meal Test User'
            });

        userId = registerRes.body.id;

        // Login to get token
        const loginRes = await request(app)
            .post('/api/v1/login')
            .send({
                email: 'meal-test@example.com',
                password: 'Password123'
            });

        authToken = loginRes.body.token;
    });

    test('Should create a new meal', async () => {
        const res = await request(app)
            .post('/api/v1/meals')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Test Chicken Salad',
                ingredients: [
                    { name: 'chicken breast', quantity: 1 },
                    { name: 'lettuce', quantity: 2 }
                ],
                instructions: 'Mix everything together',
                mealType: 'lunch',
                calories: 350,
                macros: {
                    protein: 30,
                    carbs: 15,
                    fats: 12
                }
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('message', 'Meal added successfully');
        expect(res.body).toHaveProperty('meal');
        expect(res.body.meal).toHaveProperty('name', 'Test Chicken Salad');

        // Save meal ID for later tests
        mealId = res.body.meal.id;
    });

    test('Should get all meals for user', async () => {
        const res = await request(app)
            .get('/api/v1/meals')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('count');
        expect(res.body).toHaveProperty('meals');
        expect(Array.isArray(res.body.meals)).toBe(true);
        expect(res.body.meals.length).toBeGreaterThan(0);
    });

    test('Should update a meal', async () => {
        const res = await request(app)
            .put(`/api/v1/meals/${mealId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Chicken Salad',
                ingredients: [
                    { name: 'chicken breast', quantity: 2 },
                    { name: 'lettuce', quantity: 1 }
                ],
                instructions: 'Updated instructions',
                mealType: 'dinner',
                calories: 450,
                macros: {
                    protein: 40,
                    carbs: 20,
                    fats: 15
                }
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'Meal updated successfully');
        expect(res.body.meal).toHaveProperty('name', 'Updated Chicken Salad');
    });

    test('Should delete a meal', async () => {
        const res = await request(app)
            .delete(`/api/v1/meals/${mealId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(204);

        // Verify it's deleted
        const checkRes = await request(app)
            .get('/api/v1/meals')
            .set('Authorization', `Bearer ${authToken}`);

        const mealExists = checkRes.body.meals.some(meal => meal.id === mealId);
        expect(mealExists).toBe(false);
    });
});