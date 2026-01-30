import rateLimit from 'express-rate-limit';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
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

// Stricter limiter for authentication endpoints - 10 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
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

// Very strict limiter for OTP requests - 5 requests per 15 minutes
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
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
export const createLimiter = rateLimit({
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
export const publicLimiter = rateLimit({
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
