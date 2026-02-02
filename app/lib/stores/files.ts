import { map, type MapStore } from 'nanostores';
import * as nodePath from 'node:path';
import { WORK_DIR } from '~/utils/constants';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('FilesStore');

const STORAGE_KEY = 'bolt_files';

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
  /**
   * Tracks the number of files without folders.
   */
  #size = 0;

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();

  /**
   * Map of files stored in the browser.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }

    this.#init();
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

    // Ensure parent folders exist
    const folder = nodePath.dirname(normalizedPath);

    if (folder !== '.' && folder !== WORK_DIR) {
      this.#ensureFolderExists(folder);
    }

    this.files.setKey(normalizedPath, { type: 'file', content, isBinary: false });
    this.#size++;
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

  #init() {
    // Load files from browser storage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);

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
          logger.info('Loaded files from browser storage');
        }
      } catch (error) {
        logger.error('Failed to load files from storage', error);
      }
    }
  }

  #persistToStorage() {
    if (typeof window !== 'undefined') {
      try {
        const files = this.files.get();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      } catch (error) {
        logger.error('Failed to persist files to storage', error);
      }
    }
  }
}
