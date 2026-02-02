import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
}

interface ModelsResponse {
  data: OpenRouterModel[];
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { apiKey } = await request.json<{ apiKey: string }>();

    if (!apiKey) {
      return json({ error: 'API key is required' }, { status: 400 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);

      if (response.status === 401) {
        return json({ error: 'Invalid API key' }, { status: 401 });
      }

      return json({ error: 'Failed to fetch models from OpenRouter' }, { status: response.status });
    }

    const data: ModelsResponse = await response.json();

    // Sort models by name and filter to only include text generation models
    const models = data.data
      .filter(
        (model) =>
          model.architecture?.output_modalities?.includes('text') &&
          model.architecture?.input_modalities?.includes('text'),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
