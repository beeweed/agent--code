import { createOpenAI } from '@ai-sdk/openai';

export function getOpenRouterModel(apiKey: string, modelId: string) {
  const openrouter = createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  return openrouter(modelId);
}
