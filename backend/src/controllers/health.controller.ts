import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * GET /api/health
 * Lightweight liveness and readiness probe for container orchestrators and load balancers.
 * Checks PostgreSQL connectivity via Prisma without exposing internal connection strings or stack traces.
 */
export const getHealth = async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  try {
    // Execute a lightweight query to verify active database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'healthy',
      database: 'connected',
      uptime: Math.floor(process.uptime()),
      timestamp,
    });
  } catch (err: any) {
    console.error('[HealthCheck] Database connectivity check failed:', err?.message || 'Unknown database error');

    // Return 503 Service Unavailable without leaking SQL or environment details
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp,
    });
  }
};
