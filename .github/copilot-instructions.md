# Idealgniter AI Coding Agent Instructions

## Project Overview
Idealgniter is a **serverless AI-powered business idea validation platform** using vanilla HTML/CSS/JS frontend with Vercel serverless functions for OpenAI GPT-4 integration. The architecture prioritizes simplicity, performance, and cost-effectiveness over complex frameworks.

## Architecture Principles

### Serverless-First Design
- **Backend**: Single Vercel serverless function (`/api/validate-idea.js`) handles all AI processing
- **Frontend**: Vanilla JS with Tailwind CSS - no build step required
- **Deployment**: Zero-config Vercel deployment via `vercel.json` routing
- **Development**: Use `vercel dev` (never `npm start`) for local testing with serverless simulation

### AI Integration Pattern
```javascript
// Core pattern: Structured JSON responses from OpenAI
const prompt = `Respond ONLY with valid JSON, no markdown...`;
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: "json_object" },
  // ...structured prompt for business analysis
});
```

## Critical Code Patterns

### Error Handling with User-Friendly Messages
- **API errors**: Map OpenAI error codes to user-friendly messages (`quota_exceeded`, `rate_limit_exceeded`)
- **Network errors**: Implement retry logic with exponential backoff in `config.js`
- **Validation**: Client-side + server-side validation with specific error responses

### Glass-Morphism UI Framework
- **Base component**: `.glass-card` class for consistent backdrop-blur styling
- **Animations**: Hardware-accelerated with `will-change` properties for performance
- **Responsive**: Tailwind classes with custom CSS animations in `styles.css`

### Modal State Management
```javascript
// Pattern: Modal lifecycle with escape key handling and focus management
ideaModal.classList.remove('hidden');
ideaTitleInput.focus(); // Always focus first input
// Event cleanup on modal close
document.removeEventListener('keydown', escapeHandler);
```

## Development Workflow

### Local Development
```bash
# NEVER use npm start - use Vercel's local environment
vercel dev  # Simulates serverless functions locally
vercel env pull .env.local  # Sync environment variables
```

### Environment Variables
- `OPENAI_API_KEY`: Required for AI functionality
- Store in `.env.local` locally, set via `vercel env add` for production
- **Security**: API key validation happens server-side only

### Deployment Pipeline
```bash
vercel --prod  # Production deployment
vercel env add OPENAI_API_KEY production  # Set secrets
vercel logs    # Debug serverless function issues
```

## File Structure Logic

### Frontend (`/assets/`)
- `app.js`: Modal management, form handling, results rendering
- `config.js`: API client with retry logic and error handling
- `styles.css`: Glass-morphism effects and hardware-accelerated animations

### Backend (`/api/`)
- `validate-idea.js`: Single endpoint for OpenAI integration with comprehensive error handling

### Configuration
- `vercel.json`: Route configuration - static files served directly, API routes to functions
- `package.json`: Minimal dependencies - only `openai` for backend

## Key Integration Points

### OpenAI API Integration
- **Model**: `gpt-4o-mini` (cost-optimized)
- **Token limit**: 2000 max tokens with structured prompts
- **Response format**: Forced JSON with comprehensive business analysis schema
- **Error scenarios**: Handle quota limits, rate limiting, and API key issues gracefully

### Frontend-Backend Communication
```javascript
// Pattern: Environment-aware API base URL
baseURL: window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : window.location.origin
```

### Performance Optimizations
- **CSS**: Hardware acceleration with `transform3d` and `will-change`
- **JS**: Async/await with AbortSignal for timeout handling
- **HTML**: Semantic structure with ARIA labels for accessibility

## Common Debugging Scenarios

### API Issues
- Check `vercel logs` for serverless function errors
- Verify environment variables with `vercel env ls`
- Test API endpoints directly: `curl -X POST /api/validate-idea`

### Local Development Issues
- Always use `vercel dev`, not Live Server or similar
- Check `.env.local` exists and contains `OPENAI_API_KEY`
- Verify Node.js version >= 18.0.0

### UI State Issues
- Modal state managed through `hidden` class on DOM elements
- Results modal dynamically created/destroyed (not hidden/shown)
- Focus management critical for accessibility

## Testing Strategy
- **Manual testing**: Use `vercel dev` with real OpenAI calls
- **Error simulation**: Test with invalid API keys, network failures
- **Responsive testing**: Glass-morphism effects across devices
- **Accessibility**: Keyboard navigation and screen reader testing

When modifying this codebase, maintain the serverless-first architecture, preserve the glass-morphism design system, and ensure all OpenAI integrations include comprehensive error handling.