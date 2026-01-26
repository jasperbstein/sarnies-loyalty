"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRedemption = exports.calculatePoints = void 0;
const POINTS_PER_100_THB = parseInt(process.env.POINTS_PER_100_THB || '1', 10);
const calculatePoints = (amount) => {
    // Formula: floor(amount / 100) * POINTS_PER_100_THB
    return Math.floor(amount / 100) * POINTS_PER_100_THB;
};
exports.calculatePoints = calculatePoints;
const validateRedemption = (userPoints, voucherCost) => {
    return userPoints >= voucherCost;
};
exports.validateRedemption = validateRedemption;
//# sourceMappingURL=points.js.map