# Idealgniter Deployment Guide

Complete guide for deploying Idealgniter to Vercel with OpenAI integration.

## Pre-Deployment Checklist

- [ ] OpenAI API key obtained and tested
- [ ] Git repository initialized
- [ ] All dependencies installed (`npm install`)
- [ ] Local testing completed (`vercel dev`)
- [ ] Environment variables documented
- [ ] `.gitignore` configured properly

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

#### Step 3: Deploy to Production

```bash
# From the idealgniter directory
cd idealgniter

# Deploy to production
vercel --prod
```

#### Step 4: Set Environment Variables

```bash
# Add OpenAI API key
vercel env add OPENAI_API_KEY production

# When prompted, paste your OpenAI API key
```

#### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

### Method 2: Vercel Dashboard (Git Integration)

#### Step 1: Push to Git Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit with OpenAI integration"

# Add remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/idealgniter.git

# Push to main branch
git push -u origin main
```

#### Step 2: Import to Vercel

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your Git provider (GitHub, GitLab, or Bitbucket)
4. Choose the `idealgniter` repository
5. Configure project settings:
   - **Framework Preset:** Other
   - **Root Directory:** `idealgniter` (if in subdirectory)
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty

#### Step 3: Configure Environment Variables

In the Vercel import screen:

1. Click "Environment Variables"
2. Add variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key
   - **Environments:** Check all (Production, Preview, Development)
3. Click "Add"

#### Step 4: Deploy

Click "Deploy" and wait for the deployment to complete.

### Method 3: Vercel GitHub Integration (Automatic Deployments)

#### Step 1: Connect GitHub Repository

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Authorize Vercel to access your repository

#### Step 2: Configure Build Settings

```json
// vercel.json is already configured
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ]
}
```

#### Step 3: Set Up Environment Variables

1. Go to Project Settings → Environment Variables
2. Add `OPENAI_API_KEY`
3. Save and redeploy

#### Step 4: Enable Automatic Deployments

- **Production:** Deploys from `main` branch automatically
- **Preview:** Deploys from pull requests automatically

## Post-Deployment Configuration

### 1. Verify Deployment

Visit your deployment URL (e.g., `https://idealgniter.vercel.app`)

Test the application:
1. Click "Ignite My Idea"
2. Enter a test idea
3. Verify AI analysis works correctly

### 2. Custom Domain Setup (Optional)

#### Add Custom Domain

1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `idealgniter.com`)
4. Follow DNS configuration instructions

#### Configure DNS

Add these records to your DNS provider:

**For root domain:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. SSL Certificate

Vercel automatically provisions SSL certificates for all domains. No additional configuration needed.

### 4. Environment Variables Management

#### View Environment Variables

```bash
vercel env ls
```

#### Add New Environment Variable

```bash
vercel env add VARIABLE_NAME production
```

#### Remove Environment Variable

```bash
vercel env rm VARIABLE_NAME production
```

#### Pull Environment Variables Locally

```bash
vercel env pull .env.local
```

## Monitoring and Maintenance

### 1. View Deployment Logs

```bash
# View latest deployment logs
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]
```

### 2. Monitor API Usage

**OpenAI Dashboard:**
- Visit https://platform.openai.com/usage
- Monitor token usage and costs
- Set up billing alerts

**Vercel Analytics:**
- Go to Project → Analytics
- Monitor function invocations
- Track response times

### 3. Error Tracking

Add error tracking to your application:

```javascript
// Example: Sentry integration
// Add to assets/js/config.js
if (window.location.hostname !== 'localhost') {
  // Initialize error tracking
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production'
  });
}
```

## Rollback and Version Control

### Rollback to Previous Deployment

```bash
# List deployments
vercel ls

# Promote a previous deployment to production
vercel promote [deployment-url]
```

### Alias Management

```bash
# Create alias
vercel alias set [deployment-url] idealgniter.com

# Remove alias
vercel alias rm idealgniter.com
```

## Performance Optimization

### 1. Enable Caching

Add caching headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Optimize Function Cold Starts

- Keep dependencies minimal
- Use `gpt-4o-mini` for faster responses
- Implement response caching

### 3. Monitor Function Performance

```bash
# View function metrics
vercel inspect [deployment-url]
```

## Security Hardening

### 1. Rate Limiting

Implement rate limiting in `api/validate-idea.js`:

```javascript
// Example: Simple rate limiting
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimit.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 5) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}
```

### 2. Input Validation

Already implemented in the API endpoint:
- Title: minimum 3 characters
- Description: minimum 10 characters
- Maximum length limits

### 3. CORS Configuration

Update `api/validate-idea.js` if you need specific CORS rules:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## Troubleshooting Deployment Issues

### Issue: "Environment variable not found"

**Solution:**
```bash
vercel env add OPENAI_API_KEY production
vercel --prod
```

### Issue: "Function timeout"

**Solution:**
- Increase timeout in `vercel.json`:
```json
{
  "functions": {
    "api/validate-idea.js": {
      "maxDuration": 60
    }
  }
}
```

### Issue: "Build failed"

**Solution:**
```bash
# Clear cache and redeploy
vercel --prod --force
```

### Issue: "API returns 500 error"

**Solution:**
1. Check Vercel function logs: `vercel logs`
2. Verify OpenAI API key is valid
3. Check OpenAI API status: https://status.openai.com

## Continuous Integration/Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Deploy to Vercel
        run: |
          vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Cost Management

### OpenAI API Costs

**Current Configuration:**
- Model: `gpt-4o-mini`
- Max tokens: 2000 per request
- Estimated cost: ~$0.01-0.02 per validation

**Cost Optimization Tips:**
1. Set usage limits in OpenAI dashboard
2. Implement caching for similar queries
3. Add rate limiting per user
4. Monitor usage regularly

### Vercel Costs

**Free Tier Includes:**
- 100 GB bandwidth
- 100 GB-hours serverless function execution
- Unlimited deployments

**Upgrade if needed:**
- Pro: $20/month
- Enterprise: Custom pricing

## Backup and Recovery

### 1. Backup Environment Variables

```bash
# Export environment variables
vercel env pull .env.backup
```

### 2. Backup Deployment Configuration

Keep `vercel.json` in version control.

### 3. Database Backup (Future)

When you add database in Phase 2:
- Set up automated backups
- Test restore procedures
- Document recovery steps

## Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain (optional)
4. ✅ Implement analytics
5. ✅ Plan for Phase 2 (User Authentication)
6. ✅ Plan for Phase 3 (Export Features)

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Vercel Support:** https://vercel.com/support
- **OpenAI Support:** https://help.openai.com

## Deployment Checklist

- [ ] Code tested locally
- [ ] Environment variables configured
- [ ] Git repository pushed
- [ ] Vercel project created
- [ ] Production deployment successful
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] API usage monitored
- [ ] Documentation updated
- [ ] Team notified

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Production URL:** _____________
**Notes:** _____________
