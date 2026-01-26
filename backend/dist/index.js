"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_1 = require("./socket");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const vouchers_1 = __importDefault(require("./routes/vouchers"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const qr_1 = __importDefault(require("./routes/qr"));
const announcements_1 = __importDefault(require("./routes/announcements"));
const pos_1 = __importDefault(require("./routes/pos"));
const companies_1 = __importDefault(require("./routes/companies"));
const settings_1 = __importDefault(require("./routes/settings"));
const outlets_1 = __importDefault(require("./routes/outlets"));
const investors_1 = __importDefault(require("./routes/investors"));
const media_1 = __importDefault(require("./routes/media"));
const upload_1 = __importDefault(require("./routes/upload"));
const auditLogs_1 = __importDefault(require("./routes/auditLogs"));
const staff_1 = __importDefault(require("./routes/staff"));
// Import rate limiters
const rateLimiter_1 = require("./middleware/rateLimiter");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Trust proxy for rate limiting (when behind nginx/reverse proxy)
app.set('trust proxy', true);
// Security headers middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes with rate limiting
app.use('/api/auth', rateLimiter_1.authLimiter, auth_1.default);
app.use('/api/users', rateLimiter_1.apiLimiter, users_1.default);
app.use('/api/staff', rateLimiter_1.apiLimiter, staff_1.default);
app.use('/api/vouchers', rateLimiter_1.apiLimiter, vouchers_1.default);
app.use('/api/transactions', rateLimiter_1.apiLimiter, transactions_1.default);
app.use('/api/qr', rateLimiter_1.publicLimiter, qr_1.default);
app.use('/api/announcements', rateLimiter_1.publicLimiter, announcements_1.default);
app.use('/api/pos', rateLimiter_1.apiLimiter, pos_1.default);
app.use('/api/companies', rateLimiter_1.apiLimiter, companies_1.default);
app.use('/api/settings', rateLimiter_1.apiLimiter, settings_1.default);
app.use('/api/outlets', rateLimiter_1.apiLimiter, outlets_1.default);
app.use('/api/investors', rateLimiter_1.apiLimiter, investors_1.default);
app.use('/api/media', rateLimiter_1.publicLimiter, media_1.default);
app.use('/api/upload', rateLimiter_1.apiLimiter, upload_1.default);
app.use('/api/audit-logs', rateLimiter_1.apiLimiter, auditLogs_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});
// Create HTTP server and Socket.IO instance
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST']
    }
});
// Initialize socket module
(0, socket_1.initSocket)(io);
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    // Handle user authentication and join user-specific room
    socket.on('authenticate', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`✅ User ${userId} authenticated on socket ${socket.id}`);
    });
    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});
// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Sarnies Loyalty API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`⚡ WebSocket server ready`);
});
exports.default = app;
//# sourceMappingURL=index.js.map