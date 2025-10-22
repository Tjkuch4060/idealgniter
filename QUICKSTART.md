# 🚀 Idealgniter Quick Start Guide

Get up and running with Idealgniter in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Step 1: Install Dependencies

```bash
cd idealgniter
npm install
```

## Step 2: Configure API Key

⚠️ **IMPORTANT SECURITY NOTE:** 
Your OpenAI API key was shared in our conversation. For security, you should:
1. Go to https://platform.openai.com/api-keys
2. **Revoke the current API key**
3. **Generate a new API key**
4. Update `.env.local` with the new key

Edit `.env.local`:
```bash
OPENAI_API_KEY=your-new-api-key-here
```

## Step 3: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 4: Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## Step 5: Test the Application

1. Open http://localhost:3000 in your browser
2. Click **"Ignite My Idea"**
3. Enter a test idea:
   - **Title:** "AI Fitness Coach"
   - **Description:** "A mobile app that uses AI to create personalized workout plans based on user goals, fitness level, and available equipment."
4. Click **"Validate Idea"**
5. Wait 10-30 seconds for AI analysis
6. Review the comprehensive results!

## What You Should See

✅ **Loading State:** "Analyzing with AI..." spinner
✅ **Results Modal:** Comprehensive analysis with:
- Overall Score (0-100%)
- Market Potential, Feasibility, Uniqueness scores
- Executive Summary
- Target Audience
- Competitive Advantage
- Strengths & Challenges
- Recommendations
- Next Steps
- Time to Market & Funding estimates

## Common Issues

### "Module not found" error
```bash
npm install
```

### "Environment variable not found"
Check that `.env.local` exists and contains your OpenAI API key

### Port 3000 already in use
```bash
vercel dev --listen 3001
```

### API returns 401 error
Your OpenAI API key is invalid or has no credits. Check:
- Key is correct in `.env.local`
- You have credits in your OpenAI account

## Deploy to Production

### Option 1: Quick Deploy
```bash
npm run deploy
```

### Option 2: With Environment Variables
```bash
# Add your API key to Vercel
vercel env add OPENAI_API_KEY production

# Deploy
npm run deploy
```

## Next Steps

1. ✅ Test locally with different ideas
2. ✅ Deploy to Vercel
3. ✅ Share with friends for feedback
4. 📖 Read [SETUP.md](SETUP.md) for detailed configuration
5. 📖 Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options
6. 📖 Read [TESTING.md](TESTING.md) for comprehensive testing

## Useful Commands

```bash
# Start development server
npm run dev

# Deploy to production
npm run deploy

# Deploy preview (test deployment)
npm run deploy:preview

# View deployment logs
npm run logs

# Pull environment variables from Vercel
npm run env:pull

# Add environment variable to Vercel
npm run env:add
```

## Project Structure

```
idealgniter/
├── index.html                 # Main page
├── api/
│   └── validate-idea.js      # OpenAI API integration
├── assets/
│   ├── css/
│   │   └── styles.css        # Styles
│   └── js/
│       ├── app.js            # Main app logic
│       └── config.js         # API configuration
├── .env.local                # Your API key (DO NOT COMMIT!)
└── package.json              # Dependencies
```

## Cost Estimate

- **Per validation:** ~$0.01-0.02
- **100 validations:** ~$1-2
- **Vercel hosting:** Free tier (sufficient for testing)

## Support

Need help? Check these resources:
- 📖 [SETUP.md](SETUP.md) - Detailed setup guide
- 📖 [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- 📖 [TESTING.md](TESTING.md) - Testing guide
- 🌐 [OpenAI Docs](https://platform.openai.com/docs)
- 🌐 [Vercel Docs](https://vercel.com/docs)

## What's Next?

### Phase 2: User Authentication (Coming Soon)
- User accounts with Firebase
- Save and track your ideas
- View validation history
- Compare multiple ideas

### Phase 3: Export & Visualization (Coming Soon)
- PDF report generation
- Interactive charts and graphs
- Email delivery
- Social sharing

---

**Ready to ignite your ideas? Let's go! 🚀**

```bash
npm run dev
