import { atom, map, type MapStore, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser';
import { unreachable } from '~/utils/unreachable';
import { EditorStore } from './editor';
import { FilesStore, type FileMap } from './files';
import { e2bStore } from './e2b';
import { WORK_DIR } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('WorkbenchStore');

export interface ArtifactState {
  id: string;
  title: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;

type Artifacts = MapStore<Record<string, ArtifactState>>;

export class WorkbenchStore {
  #filesStore = new FilesStore();
  #editorStore = new EditorStore(this.#filesStore);

  artifacts: Artifacts = import.meta.hot?.data.artifacts ?? map({});

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);
  unsavedFiles: WritableAtom<Set<string>> = import.meta.hot?.data.unsavedFiles ?? atom(new Set<string>());
  modifiedFiles = new Set<string>();
  artifactIdList: string[] = [];

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts;
      import.meta.hot.data.unsavedFiles = this.unsavedFiles;
      import.meta.hot.data.showWorkbench = this.showWorkbench;
    }
  }

  get files() {
    return this.#filesStore.files;
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    return this.#editorStore.currentDocument;
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get filesCount(): number {
    return this.#filesStore.filesCount;
  }

  setChatId(chatId: string | undefined) {
    this.#filesStore.setChatId(chatId);

    if (!chatId) {
      this.#editorStore.setSelectedFile(undefined);
      this.unsavedFiles.set(new Set());
      this.artifactIdList = [];

      const currentArtifacts = this.artifacts.get();

      for (const key of Object.keys(currentArtifacts)) {
        this.artifacts.setKey(key, undefined as never);
      }
    }
  }

  resetForNewChat() {
    this.#filesStore.resetFiles();
    this.#editorStore.setSelectedFile(undefined);
    this.unsavedFiles.set(new Set());
    this.artifactIdList = [];
    this.showWorkbench.set(false);

    const currentArtifacts = this.artifacts.get();

    for (const key of Object.keys(currentArtifacts)) {
      this.artifacts.setKey(key, undefined as never);
    }
  }

  setDocuments(files: FileMap) {
    this.#editorStore.setDocuments(files);

    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === undefined) {
      // we find the first file and select it
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }

  setShowWorkbench(show: boolean) {
    this.showWorkbench.set(show);
  }

  setCurrentDocumentContent(newContent: string) {
    const filePath = this.currentDocument.get()?.filePath;

    if (!filePath) {
      return;
    }

    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== undefined && originalContent !== newContent;

    this.#editorStore.updateFile(filePath, newContent);

    const currentDocument = this.currentDocument.get();

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();

      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles);

      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }

      this.unsavedFiles.set(newUnsavedFiles);
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument.get();

    if (!editorDocument) {
      return;
    }

    const { filePath } = editorDocument;

    this.#editorStore.updateScrollPosition(filePath, position);
  }

  setSelectedFile(filePath: string | undefined) {
    this.#editorStore.setSelectedFile(filePath);
  }

  async saveFile(filePath: string) {
    const documents = this.#editorStore.documents.get();
    const document = documents[filePath];

    if (document === undefined) {
      return;
    }

    await this.#filesStore.saveFile(filePath, document.value);

    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);

    this.unsavedFiles.set(newUnsavedFiles);
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    await this.saveFile(currentDocument.filePath);
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);

    if (!file) {
      return;
    }

    this.setCurrentDocumentContent(file.content);
  }

  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath);
    }
  }

  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }

  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }

  abortAllActions() {
    // TODO: what do we wanna do and how do we wanna recover from this?
  }

  addArtifact({ messageId, title, id }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId);

    if (artifact) {
      return;
    }

    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }

    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      runner: new ActionRunner(this.#filesStore),
    });
  }

  updateArtifact({ messageId }: ArtifactCallbackData, state: Partial<ArtifactUpdateState>) {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      return;
    }

    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }

  async addAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    artifact.runner.addAction(data);
  }

  async runAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    artifact.runner.runAction(data);
  }

  async syncMissingFiles(messageId: string): Promise<{ synced: number; total: number; missing: string[] }> {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      logger.warn(`Artifact not found for messageId: ${messageId}`);
      return { synced: 0, total: 0, missing: [] };
    }

    const actions = artifact.runner.actions.get();
    const fileActions = Object.values(actions).filter((action) => action.type === 'file');
    const currentFiles = this.#filesStore.files.get();

    let syncedCount = 0;
    const missingFiles: string[] = [];

    for (const action of fileActions) {
      if (action.type !== 'file') {
        continue;
      }

      const normalizedPath = action.filePath.startsWith(WORK_DIR) ? action.filePath : `${WORK_DIR}/${action.filePath}`;

      const existingFile = currentFiles[normalizedPath];

      if (!existingFile || existingFile.type !== 'file') {
        missingFiles.push(action.filePath);
        logger.info(`Missing file detected: ${action.filePath}`);

        try {
          this.#filesStore.addFile(action.filePath, action.content);

          if (e2bStore.isReady()) {
            const e2bPath = action.filePath.startsWith('/home/user/')
              ? action.filePath
              : `/home/user/${action.filePath.replace(/^\//, '')}`;

            const pathParts = e2bPath.split('/').filter(Boolean);
            let currentPath = '';

            for (let i = 0; i < pathParts.length - 1; i++) {
              currentPath += '/' + pathParts[i];

              if (currentPath.startsWith('/home/user')) {
                await e2bStore.makeDirectory(currentPath);
              }
            }

            await e2bStore.writeFile(e2bPath, action.content);
            logger.info(`File synced to E2B sandbox: ${e2bPath}`);
          }

          syncedCount++;
          logger.info(`File synced successfully: ${action.filePath}`);
        } catch (error) {
          logger.error(`Failed to sync file ${action.filePath}:`, error);
        }
      }
    }

    if (syncedCount > 0) {
      logger.info(`Synced ${syncedCount} missing files`);
    } else if (missingFiles.length === 0) {
      logger.info('All files are already in the file editor');
    }

    return {
      synced: syncedCount,
      total: fileActions.length,
      missing: missingFiles,
    };
  }

  getFilesStore() {
    return this.#filesStore;
  }

  #getArtifact(id: string) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }
}

export const workbenchStore = new WorkbenchStore();
