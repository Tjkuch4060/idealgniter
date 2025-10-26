# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Idealgniter is a serverless AI-powered business idea validation platform. The architecture prioritizes simplicity and cost-effectiveness using vanilla HTML/CSS/JS with Vercel serverless functions for OpenAI GPT-4 integration.

**Core value proposition:** Users submit business ideas and receive comprehensive AI-powered validation reports including market potential, feasibility, uniqueness scores, and actionable recommendations. Optionally supports GitHub repository analysis for existing codebases.

## Development Commands

```bash
# Local development - ALWAYS use this, never npm start or Live Server
vercel dev

# Install dependencies
npm install

# Pull environment variables from Vercel
vercel env pull .env.local

# Add environment variable to Vercel
vercel env add

# Deploy to production
npm run deploy
# or: vercel --prod

# Preview deployment
npm run deploy:preview

# View serverless function logs
vercel logs
# or: npm run logs
```

**Critical:** This project requires `vercel dev` for local development to properly simulate serverless functions. Standard development servers will not work.

## Architecture

### Serverless-First Design

**Backend:** Single Vercel serverless function at [api/validate-idea.js](api/validate-idea.js) handles all AI processing
- OpenAI GPT-4o-mini integration with structured JSON responses
- In-memory rate limiting (5 requests/hour per IP)
- Optional GitHub repository analysis via public GitHub API
- Comprehensive error handling with user-friendly messages

**Frontend:** Vanilla JavaScript with Tailwind CSS (no build step)
- [assets/js/app.js](assets/js/app.js) - Modal management, form handling, results rendering, idea history
- [assets/js/config.js](assets/js/config.js) - API client with retry logic, exponential backoff, timeout handling
- [assets/js/particle-header.js](assets/js/particle-header.js) - Interactive canvas particle animation
- [assets/js/share-utils.js](assets/js/share-utils.js) - PDF generation and sharing functionality
- [assets/css/styles.css](assets/css/styles.css) - Glass-morphism effects and hardware-accelerated animations

**Configuration:**
- [vercel.json](vercel.json) - Route configuration (static files served directly, API routes to functions)
- Node.js >= 18.0.0 required
- Zero-config deployment via Vercel

### Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key for GPT-4 integration

Store in `.env.local` for local development. Add to Vercel via `vercel env add OPENAI_API_KEY production` for production.

**Security:** API keys are never exposed to frontend. All OpenAI calls happen server-side in the Vercel function.

## Key Integration Patterns

### OpenAI Integration

The serverless function uses structured prompts with forced JSON responses:

```javascript
// Pattern from api/validate-idea.js
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: "json_object" },
  temperature: 0.7,
  max_tokens: 2000,
  // ...comprehensive business analysis prompt
});
```

**Response schema includes:**
- Scores: `marketPotential`, `feasibility`, `uniqueness`, `overallScore` (0-100)
- Analysis: `summary`, `targetAudience`, `competitiveAdvantage`
- Lists: `strengths[]`, `challenges[]`, `recommendations[]`, `potentialRisks[]`, `nextSteps[]`
- Estimates: `estimatedTimeToMarket`, `fundingRequirement`
- Optional: `repoAnalysis` (when GitHub URL provided)

### GitHub Repository Analysis

When users provide a GitHub repository URL, the function:
1. Fetches repository metadata, README, and languages from GitHub API
2. Augments the OpenAI prompt with codebase context
3. Provides specific insights about code-to-business alignment

The GitHub integration is non-blocking - failures are logged but don't prevent idea validation.

### Frontend-Backend Communication

```javascript
// Pattern from config.js - Environment-aware API base URL
baseURL: window.location.origin  // Works for both localhost:3000 and production
```

API client features:
- 60-second timeout for AI processing
- Automatic retry with exponential backoff (max 2 attempts)
- Rate limit tracking in localStorage with UI display
- Custom `APIError` class with status codes and error types

### Modal State Management

