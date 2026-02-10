import { map, type MapStore } from 'nanostores';
import type { BoltAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import type { FilesStore } from '~/lib/stores/files';
import { e2bStore } from '~/lib/stores/e2b';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

export class ActionRunner {
  #filesStore: FilesStore;
  #currentExecutionPromise: Promise<void> = Promise.resolve();

  actions: ActionsMap = map({});

  constructor(filesStore: FilesStore) {
    this.#filesStore = filesStore;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return;
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: true });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });
  }

  async #executeAction(actionId: string) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          // Execute shell command in E2B sandbox terminal
          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
      }

      this.#updateAction(actionId, { status: action.abortSignal.aborted ? 'aborted' : 'complete' });
    } catch (error) {
      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    try {
      // Write file to E2B sandbox if connected
      if (e2bStore.isReady()) {
        const normalizedPath = action.filePath.startsWith('/home/user/')
          ? action.filePath
          : `/home/user/${action.filePath.replace(/^\//, '')}`;

        // Create parent directories
        const pathParts = normalizedPath.split('/').filter(Boolean);
        let currentPath = '';

        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath += '/' + pathParts[i];

          if (currentPath.startsWith('/home/user')) {
            await e2bStore.makeDirectory(currentPath);
          }
        }

        const success = await e2bStore.writeFile(normalizedPath, action.content);

        if (success) {
          logger.debug(`File written to E2B sandbox: ${normalizedPath}`);
        } else {
          logger.warn(`Failed to write file to E2B sandbox: ${normalizedPath}`);
        }
      } else {
        logger.warn('E2B sandbox not connected - file will only be stored locally');
      }

      // Also add to local browser storage as backup
      this.#filesStore.addFile(action.filePath, action.content);
      logger.debug(`File written to local storage: ${action.filePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
      throw error;
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    try {
      if (e2bStore.isReady()) {
        // Execute command in E2B sandbox terminal
        logger.info(`Executing shell command in E2B sandbox: ${action.content}`);
        await e2bStore.runCommand(action.content);
        logger.debug(`Shell command executed: ${action.content}`);
      } else {
        // If E2B is not connected, just log the command
        logger.info(`Shell command (E2B not connected - for reference): ${action.content}`);
      }
    } catch (error) {
      logger.error('Failed to execute shell command\n\n', error);
      throw error;
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }
}
