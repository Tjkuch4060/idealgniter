import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS headers for frontend requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 5,           // Max requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
};

// In-memory rate limit store (for production, use Redis or Vercel KV)
const rateLimitStore = new Map();

/**
 * Simple rate limiter middleware
 * Tracks requests by IP address
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(identifier) || [];

  // Filter out requests outside the time window
  const recentRequests = userRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT.windowMs
  );

  // Check if user exceeded rate limit
  if (recentRequests.length >= RATE_LIMIT.maxRequests) {
    const oldestRequest = Math.min(...recentRequests);
    const resetTime = new Date(oldestRequest + RATE_LIMIT.windowMs);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((oldestRequest + RATE_LIMIT.windowMs - now) / 1000)
    };
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);

  // Clean up old entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const valid = timestamps.filter(t => now - t < RATE_LIMIT.windowMs);
      if (valid.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, valid);
      }
    }
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - recentRequests.length,
    resetTime: new Date(recentRequests[0] + RATE_LIMIT.windowMs)
  };
}

/**
 * Fetch GitHub repository metadata for enhanced AI analysis
 * Uses public GitHub API (no authentication needed for public repos)
 */
async function fetchGitHubRepoData(repoUrl) {
  try {
    // Extract owner/repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) {
      return { error: 'Invalid GitHub URL format' };
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');
    
    // Parallel fetch: repo metadata, README, and languages
    const [repoResponse, readmeResponse, languagesResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Idealgniter-App'
        }
      }),
      fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/readme`, {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Idealgniter-App'
        }
      }),
      fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/languages`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Idealgniter-App'
        }
      })
    ]);

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return { error: 'Repository not found or is private' };
      }
      return { error: 'Failed to fetch repository data' };
    }

    const repoData = await repoResponse.json();
    const readmeText = readmeResponse.ok ? await readmeResponse.text() : null;
    const languagesData = languagesResponse.ok ? await languagesResponse.json() : {};

    return {
      name: repoData.name,
      description: repoData.description || 'No description provided',
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      openIssues: repoData.open_issues_count,
      primaryLanguage: repoData.language,
      languages: Object.keys(languagesData),
      created: repoData.created_at,
      updated: repoData.updated_at,
      topics: repoData.topics || [],
      license: repoData.license?.name || 'No license',
      readme: readmeText ? readmeText.substring(0, 2500) : null, // Limit for token management
      url: repoData.html_url
    };
  } catch (error) {
    console.error('GitHub API error:', error);
    return { error: 'Failed to connect to GitHub API' };
  }
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting check
  const identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rateLimitResult = checkRateLimit(identifier);

  // Add rate limit headers to response
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.maxRequests);
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());

  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: `Rate limit exceeded. You can make ${RATE_LIMIT.maxRequests} requests per hour. Please try again later.`,
      type: 'rate_limit',
      retryAfter: rateLimitResult.retryAfter,
      resetTime: rateLimitResult.resetTime.toISOString()
    });
  }

  try {
    const { title, description, githubRepo } = req.body;

    // Validate input
    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: title and description' 
      });
    }

    if (title.length < 3 || description.length < 10) {
      return res.status(400).json({ 
        error: 'Title must be at least 3 characters and description at least 10 characters' 
      });
    }

    // Fetch GitHub repository data if URL provided
    let repoContext = '';
    let repoData = null;
    
    if (githubRepo && githubRepo.trim()) {
      repoData = await fetchGitHubRepoData(githubRepo.trim());
      
      if (repoData.error) {
        // Don't fail the request, just skip repo analysis
        console.warn('GitHub fetch warning:', repoData.error);
      } else {
        repoContext = `

EXISTING GITHUB REPOSITORY CONTEXT:
Repository: ${repoData.name}
Description: ${repoData.description}
Primary Language: ${repoData.primaryLanguage || 'Not specified'}
Tech Stack: ${repoData.languages.join(', ') || 'Not available'}
Activity: ${repoData.stars} stars, ${repoData.forks} forks, ${repoData.openIssues} open issues
Topics/Tags: ${repoData.topics.join(', ') || 'None'}
License: ${repoData.license}
Created: ${new Date(repoData.created).toLocaleDateString()}
Last Updated: ${new Date(repoData.updated).toLocaleDateString()}

README Summary:
${repoData.readme || 'README not available'}

INSTRUCTIONS: Analyze how the existing codebase aligns with the stated business idea. Provide specific insights about:
1. Whether the current implementation matches the business vision
2. Technical debt or architectural improvements needed
3. Missing features or market opportunities based on the code
4. Competitive advantages visible in the codebase`;
      }
    }

    // Create comprehensive prompt for OpenAI
    const prompt = `You are an expert business analyst and startup advisor. Analyze the following business idea and provide a comprehensive validation report.${repoContext}

Business Idea Title: "${title}"
Description: "${description}"

Please provide a detailed analysis in the following JSON format (respond ONLY with valid JSON, no markdown or additional text):

{
  "marketPotential": <number 0-100>,
  "feasibility": <number 0-100>,
  "uniqueness": <number 0-100>,
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "strengths": [
    "<strength 1>",
    "<strength 2>",
    "<strength 3>",
    "<strength 4>"
  ],
  "challenges": [
    "<challenge 1>",
    "<challenge 2>",
    "<challenge 3>",
    "<challenge 4>"
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>",
    "<actionable recommendation 4>",
    "<actionable recommendation 5>"
  ],
  "targetAudience": "<description of ideal target audience>",
  "competitiveAdvantage": "<key differentiators and competitive advantages>",
  "potentialRisks": [
    "<risk 1>",
    "<risk 2>",
    "<risk 3>"
  ],
  "nextSteps": [
    "<immediate next step 1>",
    "<immediate next step 2>",
    "<immediate next step 3>"
  ],
  "estimatedTimeToMarket": "<realistic timeline estimate>",
  "fundingRequirement": "<estimated funding needs and stage>"${repoContext ? ',\n  "repoAnalysis": "<3-4 sentences about how the existing GitHub codebase aligns with the business idea, technical strengths/weaknesses, and implementation recommendations>"' : ''}
}

Scoring Guidelines:
- Market Potential (0-100): Size of addressable market, demand level, growth potential
- Feasibility (0-100): Technical complexity, resource requirements, execution difficulty
- Uniqueness (0-100): Innovation level, differentiation from competitors, IP potential
- Overall Score (0-100): Weighted average considering all factors

Be honest, constructive, and specific in your analysis. Focus on actionable insights.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business analyst specializing in startup validation and market analysis. Provide detailed, actionable insights in valid JSON format only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const aiResponse = completion.choices[0].message.content;
    let insights;
    
    try {
      insights = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', aiResponse);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    const requiredFields = ['marketPotential', 'feasibility', 'uniqueness', 'strengths', 'challenges', 'recommendations'];
    const missingFields = requiredFields.filter(field => !(field in insights));
    
    if (missingFields.length > 0) {
      console.error('Missing fields in AI response:', missingFields);
      throw new Error('Incomplete analysis from AI');
    }

    // Add metadata
    const response = {
      success: true,
      idea: {
        title,
        description,
        analyzedAt: new Date().toISOString()
      },
      insights: {
        ...insights,
        // Ensure scores are within valid range
        marketPotential: Math.min(100, Math.max(0, insights.marketPotential)),
        feasibility: Math.min(100, Math.max(0, insights.feasibility)),
        uniqueness: Math.min(100, Math.max(0, insights.uniqueness)),
        overallScore: insights.overallScore || Math.round(
          (insights.marketPotential + insights.feasibility + insights.uniqueness) / 3
        )
      },
      metadata: {
        model: completion.model,
        tokensUsed: completion.usage.total_tokens,
        timestamp: new Date().toISOString()
      }
    };

    // Return successful response with repo analysis flag
    return res.status(200).json({
      ...response,
      repoAnalyzed: !!(repoData && !repoData.error),
      repoUrl: repoData?.url || null
    });

  } catch (error) {
    console.error('Error in validate-idea API:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: 'API quota exceeded. Please try again later.',
        type: 'quota_exceeded'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid API configuration. Please contact support.',
        type: 'auth_error'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        type: 'rate_limit'
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Failed to analyze idea. Please try again.',
      type: 'server_error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
