import { Request, Response } from 'express';
import { assistantNlpService } from '../services/assistantNlpService';
import { assistantContextService } from '../services/assistantContextService';

// Simple in-memory sliding window rate limiter per user (30 requests per minute)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export const chatWithAssistant = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rate-limiting check
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId) || { count: 0, windowStart: now };
    if (now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
      userLimit.count = 1;
      userLimit.windowStart = now;
      rateLimitMap.set(userId, userLimit);
    } else {
      userLimit.count += 1;
      if (userLimit.count > RATE_LIMIT_MAX) {
        return res.status(429).json({
          error: 'Too many requests. Please wait a moment before asking another question.',
        });
      }
      rateLimitMap.set(userId, userLimit);
    }

    // Validate request body
    const { message, resetContext } = req.body;
    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a string.' });
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (trimmedMessage.length > 500) {
      return res.status(400).json({
        error: 'Message is too long. Please limit your question to 500 characters.',
      });
    }

    // Process natural-language query deterministically
    const response = await assistantNlpService.processQuery(userId, trimmedMessage, {
      resetContext: Boolean(resetContext),
    });

    return res.status(200).json(response);
  } catch (err: any) {
    console.error('[AssistantController] Error in chatWithAssistant:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred while processing your question.',
    });
  }
};

export const resetAssistantContext = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    assistantContextService.clearContext(userId);
    return res.status(200).json({ success: true, message: 'Conversation context reset.' });
  } catch (err: any) {
    console.error('[AssistantController] Error in resetAssistantContext:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred while resetting context.',
    });
  }
};
