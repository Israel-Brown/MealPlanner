const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const jwt = require('jsonwebtoken');

describe('Meals API Endpoints', () => {
    let authToken;
    let mealId; // Store the meal ID globally for use in later tests
    let userId;

    // Setup - create a user and get auth token before tests
    beforeAll(async () => {
        // Register a test user
        const registerResponse = await request(app)
            .post('/api/v1/register')
            .send({
                email: `meal-test-${Date.now()}@example.com`,
                password: 'Password123',
                name: 'Test Meal User'
            });

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/v1/login')
            .send({
                email: registerResponse.body.email,
                password: 'Password123'
            });

        authToken = loginResponse.body.token;

        // Extract user ID from token
        const decodedToken = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secure-secret-key');
        userId = decodedToken.id;

        console.log('Test setup: Created user with ID', userId);
    });

    test('Should create a new meal', async () => {
        const res = await request(app)
            .post('/api/v1/meals')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Chicken Salad',
                ingredients: [
                    { name: 'chicken breast', quantity: 2 },
                    { name: 'lettuce', quantity: 1 },
                    { name: 'tomato', quantity: 2 }
                ],
                instructions: 'Mix all ingredients',
                mealType: 'lunch',
                calories: 350,
                macros: {
                    protein: 30,
                    carbs: 15,
                    fats: 10
                }
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('message', 'Meal added successfully');

        // Save the created meal ID for later tests
        mealId = res.body.meal._id;
        console.log('Created test meal with ID:', mealId);
    });

    test('Should get all meals for user', async () => {
        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 100));

        const res = await request(app)
            .get('/api/v1/meals')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('meals');
        expect(Array.isArray(res.body.meals)).toBe(true);
        expect(res.body.meals.length).toBeGreaterThan(0);
    });

    test('Should update a meal', async () => {
        // Verify mealId exists before testing
        if (!mealId) {
            console.error("Test error: mealId is undefined, cannot run update test");
            throw new Error("mealId is undefined");
        }

        console.log('Updating meal with ID:', mealId);

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
        // Verify mealId exists before testing
        if (!mealId) {
            console.error("Test error: mealId is undefined, cannot run delete test");
            throw new Error("mealId is undefined");
        }

        console.log('Deleting meal with ID:', mealId);

        const res = await request(app)
            .delete(`/api/v1/meals/${mealId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(204);

        // Verify it's deleted
        const checkRes = await request(app)
            .get('/api/v1/meals')
            .set('Authorization', `Bearer ${authToken}`);

        const deletedMeal = checkRes.body.meals.find(m => m.id === mealId);
        expect(deletedMeal).toBeUndefined();
    });
});