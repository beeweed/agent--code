import { atom, map } from 'nanostores';

export interface E2BState {
  apiKey: string;
  isConnected: boolean;
  isConnecting: boolean;
  sandboxId: string | null;
  error: string | null;
  isSyncing: boolean;
  autoCreateTriggered: boolean;
}

const initialState: E2BState = {
  apiKey: '',
  isConnected: false,
  isConnecting: false,
  sandboxId: null,
  error: null,
  isSyncing: false,
  autoCreateTriggered: false,
};

export const e2bState = map<E2BState>(initialState);

export const e2bApiKey = atom<string>('');

// Sandbox instance reference (will be set by E2BSandbox component)
let sandboxInstance: any = null;
let terminalSendInput: ((terminalId: string, data: string) => Promise<void>) | null = null;
let fileWriteCallback: ((path: string, content: string) => Promise<boolean>) | null = null;
let makeDirectoryCallback: ((path: string) => Promise<boolean>) | null = null;
let runCommandCallback: ((command: string) => Promise<void>) | null = null;
let createSandboxCallback: (() => Promise<any>) | null = null;
let activeTerminalId: string | null = null;

// Queue for pending operations when sandbox is not ready yet
interface PendingOperation {
  type: 'writeFile' | 'makeDirectory' | 'runCommand';
  path?: string;
  content?: string;
  command?: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

const pendingOperations: PendingOperation[] = [];
let isProcessingQueue = false;

// Process queued operations
const processQueue = async () => {
  if (isProcessingQueue || pendingOperations.length === 0) {
    return;
  }

  if (!fileWriteCallback || !makeDirectoryCallback) {
    return;
  }

  isProcessingQueue = true;
  console.log(`[E2B Store] Processing ${pendingOperations.length} queued operations`);

  while (pendingOperations.length > 0) {
    const op = pendingOperations.shift()!;

    try {
      let result: any;

      switch (op.type) {
        case 'writeFile':
          if (fileWriteCallback && op.path && op.content !== undefined) {
            result = await fileWriteCallback(op.path, op.content);
          } else {
            result = false;
          }

          break;
        case 'makeDirectory':
          if (makeDirectoryCallback && op.path) {
            result = await makeDirectoryCallback(op.path);
          } else {
            result = false;
          }

          break;
        case 'runCommand':
          if (runCommandCallback && op.command) {
            await runCommandCallback(op.command);
            result = true;
          } else {
            result = false;
          }

          break;
      }
      op.resolve(result);
    } catch (error) {
      console.error(`[E2B Store] Failed to process queued ${op.type}:`, error);
      op.reject(error);
    }
  }

  isProcessingQueue = false;
};

export const e2bStore = {
  setApiKey(key: string) {
    e2bApiKey.set(key);
    e2bState.setKey('apiKey', key);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('e2b_api_key', key);
    }
  },

  getApiKey(): string {
    return e2bApiKey.get();
  },

  loadApiKey() {
    if (typeof localStorage !== 'undefined') {
      const key = localStorage.getItem('e2b_api_key') || '';
      e2bApiKey.set(key);
      e2bState.setKey('apiKey', key);

      return key;
    }

    return '';
  },

  setConnected(connected: boolean, sandboxId: string | null = null) {
    e2bState.setKey('isConnected', connected);
    e2bState.setKey('sandboxId', sandboxId);
    e2bState.setKey('isConnecting', false);
  },

  setConnecting(connecting: boolean) {
    e2bState.setKey('isConnecting', connecting);
  },

  setError(error: string | null) {
    e2bState.setKey('error', error);
  },

  setSyncing(syncing: boolean) {
    e2bState.setKey('isSyncing', syncing);
  },

  setAutoCreateTriggered(triggered: boolean) {
    e2bState.setKey('autoCreateTriggered', triggered);
  },

