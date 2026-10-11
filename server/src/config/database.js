import mongoose from "mongoose";
import env from "./env.js";

async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is missing. Copy .env.example to .env and set the connection string.");
  }

  await mongoose.connect(env.mongodbUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export default connectDatabase;
