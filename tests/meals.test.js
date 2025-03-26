const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const jwt = require('jsonwebtoken');

describe('Meals API Endpoints', () => {
  let token;

  beforeAll(async () => {
    await request(app)
      .post('/api/v1/register')
      .send({
        email: 'test@example.com',
        password: 'Passw0rd!',
        name: 'Test User'
      });
    const res = await request(app)
      .post('/api/v1/login')
      .send({
        email: 'test@example.com',
        password: 'Passw0rd!'
      });
    token = res.body.token;
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  it('Should create a new meal', async () => {
    const res = await request(app)
      .post('/api/v1/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pancakes',
        ingredients: [{ name: 'Flour', quantity: 1 }],
        mealType: 'breakfast',
        calories: 300,
        macros: { protein: 10, carbs: 50, fats: 5 }
      })
      .expect(201);
    expect(res.body.name).toBe('Pancakes'); 
  });

  it('Should get all meals for user', async () => {
    await request(app)
      .post('/api/v1/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pancakes',
        ingredients: [{ name: 'Flour', quantity: 1 }],
        mealType: 'breakfast',
        calories: 300,
        macros: { protein: 10, carbs: 50, fats: 5 }
      });
    const res = await request(app)
      .get('/api/v1/meals')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.count).toBe(1);
  });

  it('Should update a meal', async () => {
    const createRes = await request(app)
      .post('/api/v1/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pancakes',
        ingredients: [{ name: 'Flour', quantity: 1 }],
        mealType: 'breakfast',
        calories: 300,
        macros: { protein: 10, carbs: 50, fats: 5 }
      });
    const mealId = createRes.body.id;
    const res = await request(app)
      .put(`/api/v1/meals/${mealId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Pancakes',
        ingredients: [{ name: 'Flour', quantity: 2 }],
        mealType: 'breakfast',
        calories: 350,
        macros: { protein: 12, carbs: 55, fats: 6 }
      })
      .expect(200);
    expect(res.body.name).toBe('Updated Pancakes'); 
  });

  it('Should delete a meal', async () => {
    const createRes = await request(app)
      .post('/api/v1/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pancakes',
        ingredients: [{ name: 'Flour', quantity: 1 }],
        mealType: 'breakfast',
        calories: 300,
        macros: { protein: 10, carbs: 50, fats: 5 }
      });
    const mealId = createRes.body.id; 
    await request(app)
      .delete(`/api/v1/meals/${mealId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});