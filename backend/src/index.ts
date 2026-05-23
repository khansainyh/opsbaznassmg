console.log("Starting index.ts");
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './utils/prisma';

import pilarRoutes from './routes/pilar.route';
import programRoutes from './routes/program.route';
import proposalRoutes from './routes/proposal.route';
import suratRoutes from './routes/surat.route';
import mustahikRoutes from './routes/mustahik.route';
import authRoutes from './routes/auth.route';
import userRoutes from './routes/user.route';
import notificationRoutes from './routes/notification.route';
import parameterRoutes from './routes/parameter.route';
import financeRoutes from './routes/finance.route';
import mutationRoutes from './routes/mutation.route';
import muzakkiRoutes from './routes/muzakki.route';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Default Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BAZNAS Backend API' });
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
  }
});

// Setup API Routes
app.use('/api/pilars', pilarRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/surats', suratRoutes);
app.use('/api/mustahik', mustahikRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/mutations', mutationRoutes);
app.use('/api/muzakki', muzakkiRoutes);


import { initCronJobs } from './utils/cronJobs';

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  initCronJobs();
});
