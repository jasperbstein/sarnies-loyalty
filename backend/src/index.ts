// Load environment variables FIRST - before any imports that read process.env
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initSocket } from './socket';
import { verifyToken } from './utils/jwt';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import voucherRoutes from './routes/vouchers';
import transactionRoutes from './routes/transactions';
import qrRoutes from './routes/qr';
import announcementRoutes from './routes/announcements';
import posRoutes from './routes/pos';
import companyRoutes from './routes/companies';
import settingsRoutes from './routes/settings';
import outletsRoutes from './routes/outlets';
import investorRoutes from './routes/investors';
import mediaRoutes from './routes/media';
import uploadRoutes from './routes/upload';
import auditLogRoutes from './routes/auditLogs';
import staffRoutes from './routes/staff';
import referralRoutes from './routes/referrals';
import rewardsRoutes from './routes/rewards';
import lineAuthRoutes from './routes/lineAuth';

// Import rate limiters
import { apiLimiter, authLimiter, publicLimiter, posLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting (when behind nginx/reverse proxy)
// Use 1 (single proxy hop) instead of true to avoid rate limiter warnings
app.set('trust proxy', 1);

// Security headers middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check (no rate limiting)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/staff', apiLimiter, staffRoutes);
app.use('/api/vouchers', apiLimiter, voucherRoutes);
app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/qr', publicLimiter, qrRoutes);
app.use('/api/announcements', publicLimiter, announcementRoutes);
app.use('/api/pos', posLimiter, posRoutes);
app.use('/api/companies', apiLimiter, companyRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/api/outlets', apiLimiter, outletsRoutes);
app.use('/api/investors', apiLimiter, investorRoutes);
app.use('/api/media', publicLimiter, mediaRoutes);
app.use('/api/upload', apiLimiter, uploadRoutes);
app.use('/api/audit-logs', apiLimiter, auditLogRoutes);
app.use('/api/referrals', apiLimiter, referralRoutes);
app.use('/api/rewards', apiLimiter, rewardsRoutes);
app.use('/api/line', publicLimiter, lineAuthRoutes); // Use publicLimiter for LINE webhook compatibility

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Initialize socket module
initSocket(io);

// Socket.IO connection handling with JWT authentication
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Handle user authentication with JWT token verification
  socket.on('authenticate', (token: string) => {
    try {
      const payload = verifyToken(token);
      if (payload && payload.id) {
        socket.join(`user:${payload.id}`);
        // Store user info on socket for later use
        (socket as any).userId = payload.id;
        (socket as any).userType = payload.type;
        console.log(`✅ User ${payload.id} (${payload.type}) authenticated on socket ${socket.id}`);
        socket.emit('authenticated', { success: true, userId: payload.id });
      }
    } catch (error) {
      console.log(`❌ Socket auth failed for ${socket.id}: Invalid token`);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });

  // Handle magic link session subscription (for WebSocket-based login)
  socket.on('join_magic_link_session', (sessionId: string) => {
    if (sessionId && typeof sessionId === 'string' && sessionId.length === 32) {
      socket.join(`magic-link:${sessionId}`);
      console.log(`🔗 Socket ${socket.id} joined magic-link session: ${sessionId}`);
      socket.emit('magic_link_session_joined', { sessionId });
    } else {
      socket.emit('magic_link_session_error', { error: 'Invalid session ID' });
    }
  });

  socket.on('disconnect', () => {
    const userId = (socket as any).userId;
    console.log(`🔌 Client disconnected: ${socket.id}${userId ? ` (user ${userId})` : ''}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Sarnies Loyalty API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ WebSocket server ready`);
});

export default app;
