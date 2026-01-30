import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { getAuditLogs, getAuditLogCount } from '../utils/auditLog';

const router = Router();

/**
 * GET /api/audit-logs
 * Get audit logs with filters (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      entityType,
      entityId,
      action,
      userId,
      staffId,
      startDate,
      endDate,
      severity,
      page = '1',
      limit = '50'
    } = req.query;

    const filters: any = {};

    if (entityType) filters.entityType = entityType as string;
    if (entityId) filters.entityId = parseInt(entityId as string);
    if (action) filters.action = action as string;
    if (userId) filters.userId = parseInt(userId as string);
    if (staffId) filters.staffId = parseInt(staffId as string);
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (severity) filters.severity = severity as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    filters.limit = limitNum;
    filters.offset = (pageNum - 1) * limitNum;

    // Get logs and total count
    const [logs, totalCount] = await Promise.all([
      getAuditLogs(filters),
      getAuditLogCount(filters)
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity (Admin only)
 */
router.get('/entity/:entityType/:entityId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const logs = await getAuditLogs({
      entityType: entityType as any,
      entityId: parseInt(entityId),
      limit
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch entity audit logs' });
  }
});

/**
 * GET /api/audit-logs/user/:userId
 * Get audit logs for a specific user's actions (Admin only)
 */
router.get('/user/:userId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const userType = req.query.userType as string; // 'user' or 'staff'

    const filters: any = { limit };

    if (userType === 'staff') {
      filters.staffId = parseInt(userId);
    } else {
      filters.userId = parseInt(userId);
    }

    const logs = await getAuditLogs(filters);

    res.json({ logs });
  } catch (error) {
    console.error('Get user audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch user audit logs' });
  }
});

/**
 * GET /api/audit-logs/recent
 * Get recent audit logs (Admin only)
 */
router.get('/recent', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const logs = await getAuditLogs({ limit });

    res.json({ logs });
  } catch (error) {
    console.error('Get recent audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch recent audit logs' });
  }
});

export default router;
