// API Configuration
const API_CONFIG = {
  // Use same origin for both local development and production
  baseURL: window.location.origin,
  
  endpoints: {
    validateIdea: '/api/validate-idea'
  },
  
  // Request timeout in milliseconds
  timeout: 60000, // 60 seconds for AI processing
  
  // Retry configuration
  retry: {
    maxAttempts: 2,
    delayMs: 1000
  }
};

// API Helper Functions
const API = {
  /**
   * Make a POST request to validate an idea
   */
  async validateIdea(title, description, githubRepo = '') {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.validateIdea}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description, githubRepo }),
        signal: AbortSignal.timeout(API_CONFIG.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Store rate limit info if available
        const rateLimitInfo = {
          limit: response.headers.get('X-RateLimit-Limit'),
          remaining: response.headers.get('X-RateLimit-Remaining'),
          reset: response.headers.get('X-RateLimit-Reset')
        };

        if (rateLimitInfo.remaining !== null) {
          localStorage.setItem('rateLimitInfo', JSON.stringify(rateLimitInfo));
        }

        throw new APIError(
          errorData.error || 'Failed to validate idea',
          response.status,
          errorData.type,
          errorData.retryAfter
        );
      }

      const data = await response.json();

      // Store rate limit info from successful response
      const rateLimitInfo = {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset')
      };

      if (rateLimitInfo.remaining !== null) {
        localStorage.setItem('rateLimitInfo', JSON.stringify(rateLimitInfo));
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new APIError(
          'Request timed out. Please try again.',
          408,
          'timeout'
        );
      }
      
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        'Network error. Please check your connection and try again.',
        0,
        'network_error'
      );
    }
  },

  /**
   * Retry a failed request
   */
  async withRetry(fn, maxAttempts = API_CONFIG.retry.maxAttempts) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except timeout
        if (error.status >= 400 && error.status < 500 && error.status !== 408) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          await new Promise(resolve => 
            setTimeout(resolve, API_CONFIG.retry.delayMs * attempt)
          );
        }
      }
    }
    
    throw lastError;
  }
};

// Custom API Error class
class APIError extends Error {
  constructor(message, status, type, retryAfter) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.type = type;
    this.retryAfter = retryAfter;
  }
}

// Export for use in other files
window.API = API;
window.APIError = APIError;
