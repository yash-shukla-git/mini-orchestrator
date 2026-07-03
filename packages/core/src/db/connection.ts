import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../logger';

export async function connectDB() {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(config.mongoUri);
  logger.info('Connected to MongoDB');
}
