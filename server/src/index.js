import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import poolManager from './database/PoolManager.js';
import masterPool from './database/masterPool.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import companyProfileRoutes from './routes/companyProfileRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import path from 'path';
import { errorHandler } from './middlewares/errorMiddleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Trust proxy for production deployment (behind reverse proxy/load balancer)
app.set('trust proxy', true);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/company-profile', companyProfileRoutes);
app.use('/api/account', passwordRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api', activityLogRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('IFB ERP API Server Running');
});

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 4001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await poolManager.shutdown();
      await masterPool.end();
      process.exit(0);
    } catch (error) {
      console.error('Graceful shutdown failed:', error);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

