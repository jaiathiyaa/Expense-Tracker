import { API_CONFIG } from '../api/config';
import { ApiError, ApiErrorResponse } from '../api/types';

export interface AssistantChatResponse {
  answer: string;
  intent: string;
  data?: any;
  suggestions?: string[];
  meta?: {
    source: 'llm' | 'regex_fallback';
    model?: string;
    phrasedByLlm?: boolean;
  };
}

export const assistantService = {
  /**
   * Sends a user question to the AI Assistant endpoint
   */
  async sendMessage(
    token: string,
    message: string,
    options?: { resetContext?: boolean }
  ): Promise<AssistantChatResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ASSISTANT_CHAT}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          resetContext: options?.resetContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        const errorMessage =
          (data as ApiErrorResponse)?.error ||
          (data as ApiErrorResponse)?.message ||
          `Request failed with status ${response.status}`;
        throw new ApiError(errorMessage, response.status, data);
      }

      return data as AssistantChatResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) throw error;
      if (error.name === 'AbortError') {
        throw new ApiError('Assistant request timed out. Please try again.', 408);
      }
      throw new ApiError(error.message || 'Unable to connect to AI Assistant.', 0);
    }
  },

  /**
   * Resets the active conversation context on the server
   */
  async resetConversation(token: string): Promise<boolean> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ASSISTANT_RESET}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  },
};
