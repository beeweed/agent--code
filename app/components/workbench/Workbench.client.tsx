import { memo } from 'react';
import { renderLogger } from '~/utils/logger';
import { E2BSandboxWrapper } from '~/components/sandbox/E2BSandbox';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  return (
    chatStarted && (
      <div className="h-full w-full">
        <E2BSandboxWrapper chatStarted={chatStarted} />
      </div>
    )
  );
});
