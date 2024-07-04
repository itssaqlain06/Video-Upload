import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors';
import dotenv from 'dotenv'

import uploadRoute from './routes/upload.js';

dotenv.config();
const app = express();
const port = 5000;

const mongoDB = mongoose.connect(process.env.MONGODB_URL);

app.use(cors());

app.use(express.json());

app.use('/upload', uploadRoute);

app.listen(port, () => {
    if (mongoDB) console.log('MongoDB connected successfully ✅')
    else console.log('MongoDB disconnected ❌')
    console.log(`Server running at http://localhost:${port}`);
})
