import { streamText as _streamText, convertToCoreMessages, type ToolInvocation } from 'ai';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getAnthropicModel } from '~/lib/.server/llm/model';
import { getOpenRouterModel } from '~/lib/.server/llm/openrouter';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export interface ProviderConfig {
  apiKey?: string;
  modelId?: string;
}

export function streamText(messages: Messages, env: Env, options?: StreamingOptions, providerConfig?: ProviderConfig) {
  // Use OpenRouter if API key is provided from client, otherwise fall back to Anthropic
  const model =
    providerConfig?.apiKey && providerConfig?.modelId
      ? getOpenRouterModel(providerConfig.apiKey, providerConfig.modelId)
      : getAnthropicModel(getAPIKey(env));

  // Only add Anthropic-specific headers when using Anthropic
  const headers = providerConfig?.apiKey ? {} : { 'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15' };

  return _streamText({
    model,
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers,
    messages: convertToCoreMessages(messages),
    ...options,
  });
}
