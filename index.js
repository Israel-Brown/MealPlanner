require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');  // For password hashing
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Environment variables
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_ISSUER = process.env.AUTH0_ISSUER;

// ✅ Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Auth0 Middleware
const checkJwt = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: AUTH0_ISSUER,
});

// ✅ Models
const GroceryList = mongoose.model('GroceryList', new mongoose.Schema({
  userId: String,
  items: [{ name: String, quantity: Number }]
}));

const PantryList = mongoose.model('PantryList', new mongoose.Schema({
  userId: String,
  items: [{ name: String, quantity: Number }]
}));

const Meal = mongoose.model('Meal', new mongoose.Schema({
  userId: String,
  name: String,
  description: String,
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number
  }
}));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}));

// ✅ Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).send('Access denied. No token provided.');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
}

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.send('MealPlannerPlus Backend is running smoothly.');
});

// ✅ Register Route
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const newUser = new User({
    email,
    password: hashedPassword
  });

  // Save user to the database
  await newUser.save();
  res.status(201).send('User registered successfully');
});

// ✅ Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('Invalid email or password');
  }

  // Compare password with hashed password in the database
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).send('Invalid email or password');
  }

  // Generate JWT token
  const token = jwt.sign(
    { sub: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.send({ token });
});

// ✅ Grocery List Routes
app.get('/grocery-lists', checkJwt, async (req, res) => {
  const lists = await GroceryList.find({ userId: req.user.sub });
  res.send(lists);
});

app.post('/grocery-lists', checkJwt, async (req, res) => {
  const newList = new GroceryList({
    userId: req.user.sub,
    items: req.body.items
  });
  await newList.save();
  res.status(201).send(newList);
});

app.put('/grocery-lists/:id', checkJwt, async (req, res) => {
  const updatedList = await GroceryList.findByIdAndUpdate(
    req.params.id,
    { items: req.body.items },
    { new: true }
  );
  res.send(updatedList);
});

app.delete('/grocery-lists/:id', checkJwt, async (req, res) => {
  await GroceryList.findByIdAndDelete(req.params.id);
  res.send('Grocery List deleted successfully.');
});

// ✅ Pantry List Routes
app.get('/pantry-lists', checkJwt, async (req, res) => {
  const lists = await PantryList.find({ userId: req.user.sub });
  res.send(lists);
});

app.post('/pantry-lists', checkJwt, async (req, res) => {
  const newList = new PantryList({
    userId: req.user.sub,
    items: req.body.items
  });
  await newList.save();
  res.status(201).send(newList);
});

app.put('/pantry-lists/:id', checkJwt, async (req, res) => {
  const updatedList = await PantryList.findByIdAndUpdate(
    req.params.id,
    { items: req.body.items },
    { new: true }
  );
  res.send(updatedList);
});

app.delete('/pantry-lists/:id', checkJwt, async (req, res) => {
  await PantryList.findByIdAndDelete(req.params.id);
  res.send('Pantry List deleted successfully.');
});

// ✅ Meals Endpoint (Updated Feature)
app.get('/meals', checkJwt, async (req, res) => {
  const meals = await Meal.find({ userId: req.user.sub });
  res.send(meals);
});

app.post('/meals', checkJwt, async (req, res) => {
  const newMeal = new Meal({
    userId: req.user.sub,
    ...req.body
  });
  await newMeal.save();
  res.status(201).send(newMeal);
});

app.put('/meals/:id', checkJwt, async (req, res) => {
  const updatedMeal = await Meal.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.send(updatedMeal);
});

app.delete('/meals/:id', checkJwt, async (req, res) => {
  await Meal.findByIdAndDelete(req.params.id);
  res.send('Meal deleted successfully.');
});

// ✅ Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
