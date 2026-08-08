import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import portfolioRouter from './routes/portfolio.js';
import categoriesRouter from './routes/categories.js';
import uploadRouter from './routes/upload.js';
import contactRouter from './routes/contact.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'polygon-paradise-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/contact', contactRouter);

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
