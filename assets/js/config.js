// API Configuration
const API_CONFIG = {
  // Use relative path for Vercel deployment, or localhost for local development
  baseURL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : window.location.origin,
  
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
  async validateIdea(title, description) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.validateIdea}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description }),
        signal: AbortSignal.timeout(API_CONFIG.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || 'Failed to validate idea',
          response.status,
          errorData.type
        );
      }

      return await response.json();
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
  constructor(message, status, type) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.type = type;
  }
}

// Export for use in other files
window.API = API;
window.APIError = APIError;
