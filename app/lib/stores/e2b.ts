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
  },

  setActiveTerminalId(id: string) {
    activeTerminalId = id;
  },

  getActiveTerminalId(): string | null {
    return activeTerminalId;
  },

  // Write file to E2B sandbox
  async writeFile(path: string, content: string): Promise<boolean> {
    if (!fileWriteCallback) {
      console.error('E2B sandbox not connected - cannot write file');
      return false;
    }
    return await fileWriteCallback(path, content);
  },

  // Make directory in E2B sandbox
  async makeDirectory(path: string): Promise<boolean> {
    if (!makeDirectoryCallback) {
      console.error('E2B sandbox not connected - cannot make directory');
      return false;
    }
    return await makeDirectoryCallback(path);
  },

  // Run command in E2B sandbox terminal
  async runCommand(command: string): Promise<void> {
    if (!runCommandCallback) {
      console.error('E2B sandbox not connected - cannot run command');
      return;
    }
    await runCommandCallback(command);
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

  // Check if sandbox is ready
  isReady(): boolean {
    return e2bState.get().isConnected && !!fileWriteCallback;
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
  },
};

// Load API key on initialization
if (typeof window !== 'undefined') {
  e2bStore.loadApiKey();
}