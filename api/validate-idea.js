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

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description } = req.body;

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

    // Create comprehensive prompt for OpenAI
    const prompt = `You are an expert business analyst and startup advisor. Analyze the following business idea and provide a comprehensive validation report.

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
  "fundingRequirement": "<estimated funding needs and stage>"
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

    // Return successful response
    return res.status(200).json(response);

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
