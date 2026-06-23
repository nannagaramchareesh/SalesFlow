const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env variables if any
require('dotenv').config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Routes
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/dealers', require('./routes/dealers'));
app.use('/api/catalogues', require('./routes/catalogues'));
app.use('/api/price-lists', require('./routes/priceLists'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/stocks', require('./routes/stocks'));


// Basic route
app.get('/', (req, res) => {
  res.send('Dealer Sales Tracker API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
