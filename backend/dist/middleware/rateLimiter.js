"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicLimiter = exports.createLimiter = exports.otpLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// General API rate limiter - 100 requests per 15 minutes
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});
// Stricter limiter for authentication endpoints - 1000 requests per 15 minutes (effectively disabled)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 login requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count successful requests
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});
// Very strict limiter for OTP requests - 1000 requests per 15 minutes (effectively disabled)
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 OTP requests per windowMs
    message: 'Too many OTP requests from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many OTP requests',
            message: 'Too many OTP requests from this IP. Please try again after 15 minutes.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});
// Moderate limiter for creating resources - 20 requests per 15 minutes
exports.createLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 create requests per windowMs
    message: 'Too many create requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You are creating resources too quickly. Please slow down.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});
// Lenient limiter for public endpoints - 20 requests per 1 minute
exports.publicLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 requests per minute
    message: 'Too many requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You are making requests too quickly. Please slow down.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});
//# sourceMappingURL=rateLimiter.js.map