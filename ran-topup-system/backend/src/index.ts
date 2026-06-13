import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB, isDbConnected, getConnectionStatus } from './config/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import packageRoutes from './routes/package.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import agentRoutes from './routes/agent.routes';
import configRoutes from './routes/config.routes';
import paymentRoutes from './routes/payment.routes';
import settingsRoutes from './routes/settings.routes';
import setupRoutes from './routes/setup.routes';
import gmcRoutes from './routes/gmc.routes';
import shopAdminRoutes from './routes/shop-admin.routes';
import serverRoutes from './routes/server.routes';
import gmLogsRoutes from './routes/gmlogs.routes';
import searchRoutes from './routes/search.routes';
import alertsRoutes from './routes/alerts.routes';
import orderHistoryRoutes from './routes/order-history.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin/agents', agentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/admin/gmc', gmcRoutes);
app.use('/api/admin/shop', shopAdminRoutes);
app.use('/api/admin/server', serverRoutes);
app.use('/api/admin/gmlogs', gmLogsRoutes);
app.use('/api/admin/search', searchRoutes);
app.use('/api/admin/alerts', alertsRoutes);
app.use('/api/admin/order-history', orderHistoryRoutes);

// Health Check - แสดงสถานะ database ทั้งหมด
app.get('/api/health', (_, res) => {
  const status = getConnectionStatus();
  res.json({
    status: 'ok',
    database: {
      connected: isDbConnected(),
      game: status.game,
      user: status.user,
      log: status.log,
      shop: status.shop
    },
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
async function start() {
  console.log('Starting RAN TOP-UP PRO Backend...\n');
  
  const dbConnected = await connectDB();
  
  app.listen(PORT, () => {
    console.log(`\n=== Server Started ===`);
    console.log(`Port: ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Setup: http://localhost:3000/setup`);
    
    if (!dbConnected) {
      console.log('\n⚠️ Database not connected');
      console.log('Please go to http://localhost:3000/setup to configure');
    }
  });
}

start();

export default app;