```javascript
// Pattern from app.js - Modal lifecycle
ideaModal.classList.remove('hidden');
ideaTitleInput.focus(); // Always focus first input for accessibility

// Escape key handling
document.addEventListener('keydown', escapeHandler);

// Cleanup on modal close
document.removeEventListener('keydown', escapeHandler);
```

Results modal is dynamically created/destroyed (not hidden/shown) to prevent DOM bloat.

### Idea History

Local storage-based history tracking (max 20 items):
- Ideas saved with full validation results
- Searchable and exportable
- PDF generation via html2pdf.js
- Share functionality with URL encoding

## Error Handling

**User-friendly error mapping** (see [api/validate-idea.js](api/validate-idea.js:352-379)):
- `insufficient_quota` → "API quota exceeded. Please try again later."
- `rate_limit_exceeded` → "Too many requests. Please wait a moment and try again."
- `invalid_api_key` → "Invalid API configuration. Please contact support."
- Network errors → "Network error. Please check your connection."
- Timeouts → "Request timed out. Please try again."

Client-side errors (4xx) are not retried except for 408 timeout. Server errors (5xx) trigger exponential backoff retry.

## UI Framework

**Glass-morphism design system:**
- Base component: `.glass-card` class for backdrop-blur styling
- Hardware-accelerated animations with `transform3d` and `will-change`
- Responsive Tailwind classes with custom CSS animations
- ARIA labels and semantic HTML for accessibility
- Keyboard navigation support (Escape key closes modals)

## Performance Optimizations

- CSS: Hardware acceleration for smooth animations
- JS: Async/await with `AbortSignal.timeout()` for request timeouts
- HTML: Semantic structure, marked.js for markdown rendering
- Serverless: Stateless functions with fast cold starts
- Rate limiting: In-memory store (consider Redis/Vercel KV for production scale)

## Common Debugging Scenarios

**API issues:**
```bash
vercel logs  # Check serverless function errors
vercel env ls  # Verify environment variables
curl -X POST http://localhost:3000/api/validate-idea -H "Content-Type: application/json" -d '{"title":"Test","description":"Test idea description"}'
```

**Local development issues:**
- Verify `.env.local` contains `OPENAI_API_KEY`
- Check Node.js version >= 18.0.0
- Ensure using `vercel dev` (not Live Server or other dev servers)

**Rate limiting:**
- Default: 5 requests per hour per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Frontend displays remaining requests in UI

## Testing Strategy

**Manual testing workflow:**
1. Start `vercel dev`
2. Test with various idea types (SaaS, hardware, e-commerce, etc.)
3. Test with and without GitHub repository URLs
4. Simulate errors: invalid API key, network failures, rate limiting
5. Test responsive design across devices
6. Verify keyboard navigation (Tab, Escape, Enter)
7. Test accessibility with screen reader

**Error scenarios to test:**
- Empty/short title or description
- Invalid GitHub URL
- Rate limit exceeded (submit 6+ ideas in 1 hour)
- Timeout (disconnect network mid-request)
- Invalid OpenAI API key

## Current Development Phase

**Phase 1 (COMPLETED):** OpenAI integration with comprehensive validation, rate limiting, GitHub repository analysis, PDF export, idea history

**Phase 2 (PLANNED):** User authentication with Firebase, user dashboard, profile management, idea history sync

**Phase 3 (PLANNED):** Advanced visualizations with Chart.js, email delivery, social sharing

See [TODO.md](TODO.md) for complete roadmap.

## Important Notes

- Cost per validation: ~$0.01-0.02 (GPT-4o-mini model)
- Browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- No framework dependencies - vanilla JS for minimal bundle size
- CORS configured for cross-origin requests during development
- Results include token usage metadata for cost tracking

When modifying this codebase:
1. Maintain serverless-first architecture
2. Preserve glass-morphism design system
3. Ensure all OpenAI integrations include comprehensive error handling
4. Test locally with `vercel dev` before deploying
5. Never commit `.env.local` or expose API keys
