const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/visionsync";
  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`⚠️ Primary MongoDB connection failed (${err.message}). Attempting local fallback...`);
    try {
      const localUri = "mongodb://127.0.0.1:27017/visionsync";
      const conn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ MongoDB connected to local fallback: ${conn.connection.host}`);
    } catch (localErr) {
      console.error("❌ MongoDB connection failed:", localErr.message);
      console.error(
        "   → Set MONGODB_URI in backend/.env (see .env.example for instructions)"
      );
      process.exit(1);
    }
  }
};

module.exports = connectDB;
