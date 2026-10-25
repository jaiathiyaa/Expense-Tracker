import { AssistantIntentType } from './assistantNlpService';

export interface ConversationContext {
  lastIntent: AssistantIntentType;
  lastDatePreset: string;
  lastSpecificMonth?: string;
  lastCategory?: string;
  lastLimit?: number;
  updatedAt: number;
}

export class AssistantContextService {
  // In-memory bounded cache mapping userId to their active conversation context
  private contextMap = new Map<string, ConversationContext>();

  // TTL: 10 minutes of inactivity
  private readonly TTL_MS = 10 * 60 * 1000;
  // Maximum sessions before forced eviction of oldest
  private readonly MAX_SESSIONS = 5000;

  /**
   * Retrieves active context for authenticated user. Returns null if expired or missing.
   */
  public getContext(userId: string): ConversationContext | null {
    if (!userId) return null;

    const entry = this.contextMap.get(userId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.updatedAt > this.TTL_MS) {
      this.contextMap.delete(userId);
      return null;
    }

    return entry;
  }

  /**
   * Updates context for authenticated user with TTL timestamp refresh
   */
  public updateContext(
    userId: string,
    params: {
      intent: AssistantIntentType;
      datePreset: string;
      specificMonth?: string;
      category?: string;
      limit?: number;
    }
  ): void {
    if (!userId) return;

    // Do not retain GREETING or UNKNOWN as semantic anchors for follow-up
    if (params.intent === 'GREETING' || params.intent === 'UNKNOWN') {
      return;
    }

    // Capacity guard to prevent memory leaks
    if (this.contextMap.size >= this.MAX_SESSIONS) {
      this.evictStaleOrOldest();
    }

    this.contextMap.set(userId, {
      lastIntent: params.intent,
      lastDatePreset: params.datePreset,
      lastSpecificMonth: params.specificMonth,
      lastCategory: params.category,
      lastLimit: params.limit,
      updatedAt: Date.now(),
    });
  }

  /**
   * Explicitly clears context for a user (e.g. on chat clear or logout)
   */
  public clearContext(userId: string): void {
    if (!userId) return;
    this.contextMap.delete(userId);
  }

  /**
   * Evicts expired entries or oldest entries if capacity is reached
   */
  private evictStaleOrOldest(): void {
    const now = Date.now();
    for (const [userId, ctx] of this.contextMap.entries()) {
      if (now - ctx.updatedAt > this.TTL_MS) {
        this.contextMap.delete(userId);
      }
    }

    // If still at capacity, delete first (oldest) entry
    if (this.contextMap.size >= this.MAX_SESSIONS) {
      const oldestKey = this.contextMap.keys().next().value;
      if (oldestKey) {
        this.contextMap.delete(oldestKey);
      }
    }
  }

  /**
   * Testing helper: inspect active session count
   */
  public getActiveCount(): number {
    return this.contextMap.size;
  }

  /**
   * Testing helper: manually expire a context
   */
  public expireContextForTesting(userId: string): void {
    const entry = this.contextMap.get(userId);
    if (entry) {
      entry.updatedAt = Date.now() - (this.TTL_MS + 1000);
    }
  }
}

export const assistantContextService = new AssistantContextService();
