import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export interface ConfiguredRateLimiter {
  (req: Request, res: Response, next: NextFunction): void;
  reset: () => void;
}

/**
 * Creates an in-memory sliding window rate limiter.
 * NOTE FOR PRODUCTION: In-memory rate limiting resets upon server restart and is scoped
 * to a single Node.js instance. For multi-instance clustered or autoscaled deployments,
 * replace the internal Map with a shared Redis store.
 */
export const createRateLimiter = (options: RateLimitOptions): ConfiguredRateLimiter => {
  const clients = new Map<string, ClientRecord>();

  // Periodically clean up expired entries to avoid memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clients.entries()) {
      if (now > record.resetTime) {
        clients.delete(key);
      }
    }
  }, Math.max(options.windowMs, 30 * 1000));

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  const limiter: any = (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier securely
    // In Express, req.ip respects 'trust proxy' when configured, otherwise uses remoteAddress
    const clientKey = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    let record = clients.get(clientKey);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      clients.set(clientKey, record);
      return next();
    }

    record.count += 1;

    if (record.count > options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: options.message,
      });
    }

    next();
  };

  limiter.reset = () => {
    clients.clear();
  };

  return limiter as ConfiguredRateLimiter;
};

// 10 login attempts per minute per client
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait a minute before trying again.',
});

// 5 registration attempts per minute per client
export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many registration attempts. Please wait a minute before trying again.',
});
