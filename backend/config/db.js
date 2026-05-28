const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dealer-tracker');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.warn("Could not connect to MongoDB. Make sure MongoDB is running locally or MONGO_URI is set.");
    // We don't exit the process here so the server can still run and we can show UI (though API will fail).
  }
};

module.exports = connectDB;
