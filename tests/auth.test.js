const request = require('supertest');
const mongoose = require('mongoose'); 
const app = require('../index');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  it('Should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/register')
      .send({
        email: 'test@example.com',
        password: 'Passw0rd!',
        name: 'Test User'
      })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe('test@example.com');
  });

  it('Should login a user', async () => {
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
      })
      .expect(200);
    expect(res.body).toHaveProperty('token');
  });
});