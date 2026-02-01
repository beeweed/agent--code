import { useStore } from '@nanostores/react';
import { memo } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { openSettingsDialog, providerStore } from '~/lib/stores/provider';

export const SettingsButton = memo(() => {
  const settings = useStore(providerStore);
  const hasApiKey = Boolean(settings.apiKey);
  const selectedModel = settings.models.find((m) => m.id === settings.selectedModel);

  return (
    <div className="flex items-center gap-2">
      {hasApiKey && selectedModel && (
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-bolt-elements-background-depth-2 text-xs text-bolt-elements-textSecondary">
          <div className="i-ph:cpu text-sm" />
          <span className="max-w-[120px] truncate">{selectedModel.name}</span>
        </div>
      )}
      <IconButton
        icon="i-ph:gear-duotone"
        onClick={openSettingsDialog}
        className={`transition-all ${!hasApiKey ? 'text-bolt-elements-textTertiary animate-pulse' : ''}`}
        title={hasApiKey ? 'Provider Settings' : 'Set up API Key'}
      />
    </div>
  );
});
