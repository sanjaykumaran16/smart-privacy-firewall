import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api';



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:3000', 'chrome-extension://*'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api', apiRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Smart Privacy Firewall API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});