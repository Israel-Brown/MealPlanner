const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const path = require('path');
const { connectToDatabase } = require('./database');

const app = express();
const port = 3000;

// Check and update your JWT_SECRET value
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-secret-key';

// Make sure you're using environment variables in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT secret in production!');
}

app.use(express.json());
app.use(express.static('public'));

// Enhance your debugging middleware
app.use((req, res, next) => {
  console.log(`Request to ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.headers.authorization) {
    console.log('Auth header present:', req.headers.authorization.substring(0, 20) + '...');
  } else {
    console.log('NO Auth header found');
  }
  next();
});

// Update your JWT middleware to exclude all HTML pages
app.use(expressJwt({ secret: JWT_SECRET, algorithms: ['HS256'] }).unless({
  path: [
    '/api/v1/register',
    '/api/v1/login',
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/meals.html',  // Add this
    '/grocery-list.html',  // Add this
    '/pantry.html',  // Add this
    '/test-auth.html',  // Add this
    '/css/style.css',
    '/css/navigation.css',
    '/css/auth.css',
    '/js/navigation.js',
    '/js/auth.js',
    '/js/login.js',
    '/js/register.js',
    '/js/api.js',
    /^\/api-docs\/?.*/,
    /^\/css\/.*/,
    /^\/js\/.*/,
    /^\/images\/.*/,
    /\.html$/  // Add this to match all HTML files
  ]
}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const mongoURI = 'mongodb+srv://Jason:341@cluster0.8elw1gh.mongodb.net/MealPlannerPlus';
mongoose.connect(mongoURI, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB Atlas: mealPlannerPlus'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true, // This will automatically convert email to lowercase
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
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

const pantryListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 }
  }]
});
const PantryList = mongoose.model('PantryList', pantryListSchema);

app.post('/api/v1/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ code: 400, message: 'Email, password, and name are required' });
  }
  try {
    // Convert to lowercase when checking for existing users
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ code: 400, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // The email will automatically be saved as lowercase due to schema setting
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
    // Convert to lowercase when finding user
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
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

app.get('/api/v1/pantry-list', async (req, res) => {
  try {
    let userPantryList = await PantryList.findOne({ userId: req.auth.id });
    if (!userPantryList) {
      userPantryList = new PantryList({ userId: req.auth.id, items: [] });
      await userPantryList.save();
    }
    res.status(200).json({
      userId: userPantryList.userId,
      items: userPantryList.items.map(item => ({ id: item._id, name: item.name, quantity: item.quantity }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.post('/api/v1/pantry-list', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ code: 400, message: 'Items array is required and must not be empty' });
  }
  try {
    let userPantryList = await PantryList.findOne({ userId: req.auth.id });
    if (!userPantryList) {
      userPantryList = new PantryList({ userId: req.auth.id, items: [] });
    }
    userPantryList.items.push(...items.map(item => ({ name: item.name, quantity: item.quantity || 1 })));
    await userPantryList.save();
    res.status(201).json({
      userId: userPantryList.userId,
      items: userPantryList.items.map(item => ({ id: item._id, name: item.name, quantity: item.quantity }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.put('/api/v1/pantry-list', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ code: 400, message: 'Items array is required' });
  }
  try {
    let userPantryList = await PantryList.findOne({ userId: req.auth.id });
    if (!userPantryList) {
      userPantryList = new PantryList({ userId: req.auth.id, items: [] });
    }
    userPantryList.items = items.map(item => ({
      _id: item.id || new mongoose.Types.ObjectId(),
      name: item.name,
      quantity: item.quantity || 1
    }));
    await userPantryList.save();
    res.status(200).json({
      userId: userPantryList.userId,
      items: userPantryList.items.map(item => ({ id: item._id, name: item.name, quantity: item.quantity }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

app.delete('/api/v1/pantry-list', async (req, res) => {
  const { itemId } = req.query;
  if (!itemId) {
    return res.status(400).json({ code: 400, message: 'Item ID is required' });
  }
  try {
    const userPantryList = await PantryList.findOne({ userId: req.auth.id });
    if (!userPantryList) {
      return res.status(404).json({ code: 404, message: 'Pantry list not found' });
    }
    const initialLength = userPantryList.items.length;
    userPantryList.items = userPantryList.items.filter(item => item._id.toString() !== itemId);
    if (userPantryList.items.length === initialLength) {
      return res.status(404).json({ code: 404, message: 'Item not found in Pantry list' });
    }
    await userPantryList.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

// Meal Schema
const mealSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  ingredients: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  instructions: { type: String },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
  calories: { type: Number, required: true }, // Added calories
  macros: {
    protein: { type: Number, required: true },  // Protein
    carbs: { type: Number, required: true },    // Carbs
    fats: { type: Number, required: true }      // Fats
  },
  dateCreated: { type: Date, default: Date.now }
});

const Meal = mongoose.model('Meal', mealSchema);

// POST - Add Meal
app.post('/api/v1/meals', async (req, res) => {
  const { name, ingredients, instructions, mealType, calories, macros } = req.body;

  // Ensure all required fields are provided
  if (!name || !ingredients || !mealType || !calories || !macros || ingredients.length === 0) {
    return res.status(400).json({ code: 400, message: 'Meal name, ingredients, meal type, calories, and macros are required' });
  }

  if (macros && (typeof macros.protein !== 'number' || typeof macros.carbs !== 'number' || typeof macros.fats !== 'number')) {
    return res.status(400).json({ code: 400, message: 'Macros must contain valid numbers for protein, carbs, and fats' });
  }

  try {
    const meal = new Meal({
      userId: req.auth.id,  // Assuming JWT gives user ID
      name,
      ingredients,
      instructions,
      mealType,
      calories,
      macros
    });

    await meal.save();
    res.status(201).json({ message: 'Meal added successfully', meal });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

// GET - Get all user's meals
app.get('/api/v1/meals', async (req, res) => {
  try {
    const userId = req.auth ? req.auth.id : null;

    if (!userId) {
      return res.status(401).json({ code: 401, message: 'Unauthorized - Missing or invalid token' });
    }

    // Then use the userId safely
    const meals = await Meal.find({ userId });

    res.status(200).json({
      count: meals.length,
      meals: meals.map(meal => ({
        id: meal._id,
        name: meal.name,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        mealType: meal.mealType,
        calories: meal.calories,
        macros: meal.macros,
        dateCreated: meal.dateCreated
      }))
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

// PUT - Update Meal
app.put('/api/v1/meals/:mealId', async (req, res) => {
  const { mealId } = req.params;
  const { name, ingredients, instructions, mealType, calories, macros } = req.body;

  // Validate required fields
  if (!name || !ingredients || !mealType || !calories || !macros || ingredients.length === 0) {
    return res.status(400).json({ code: 400, message: 'Meal name, ingredients, meal type, calories, and macros are required' });
  }

  if (macros && (typeof macros.protein !== 'number' || typeof macros.carbs !== 'number' || typeof macros.fats !== 'number')) {
    return res.status(400).json({ code: 400, message: 'Macros must contain valid numbers for protein, carbs, and fats' });
  }

  try {
    const meal = await Meal.findOneAndUpdate(
      { _id: mealId, userId: req.auth.id },
      { name, ingredients, instructions, mealType, calories, macros },
      { new: true }
    );

    if (!meal) {
      return res.status(404).json({ code: 404, message: 'Meal not found' });
    }

    res.status(200).json({ message: 'Meal updated successfully', meal });
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

// DELETE - Delete Meal
app.delete('/api/v1/meals/:mealId', async (req, res) => {
  const { mealId } = req.params;
  try {
    const meal = await Meal.findOneAndDelete({ _id: mealId, userId: req.auth.id });

    if (!meal) {
      return res.status(404).json({ code: 404, message: 'Meal not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ code: 500, message: 'Server error: ' + error.message });
  }
});

// Optional: Redirect root to the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only connect to the database and start the server if this is not being run in a test
if (process.env.NODE_ENV !== 'test') {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mealPlannerPlus';
  connectToDatabase(MONGODB_URI).then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  });
}

// Export the app for testing
module.exports = app;