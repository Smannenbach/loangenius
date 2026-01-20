import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI Model Router - Intelligent model selection for optimal results
 * 
 * Available Models (2026):
 * - OpenAI: gpt-5.2, gpt-4o, o1-preview (reasoning)
 * - Anthropic: claude-opus-4.5, claude-sonnet-4
 * - Google: gemini-3.0-ultra, gemini-3.0-pro
 * - xAI: grok-3
 * - DeepSeek: deepseek-r1 (reasoning)
 */

const OPENAI_API_KEY = Deno.env.get('OpenAI_API_Key');
const ANTHROPIC_API_KEY = Deno.env.get('Anthropic_API_Key');
const GOOGLE_API_KEY = Deno.env.get('Google_Gemini_API_Key');
const XAI_API_KEY = Deno.env.get('xAI_Grok_API_Key');
const DEEPSEEK_API_KEY = Deno.env.get('Deepseek_API_Key');

// Task categories and their optimal model assignments
// Note: Anthropic thinking mode disabled to avoid message format complexity
const TASK_MODEL_MAP = {
  // Complex reasoning & analysis - use capable models without thinking
  'underwriting_analysis': { provider: 'anthropic', model: 'claude-sonnet-4-20250514', thinking: false },
  'compliance_check': { provider: 'anthropic', model: 'claude-sonnet-4-20250514', thinking: false },
  'risk_assessment': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'document_analysis': { provider: 'anthropic', model: 'claude-sonnet-4-20250514', thinking: false },
  'fraud_detection': { provider: 'openai', model: 'gpt-4o', thinking: false },
  
  // Strategic recommendations - use premium models
  'lender_matching': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'deal_strategy': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'pricing_optimization': { provider: 'openai', model: 'gpt-4o', thinking: false },
  
  // Data extraction & structured output
  'data_extraction': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'mismo_generation': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'report_generation': { provider: 'openai', model: 'gpt-4o', thinking: false },
  
  // Conversational & general assistance
  'chat_assistant': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'email_generation': { provider: 'openai', model: 'gpt-4o', thinking: false },
  'summarization': { provider: 'openai', model: 'gpt-4o', thinking: false },
  
  // Fast operations - use efficient models
  'classification': { provider: 'openai', model: 'gpt-4o-mini', thinking: false },
  'simple_query': { provider: 'openai', model: 'gpt-4o-mini', thinking: false },
  
  // Default fallback
  'default': { provider: 'openai', model: 'gpt-4o', thinking: false }
};

/**
 * Call OpenAI API
 */
async function callOpenAI(model, messages, options = {}) {
  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');
  
  const body = {
    model,
    messages,
    temperature: isReasoningModel ? 1 : (options.temperature || 0.3),
    max_tokens: options.max_tokens || 4096,
  };
  
  // Add response format for JSON if needed
  if (options.json_response && !isReasoningModel) {
    body.response_format = { type: 'json_object' };
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content,
    model: data.model,
    usage: data.usage,
    provider: 'openai'
  };
}

/**
 * Call Anthropic API (standard mode, no extended thinking)
 */
async function callAnthropic(model, messages, options = {}) {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const body = {
    model,
    max_tokens: options.max_tokens || 4096,
    system: systemMessage,
    messages: userMessages,
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // Extract text content from response
  let content = '';
  for (const block of data.content || []) {
    if (block.type === 'text') {
      content = block.text;
    }
  }
  
  return {
    content,
    model: data.model,
    usage: data.usage,
    provider: 'anthropic'
  };
}

/**
 * Call Google Gemini API
 */
async function callGemini(model, messages, options = {}) {
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  
  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.max_tokens || 8192,
    }
  };
  
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  // SECURITY FIX: Use POST body instead of URL query param for API key
  // Note: Gemini API requires key in URL, but we'll add header as well
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text,
    model,
    usage: data.usageMetadata,
    provider: 'google'
  };
}

/**
 * Route request to optimal AI model based on task type
 */
async function routeToOptimalModel(taskType, messages, options = {}) {
  const config = TASK_MODEL_MAP[taskType] || TASK_MODEL_MAP['default'];
  
  // Allow override via options
  const provider = options.force_provider || config.provider;
  const model = options.force_model || config.model;
  const useThinking = options.thinking !== undefined ? options.thinking : config.thinking;
  
  console.log(`AI Router: Task=${taskType}, Provider=${provider}, Model=${model}, Thinking=${useThinking}`);
  
  switch (provider) {
    case 'anthropic':
      if (!ANTHROPIC_API_KEY) {
        console.log('Anthropic key not available, falling back to OpenAI');
        return callOpenAI('gpt-4o', messages, options);
      }
      return callAnthropic(model, messages, { ...options, thinking: useThinking });
      
    case 'google':
      if (!GOOGLE_API_KEY) {
        console.log('Google key not available, falling back to OpenAI');
        return callOpenAI('gpt-4o', messages, options);
      }
      return callGemini(model, messages, options);
      
    case 'openai':
    default:
      return callOpenAI(model, messages, options);
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      task_type = 'default',
      messages,
      system_prompt,
      user_prompt,
      options = {}
    } = await req.json();

    // Build messages array
    let aiMessages = messages;
    if (!aiMessages && (system_prompt || user_prompt)) {
      aiMessages = [];
      if (system_prompt) aiMessages.push({ role: 'system', content: system_prompt });
      if (user_prompt) aiMessages.push({ role: 'user', content: user_prompt });
    }

    if (!aiMessages || aiMessages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Route to optimal model
    const result = await routeToOptimalModel(task_type, aiMessages, options);

    // Parse JSON if requested
    if (options.json_response && result.content) {
      try {
        result.parsed = JSON.parse(result.content);
      } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result.parsed = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }
    }

    return Response.json({
      success: true,
      task_type,
      ...result
    });

  } catch (error) {
    console.error('AI Model Router error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});