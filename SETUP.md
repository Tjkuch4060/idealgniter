# Idealgniter Setup Guide

This guide will help you set up and run Idealgniter with OpenAI integration locally and deploy it to Vercel.

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Vercel account (for deployment)
- Git installed

## Local Development Setup

### 1. Install Dependencies

```bash
cd idealgniter
npm install
```

### 2. Configure Environment Variables

The `.env.local` file has been created with your OpenAI API key. **IMPORTANT SECURITY NOTE:**

⚠️ **Your API key was shared in this conversation. For security, you should:**
1. Go to https://platform.openai.com/api-keys
2. Revoke the current API key
3. Generate a new API key
4. Update `.env.local` with the new key

The `.env.local` file should contain:
```
OPENAI_API_KEY=your-new-api-key-here
NODE_ENV=development
```

### 3. Install Vercel CLI (for local testing)

```bash
npm install -g vercel
```

### 4. Run Development Server

```bash
vercel dev
```

This will start a local development server at `http://localhost:3000` that simulates the Vercel environment.

### 5. Test the Application

1. Open `http://localhost:3000` in your browser
2. Click "Ignite My Idea"
3. Enter a test idea (e.g., "AI-powered fitness app")
4. Submit and wait for the AI analysis

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure environment variables:
   - Add `OPENAI_API_KEY` with your OpenAI API key
4. Click "Deploy"

### Setting Environment Variables on Vercel

1. Go to your project on Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key
   - **Environment:** Production, Preview, Development
4. Click "Save"
5. Redeploy your application

## Project Structure

```
idealgniter/
├── api/                          # Vercel serverless functions
│   └── validate-idea.js         # OpenAI integration endpoint
├── assets/
│   ├── css/
│   │   └── styles.css           # Custom styles and animations
│   └── js/
│       ├── app.js               # Main application logic
│       └── config.js            # API configuration
├── index.html                    # Main HTML file
├── package.json                  # Dependencies
├── vercel.json                   # Vercel configuration
├── .env.local                    # Local environment variables (DO NOT COMMIT)
└── .gitignore                    # Git ignore rules
```

## API Endpoints

### POST /api/validate-idea

Validates a business idea using OpenAI's GPT-4.

**Request Body:**
```json
{
  "title": "Your idea title",
  "description": "Detailed description of your idea"
}
```

**Response:**
```json
{
  "success": true,
  "idea": {
    "title": "Your idea title",
    "description": "Detailed description",
    "analyzedAt": "2024-01-01T00:00:00.000Z"
  },
  "insights": {
    "marketPotential": 85,
    "feasibility": 78,
    "uniqueness": 92,
    "overallScore": 85,
    "summary": "Executive summary...",
    "strengths": ["..."],
    "challenges": ["..."],
    "recommendations": ["..."],
    "targetAudience": "...",
    "competitiveAdvantage": "...",
    "potentialRisks": ["..."],
    "nextSteps": ["..."],
    "estimatedTimeToMarket": "...",
    "fundingRequirement": "..."
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "tokensUsed": 1234,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Troubleshooting

### API Key Issues

**Error:** "Invalid API configuration"
- **Solution:** Verify your OpenAI API key is correct and has sufficient credits

**Error:** "API quota exceeded"
- **Solution:** Check your OpenAI account billing and usage limits

### Local Development Issues

**Error:** "Module not found"
- **Solution:** Run `npm install` to install dependencies

**Error:** "Port 3000 already in use"
- **Solution:** Stop other processes using port 3000 or use a different port: `vercel dev --listen 3001`

### Deployment Issues

**Error:** "Environment variable not found"
- **Solution:** Add `OPENAI_API_KEY` to Vercel environment variables

**Error:** "Function timeout"
- **Solution:** The OpenAI API call might be taking too long. Check your network connection and OpenAI API status

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Rotate API keys regularly** - Generate new keys periodically
3. **Use environment variables** - Never hardcode API keys in code
4. **Monitor API usage** - Set up billing alerts on OpenAI dashboard
5. **Implement rate limiting** - Consider adding rate limiting for production

## Cost Optimization

- **Model Selection:** Currently using `gpt-4o-mini` for cost efficiency
- **Token Limits:** Set to 2000 tokens max per request
- **Caching:** Consider implementing response caching for similar queries
- **Rate Limiting:** Implement user-based rate limiting to prevent abuse

## Next Steps

After successful deployment:

1. Test the live application thoroughly
2. Monitor OpenAI API usage and costs
3. Set up error tracking (e.g., Sentry)
4. Implement analytics (e.g., Google Analytics)
5. Consider adding user authentication (Phase 2)
6. Add export features (Phase 3)

## Support

For issues or questions:
- OpenAI API: https://platform.openai.com/docs
- Vercel Documentation: https://vercel.com/docs
- GitHub Issues: [Your repository URL]

## License

MIT License - See LICENSE file for details