  // Register sandbox callbacks from E2BSandbox component
  registerSandboxCallbacks(callbacks: {
    writeFile: (path: string, content: string) => Promise<boolean>;
    makeDirectory: (path: string) => Promise<boolean>;
    runCommand: (command: string) => Promise<void>;
    sendTerminalInput: (terminalId: string, data: string) => Promise<void>;
    createSandbox: () => Promise<any>;
    setActiveTerminalId: (id: string) => void;
    getActiveTerminalId: () => string | null;
  }) {
    fileWriteCallback = callbacks.writeFile;
    makeDirectoryCallback = callbacks.makeDirectory;
    runCommandCallback = callbacks.runCommand;
    terminalSendInput = callbacks.sendTerminalInput;
    createSandboxCallback = callbacks.createSandbox;
    activeTerminalId = callbacks.getActiveTerminalId();

    // Process any queued operations now that callbacks are available
    console.log('[E2B Store] Callbacks registered, processing queue...');
    processQueue();
  },

  setActiveTerminalId(id: string) {
    activeTerminalId = id;
  },

  getActiveTerminalId(): string | null {
    return activeTerminalId;
  },

  // Write file to E2B sandbox
  async writeFile(path: string, content: string): Promise<boolean> {
    // If callbacks are ready, write directly
    if (fileWriteCallback) {
      return await fileWriteCallback(path, content);
    }

    // If sandbox is connecting, queue the operation
    const state = e2bState.get();

    if (state.isConnecting || state.isConnected) {
      console.log(`[E2B Store] Queueing writeFile: ${path} (waiting for callbacks)`);
      return new Promise((resolve, reject) => {
        pendingOperations.push({
          type: 'writeFile',
          path,
          content,
          resolve,
          reject,
        });
      });
    }

    console.error('E2B sandbox not connected - cannot write file');

    return false;
  },

  // Make directory in E2B sandbox
  async makeDirectory(path: string): Promise<boolean> {
    // If callbacks are ready, create directory directly
    if (makeDirectoryCallback) {
      return await makeDirectoryCallback(path);
    }

    // If sandbox is connecting, queue the operation
    const state = e2bState.get();

    if (state.isConnecting || state.isConnected) {
      console.log(`[E2B Store] Queueing makeDirectory: ${path} (waiting for callbacks)`);
      return new Promise((resolve, reject) => {
        pendingOperations.push({
          type: 'makeDirectory',
          path,
          resolve,
          reject,
        });
      });
    }

    console.error('E2B sandbox not connected - cannot make directory');

    return false;
  },

  // Run command in E2B sandbox terminal
  async runCommand(command: string): Promise<void> {
    // If callbacks are ready, run command directly
    if (runCommandCallback) {
      await runCommandCallback(command);
      return;
    }

    // If sandbox is connecting, queue the operation
    const state = e2bState.get();

    if (state.isConnecting || state.isConnected) {
      console.log(`[E2B Store] Queueing runCommand: ${command} (waiting for callbacks)`);
      return new Promise((resolve, reject) => {
        pendingOperations.push({
          type: 'runCommand',
          command,
          resolve,
          reject,
        });
      });
    }

    console.error('E2B sandbox not connected - cannot run command');
  },

  // Send input to terminal
  async sendTerminalInput(data: string): Promise<void> {
    if (!terminalSendInput || !activeTerminalId) {
      console.error('E2B terminal not ready - cannot send input');
      return;
    }

    await terminalSendInput(activeTerminalId, data);
  },

  // Create sandbox
  async createSandbox(): Promise<any> {
    if (!createSandboxCallback) {
      console.error('E2B sandbox callback not registered');
      return null;
    }

    return await createSandboxCallback();
  },

  // Check if sandbox is ready (or connecting - operations will be queued)
  isReady(): boolean {
    const state = e2bState.get();

    // Return true if connected with callbacks, or if connecting (operations will be queued)
    return (state.isConnected && !!fileWriteCallback) || state.isConnecting;
  },

  // Reset state
  reset() {
    e2bState.set(initialState);
    sandboxInstance = null;
    terminalSendInput = null;
    fileWriteCallback = null;
    makeDirectoryCallback = null;
    runCommandCallback = null;
    createSandboxCallback = null;
    activeTerminalId = null;

    // Clear pending operations and reject them
    while (pendingOperations.length > 0) {
      const op = pendingOperations.shift()!;
      op.reject(new Error('E2B sandbox reset'));
    }
  },
};

// Load API key on initialization
if (typeof window !== 'undefined') {
  e2bStore.loadApiKey();
}
