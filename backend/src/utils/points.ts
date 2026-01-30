const POINTS_PER_100_THB = parseInt(process.env.POINTS_PER_100_THB || '1', 10);

export const calculatePoints = (amount: number): number => {
  // Formula: floor(amount / 100) * POINTS_PER_100_THB
  return Math.floor(amount / 100) * POINTS_PER_100_THB;
};

export const validateRedemption = (
  userPoints: number,
  voucherCost: number
): boolean => {
  return userPoints >= voucherCost;
};
