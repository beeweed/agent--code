import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback, useEffect, useState } from 'react';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import {
  providerStore,
  isSettingsDialogOpen,
  setApiKey,
  setSelectedModel,
  fetchModels,
  closeSettingsDialog,
  type OpenRouterModel,
} from '~/lib/stores/provider';
import { e2bStore, e2bState } from '~/lib/stores/e2b';
import { classNames } from '~/utils/classNames';

export const SettingsDialog = memo(() => {
  const isOpen = useStore(isSettingsDialogOpen);
  const settings = useStore(providerStore);
  const e2bSettings = useStore(e2bState);

  const [localApiKey, setLocalApiKey] = useState(settings.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [localE2bApiKey, setLocalE2bApiKey] = useState(e2bSettings.apiKey);
  const [showE2bApiKey, setShowE2bApiKey] = useState(false);
  const [e2bSaved, setE2bSaved] = useState(false);

  useEffect(() => {
    setLocalApiKey(settings.apiKey);
  }, [settings.apiKey]);

  useEffect(() => {
    const storedKey = e2bStore.loadApiKey();
    setLocalE2bApiKey(storedKey);
  }, [isOpen]);

  // Auto-fetch models when dialog opens and API key exists
  useEffect(() => {
    if (isOpen && settings.apiKey && settings.models.length === 0 && !hasFetched) {
      fetchModels(settings.apiKey).catch(console.error);
      setHasFetched(true);
    }
  }, [isOpen, settings.apiKey, settings.models.length, hasFetched]);

  const handleSaveApiKey = useCallback(async () => {
    if (localApiKey.trim()) {
      setApiKey(localApiKey.trim());

      try {
        await fetchModels(localApiKey.trim());
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    }
  }, [localApiKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveApiKey();
      }
    },
    [handleSaveApiKey],
  );

  const handleSaveE2bApiKey = useCallback(() => {
    if (localE2bApiKey.trim()) {
      e2bStore.setApiKey(localE2bApiKey.trim());
      setE2bSaved(true);
      setTimeout(() => setE2bSaved(false), 2000);
    }
  }, [localE2bApiKey]);

  const handleE2bKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveE2bApiKey();
      }
    },
    [handleSaveE2bApiKey],
  );

  const formatPrice = (price: string) => {
    const num = parseFloat(price);

    if (num === 0) {
      return 'Free';
    }

    return `$${(num * 1000000).toFixed(2)}/M`;
  };

  const getSelectedModelInfo = (): OpenRouterModel | undefined => {
    return settings.models.find((m) => m.id === settings.selectedModel);
  };

  const selectedModelInfo = getSelectedModelInfo();

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogRoot open={isOpen} onOpenChange={(open) => !open && closeSettingsDialog()}>
          <Dialog className="max-w-[600px] w-[90vw]" onClose={closeSettingsDialog}>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <div className="i-ph:gear-duotone text-xl text-bolt-elements-textSecondary" />
                <span>Provider Settings</span>
              </div>
            </DialogTitle>
            <DialogDescription className="space-y-6">
              {/* API Key Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-bolt-elements-textSecondary">OpenRouter API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="sk-or-v1-..."
                      className={classNames(
                        'w-full px-3 py-2 pr-10 rounded-lg',
                        'bg-bolt-elements-background-depth-3',
                        'border border-bolt-elements-borderColor',
                        'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
                        'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus',
                        'transition-all duration-150',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                    >
                      <div className={showApiKey ? 'i-ph:eye-slash' : 'i-ph:eye'} />
                    </button>
                  </div>
                  <DialogButton type="primary" onClick={handleSaveApiKey}>
                    {settings.isLoadingModels ? <div className="i-svg-spinners:90-ring-with-bg" /> : 'Save & Fetch'}
                  </DialogButton>
                </div>
                <p className="text-xs text-bolt-elements-textTertiary">
                  Get your API key from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary underline transition-colors"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>

              {/* E2B API Key Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-bolt-elements-textSecondary">
                  E2B Sandbox API Key
                  {e2bSettings.isConnected && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showE2bApiKey ? 'text' : 'password'}
                      value={localE2bApiKey}
                      onChange={(e) => setLocalE2bApiKey(e.target.value)}
                      onKeyDown={handleE2bKeyDown}
                      placeholder="e2b_..."
                      className={classNames(
                        'w-full px-3 py-2 pr-10 rounded-lg',
                        'bg-bolt-elements-background-depth-3',
                        'border border-bolt-elements-borderColor',
                        'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
                        'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus',
                        'transition-all duration-150',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowE2bApiKey(!showE2bApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                    >
                      <div className={showE2bApiKey ? 'i-ph:eye-slash' : 'i-ph:eye'} />
                    </button>
                  </div>
                  <DialogButton type="primary" onClick={handleSaveE2bApiKey}>
                    {e2bSaved ? (
                      <div className="i-ph:check text-green-400" />
                    ) : (
                      'Save'
                    )}
                  </DialogButton>
                </div>
                <p className="text-xs text-bolt-elements-textTertiary">
                  Get your E2B API key from{' '}
                  <a
                    href="https://e2b.dev/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary underline transition-colors"
                  >
                    e2b.dev/dashboard
                  </a>
                  . The sandbox will be created automatically when you start a chat.
                </p>
                {e2bSettings.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2"
                  >
                    <div className="i-ph:warning-circle" />
                    {e2bSettings.error}
                  </motion.div>
                )}
              </div>

              {/* Error Message */}
              {settings.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
                >
                  <div className="i-ph:warning-circle text-lg" />
                  {settings.error}
                </motion.div>
              )}

              {/* Model Selection Section */}
              {settings.models.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <label className="block text-sm font-medium text-bolt-elements-textSecondary">
                    Select Model ({settings.models.length} available)
                  </label>
                  <select
                    value={settings.selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={classNames(
                      'w-full px-3 py-2 rounded-lg',
                      'bg-bolt-elements-background-depth-3',
                      'border border-bolt-elements-borderColor',
                      'text-bolt-elements-textPrimary',
                      'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus',
                      'transition-all duration-150',
                      'cursor-pointer',
                    )}
                  >
                    {settings.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>

                  {/* Selected Model Info */}
                  {selectedModelInfo && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-bolt-elements-textPrimary">{selectedModelInfo.name}</h4>
                          <p className="text-xs text-bolt-elements-textTertiary mt-1">{selectedModelInfo.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-bolt-elements-background-depth-4 text-bolt-elements-textSecondary">
                            {selectedModelInfo.context_length.toLocaleString()} ctx
                          </span>
                        </div>
                      </div>

                      {selectedModelInfo.description && (
                        <p className="text-sm text-bolt-elements-textSecondary line-clamp-2">
                          {selectedModelInfo.description}
                        </p>
                      )}

                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="text-bolt-elements-textTertiary">Input: </span>
                          <span className="text-bolt-elements-textSecondary">
                            {formatPrice(selectedModelInfo.pricing.prompt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-bolt-elements-textTertiary">Output: </span>
                          <span className="text-bolt-elements-textSecondary">
                            {formatPrice(selectedModelInfo.pricing.completion)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Empty State */}
              {!settings.apiKey && settings.models.length === 0 && (
                <div className="text-center py-8 text-bolt-elements-textTertiary">
                  <div className="i-ph:key text-4xl mx-auto mb-3 opacity-50" />
                  <p>Enter your OpenRouter API key to get started</p>
                </div>
              )}
            </DialogDescription>
          </Dialog>
        </DialogRoot>
      )}
    </AnimatePresence>
  );
});
