import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  return (
    chatStarted && (
      <div className="h-full w-full p-4">
        <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
          <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
            <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
            <div className="ml-auto" />
            {selectedView === 'code' && (
              <PanelHeaderButton
                className="mr-1 text-sm"
                onClick={() => {
                  workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                }}
              >
                <div className="i-ph:terminal" />
                Toggle Terminal
              </PanelHeaderButton>
            )}
          </div>
          <div className="relative flex-1 overflow-hidden">
            <View
              initial={{ x: selectedView === 'code' ? 0 : '-100%' }}
              animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
            >
              <EditorPanel
                editorDocument={currentDocument}
                isStreaming={isStreaming}
                selectedFile={selectedFile}
                files={files}
                unsavedFiles={unsavedFiles}
                onFileSelect={onFileSelect}
                onEditorScroll={onEditorScroll}
                onEditorChange={onEditorChange}
                onFileSave={onFileSave}
                onFileReset={onFileReset}
              />
            </View>
            <View
              initial={{ x: selectedView === 'preview' ? 0 : '100%' }}
              animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
            >
              <Preview />
            </View>
          </div>
        </div>
      </div>
    )
  );
});

interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
