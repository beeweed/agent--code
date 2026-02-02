import { atom, map } from 'nanostores';

export interface OpenRouterModel {
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

export interface ProviderSettings {
  apiKey: string;
  selectedModel: string;
  models: OpenRouterModel[];
  isLoadingModels: boolean;
  error: string | null;
}

const STORAGE_KEY = 'bolt_provider_settings';

function loadFromStorage(): Partial<ProviderSettings> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        apiKey: parsed.apiKey || '',
        selectedModel: parsed.selectedModel || '',
      };
    }
  } catch (e) {
    console.error('Failed to load provider settings from storage:', e);
  }

  return {};
}

function saveToStorage(settings: Partial<ProviderSettings>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const existing = loadFromStorage();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...existing,
        apiKey: settings.apiKey,
        selectedModel: settings.selectedModel,
      }),
    );
  } catch (e) {
    console.error('Failed to save provider settings to storage:', e);
  }
}

const initialSettings = loadFromStorage();

export const providerStore = map<ProviderSettings>({
  apiKey: initialSettings.apiKey || '',
  selectedModel: initialSettings.selectedModel || 'anthropic/claude-3.5-sonnet',
  models: [],
  isLoadingModels: false,
  error: null,
});

export const isSettingsDialogOpen = atom<boolean>(false);

export function setApiKey(apiKey: string) {
  providerStore.setKey('apiKey', apiKey);
  providerStore.setKey('error', null);
  saveToStorage({ ...providerStore.get(), apiKey });
}

export function setSelectedModel(modelId: string) {
  providerStore.setKey('selectedModel', modelId);
  saveToStorage({ ...providerStore.get(), selectedModel: modelId });
}

export function setModels(models: OpenRouterModel[]) {
  providerStore.setKey('models', models);
}

export function setLoadingModels(loading: boolean) {
  providerStore.setKey('isLoadingModels', loading);
}

export function setError(error: string | null) {
  providerStore.setKey('error', error);
}

export function openSettingsDialog() {
  isSettingsDialogOpen.set(true);
}

export function closeSettingsDialog() {
  isSettingsDialogOpen.set(false);
}

export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  setLoadingModels(true);
  setError(null);

  try {
    const response = await fetch('/api/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errorData.error || 'Failed to fetch models');
    }

    const data = (await response.json()) as { models: OpenRouterModel[] };
    const models = data.models;
    setModels(models);

    // Auto-select first model if none selected
    const currentSettings = providerStore.get();

    if (!currentSettings.selectedModel && models.length > 0) {
      setSelectedModel(models[0].id);
    }

    return models;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch models';
    setError(message);
    throw error;
  } finally {
    setLoadingModels(false);
  }
}
