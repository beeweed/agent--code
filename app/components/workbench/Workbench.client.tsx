import { memo } from 'react';
import { useStore } from '@nanostores/react';
import { renderLogger } from '~/utils/logger';
import { E2BSandboxWrapper } from '~/components/sandbox/E2BSandbox';
import { chatId } from '~/lib/persistence';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const currentChatId = useStore(chatId);

  return (
    chatStarted && (
      <div className="h-full w-full">
        <E2BSandboxWrapper chatStarted={chatStarted} chatId={currentChatId} />
      </div>
    )
  );
});
