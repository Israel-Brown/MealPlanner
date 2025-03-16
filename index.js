const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');

const app = express();
const port = 3000;
const JWT_SECRET = 'your-secure-secret-key'; 

app.use(express.json());
app.use(expressJwt({ secret: JWT_SECRET, algorithms: ['HS256'] }).unless({ path: ['/api/v1/register', '/api/v1/login', '/', /^\/api-docs\/?.*/] }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const mongoURI = 'mongodb+srv://Jason:341@cluster0.8elw1gh.mongodb.net/';
mongoose.connect(mongoURI, {
})
  .then(() => console.log('Connected to MongoDB Atlas: mealPlannerPlus'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const groceryListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 }
  }]
});
const GroceryList = mongoose.model('GroceryList', groceryListSchema);

app.post('/api/v1/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ code: 400, message: 'Email, password, and name are required' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ code: 400, message: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, name });
    await newUser.save();
    res.status(201).json({ id: newUser._id, email: newUser.email, name: newUser.name });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.post('/api/v1/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ code: 400, message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ code: 401, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.get('/api/v1/grocery-list', async (req, res) => {
  try {
    let groceryList = await GroceryList.findOne({ userId: req.auth.id });
    if (!groceryList) {
      groceryList = new GroceryList({ userId: req.auth.id, items: [] });
      await groceryList.save();
    }
    res.status(200).json({
      userId: groceryList.userId,
      items: groceryList.items.map(item => ({ id: item._id, name: item.name, quantity: item.quantity }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.post('/api/v1/grocery-list', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ code: 400, message: 'Items array is required and must not be empty' });
  }
  try {
    let groceryList = await GroceryList.findOne({ userId: req.auth.id });
    if (!groceryList) {
      groceryList = new GroceryList({ userId: req.auth.id, items: [] });
    }
    groceryList.items.push(...items.map(item => ({ name: item.name, quantity: item.quantity || 1 })));
    await groceryList.save();
    res.status(201).json({
      userId: groceryList.userId,
      items: groceryList.items.map(item => ({ id: item._id, name: item.name, quantity: item.quantity }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.put('/api/v1/grocery-list', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ code: 400, message: 'Items array is required' });
  }
  try {
    let groceryList = await GroceryList.findOne({ userId: req.auth.id });
    if (!groceryList) {
      groceryList = new GroceryList({ userId: req.auth.id, items: [] });
    }
    groceryList.items = items.map(item => ({
      _id: item.id || new mongoose.Types.ObjectId(),
      name: item.name,
      quantity: item.quantity || 1
    }));
    await groceryList.save();
    res.status(200).json({
      userId: groceryList.userId,
      items: groceryList.items.map(item => ({ id: item._id, name: item.name, quantity: item.quantity }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.delete('/api/v1/grocery-list', async (req, res) => {
  const { itemId } = req.query;
  if (!itemId) {
    return res.status(400).json({ code: 400, message: 'Item ID is required' });
  }
  try {
    const groceryList = await GroceryList.findOne({ userId: req.auth.id });
    if (!groceryList) {
      return res.status(404).json({ code: 404, message: 'Grocery list not found' });
    }
    const initialLength = groceryList.items.length;
    groceryList.items = groceryList.items.filter(item => item._id.toString() !== itemId);
    if (groceryList.items.length === initialLength) {
      return res.status(404).json({ code: 404, message: 'Item not found in grocery list' });
    }
    await groceryList.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

const mealSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  ingredients: [{ type: String, required: true }],
  date: { type: Date, default: Date.now }
});
const Meal = mongoose.model('Meal', mealSchema, 'meals');

app.get('/api/v1/meals', async (req, res) => {
  try {
    const meals = await Meal.find({ userId: req.auth.id });
    res.status(200).json(meals);
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.post('/api/v1/meals', async (req, res) => {
  const { name, calories, ingredients } = req.body;
  if (!name || !calories || !ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ code: 400, message: 'Name, calories, and ingredients (array) are required' });
  }
  try {
    const newMeal = new Meal({
      userId: req.auth.id,
      name,
      calories,
      ingredients
    });
    await newMeal.save();
    res.status(201).json(newMeal);
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.put('/api/v1/meals/:id', async (req, res) => {
  const { id } = req.params;
  const { name, calories, ingredients } = req.body;
  try {
    const updatedMeal = await Meal.findByIdAndUpdate(
      id,
      { name, calories, ingredients },
      { new: true }
    );
    if (!updatedMeal) {
      return res.status(404).json({ code: 404, message: 'Meal not found' });
    }
    res.status(200).json(updatedMeal);
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.delete('/api/v1/meals/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMeal = await Meal.findByIdAndDelete(id);
    if (!deletedMeal) {
      return res.status(404).json({ code: 404, message: 'Meal not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to Grocery List API! Visit /api-docs for documentation.');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});