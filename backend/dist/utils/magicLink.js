"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredTokens = exports.checkMagicLinkRateLimit = exports.verifyMagicToken = exports.saveMagicToken = exports.generateMagicToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../db/database");
const MAGIC_LINK_EXPIRY_MINUTES = 15;
// Generate a cryptographically secure magic link token
const generateMagicToken = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateMagicToken = generateMagicToken;
// Save magic link token to database
const saveMagicToken = async (email, token) => {
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
    await (0, database_1.query)(`INSERT INTO magic_link_tokens (email, token, expires_at)
     VALUES ($1, $2, $3)`, [email.toLowerCase(), token, expiresAt]);
};
exports.saveMagicToken = saveMagicToken;
// Verify magic link token - returns email if valid, null if invalid/expired/used
const verifyMagicToken = async (token) => {
    // Find valid, unused, non-expired token
    const result = await (0, database_1.query)(`SELECT id, email FROM magic_link_tokens
     WHERE token = $1
       AND used_at IS NULL
       AND expires_at > NOW()`, [token]);
    if (result.rows.length === 0) {
        return null;
    }
    const { id, email } = result.rows[0];
    // Mark token as used
    await (0, database_1.query)(`UPDATE magic_link_tokens SET used_at = NOW() WHERE id = $1`, [id]);
    return email;
};
exports.verifyMagicToken = verifyMagicToken;
// Check rate limit - returns true if allowed, false if too many requests
const checkMagicLinkRateLimit = async (email) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await (0, database_1.query)(`SELECT COUNT(*) as count FROM magic_link_tokens
     WHERE email = $1 AND created_at > $2`, [email.toLowerCase(), oneHourAgo]);
    const count = parseInt(result.rows[0].count);
    return count < 3; // Max 3 magic links per hour
};
exports.checkMagicLinkRateLimit = checkMagicLinkRateLimit;
// Cleanup expired tokens (can be called periodically)
const cleanupExpiredTokens = async () => {
    await (0, database_1.query)(`DELETE FROM magic_link_tokens WHERE expires_at < NOW() - INTERVAL '1 day'`);
};
exports.cleanupExpiredTokens = cleanupExpiredTokens;
//# sourceMappingURL=magicLink.js.map