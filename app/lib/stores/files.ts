import { map, type MapStore } from 'nanostores';
import * as nodePath from 'node:path';
import { WORK_DIR } from '~/utils/constants';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('FilesStore');

const STORAGE_KEY_PREFIX = 'bolt_files_';

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  #size = 0;
  #chatId: string | undefined;
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }
  }

  setChatId(chatId: string | undefined) {
    if (this.#chatId === chatId) {
      return;
    }

    this.#chatId = chatId;
    this.#clearFiles();

    if (chatId) {
      this.#loadFromStorage(chatId);
    }
  }

  resetFiles() {
    this.#clearFiles();
    this.#chatId = undefined;
  }

  #clearFiles() {
    const currentFiles = this.files.get();

    for (const path of Object.keys(currentFiles)) {
      this.files.setKey(path, undefined);
    }

    this.#size = 0;
    this.#modifiedFiles.clear();
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];

    if (dirent?.type !== 'file') {
      return undefined;
    }

    return dirent;
  }

  getFileModifications() {
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }

  resetFileModifications() {
    this.#modifiedFiles.clear();
  }

  async saveFile(filePath: string, content: string) {
    try {
      const oldContent = this.getFile(filePath)?.content;

      if (!this.#modifiedFiles.has(filePath) && oldContent !== undefined) {
        this.#modifiedFiles.set(filePath, oldContent);
      }

      this.files.setKey(filePath, { type: 'file', content, isBinary: false });
      this.#persistToStorage();

      logger.info('File updated');
    } catch (error) {
      logger.error('Failed to update file content\n\n', error);
      throw error;
    }
  }

  addFile(filePath: string, content: string) {
    const normalizedPath = filePath.startsWith(WORK_DIR) ? filePath : `${WORK_DIR}/${filePath}`;

    const folder = nodePath.dirname(normalizedPath);

    if (folder !== '.' && folder !== WORK_DIR) {
      this.#ensureFolderExists(folder);
    }

    const existingFile = this.files.get()[normalizedPath];

    if (!existingFile || existingFile.type !== 'file') {
      this.#size++;
    }

    this.files.setKey(normalizedPath, { type: 'file', content, isBinary: false });
    this.#persistToStorage();

    logger.info(`File added: ${normalizedPath}`);
  }

  #ensureFolderExists(folderPath: string) {
    const parts = folderPath.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

      const existing = this.files.get()[currentPath];

      if (!existing) {
        this.files.setKey(currentPath, { type: 'folder' });
      }
    }
  }

  #loadFromStorage(chatId: string) {
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${chatId}`;
        const stored = localStorage.getItem(storageKey);

        if (stored) {
          const parsed = JSON.parse(stored) as FileMap;

          for (const [path, dirent] of Object.entries(parsed)) {
            if (dirent) {
              this.files.setKey(path, dirent);

              if (dirent.type === 'file') {
                this.#size++;
              }
            }
          }

          logger.info(`Loaded files from storage for chat: ${chatId}`);
        }
      } catch (error) {
        logger.error('Failed to load files from storage', error);
      }
    }
  }

  #persistToStorage() {
    if (typeof window !== 'undefined' && this.#chatId) {
      try {
        const files = this.files.get();
        const storageKey = `${STORAGE_KEY_PREFIX}${this.#chatId}`;
        localStorage.setItem(storageKey, JSON.stringify(files));
      } catch (error) {
        logger.error('Failed to persist files to storage', error);
      }
    }
  }
}
