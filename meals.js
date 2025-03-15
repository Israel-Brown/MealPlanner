// /routes/meals.js - CRUD operations for meals

import express from 'express';
import mongoose from 'mongoose';
import { expressjwt } from 'express-jwt';

const router = express.Router();

// Middleware to authenticate JWT
const authenticate = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});

// Meal Schema
const mealSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  macros: {
    protein: Number,
    carbs: Number,
    fats: Number
  }
});

const Meal = mongoose.model('Meal', mealSchema);

// Create a new meal
router.post('/', authenticate, async (req, res) => {
  try {
    const meal = new Meal({ ...req.body, userId: req.auth.id });
    await meal.save();
    res.status(201).json(meal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all meals for a user
router.get('/', authenticate, async (req, res) => {
  try {
    const meals = await Meal.find({ userId: req.auth.id });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a meal
router.put('/:id', authenticate, async (req, res) => {
  try {
    const meal = await Meal.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.id },
      req.body,
      { new: true }
    );
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json(meal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a meal
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({ _id: req.params.id, userId: req.auth.id });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
