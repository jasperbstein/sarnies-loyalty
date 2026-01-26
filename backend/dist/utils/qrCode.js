"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticQR = generateStaticQR;
exports.verifyStaticQR = verifyStaticQR;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'sarnies-loyalty-secret-key';
/**
 * Generate improved static QR code with enhanced security
 */
async function generateStaticQR(customerId) {
    const createdAt = new Date();
    // Enhanced JWT payload with version, issuer, and nonce for integrity
    const payload = {
        version: 1,
        type: 'loyalty_id',
        customer_id: customerId.toString().padStart(6, '0'),
        issuer: 'sarnies_loyalty',
        nonce: crypto_1.default.randomBytes(8).toString('hex'), // Tamper resistance
        iat: Math.floor(createdAt.getTime() / 1000)
    };
    // Non-expiring token for static QR (customer's permanent ID)
    // Omit expiresIn to create non-expiring token
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET);
    // Pre-generate QR code image as data URL
    const dataUrl = await qrcode_1.default.toDataURL(token, {
        width: 400,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M' // Medium error correction (good balance)
    });
    return {
        token,
        dataUrl,
        createdAt
    };
}
/**
 * Validate and decode static QR token
 */
function verifyStaticQR(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Validate payload structure
        if (!decoded.type || decoded.type !== 'loyalty_id') {
            return { valid: false, error: 'Invalid QR code type' };
        }
        if (!decoded.customer_id) {
            return { valid: false, error: 'Missing customer ID' };
        }
        // Optional: Check version for future migrations
        if (decoded.version && decoded.version > 1) {
            return { valid: false, error: 'QR code version not supported' };
        }
        // Optional: Verify issuer
        if (decoded.issuer && decoded.issuer !== 'sarnies_loyalty') {
            return { valid: false, error: 'Invalid QR code issuer' };
        }
        return {
            valid: true,
            customerId: decoded.customer_id
        };
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { valid: false, error: 'QR code expired' };
        }
        if (error.name === 'JsonWebTokenError') {
            return { valid: false, error: 'Invalid QR code' };
        }
        return { valid: false, error: 'QR verification failed' };
    }
}
//# sourceMappingURL=qrCode.js.map