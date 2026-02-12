import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  Monitor,
  Smartphone,
  Tablet,
  Cloud,
  CloudOff,
  Terminal,
} from 'lucide-react';
import { useStore } from '@nanostores/react';
import { e2bState } from '~/lib/stores/e2b';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const deviceSizes: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

interface PreviewTabProps {
  chatStarted?: boolean;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({ chatStarted }) => {
  const state = useStore(e2bState);
  const { isConnected, sandboxId } = state;
  
  const [port, setPort] = useState('3000');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [key, setKey] = useState(0);
  const [erudaEnabled, setErudaEnabled] = useState(false);

  const erudaWrapperHtml = useMemo(() => {
    if (!previewUrl || !erudaEnabled) return null;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview with Eruda Console</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe id="preview-frame" src="${previewUrl}" allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"></iframe>
  <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
  <script>
    eruda.init({
      container: document.body,
      tool: ['console', 'elements', 'network', 'resources', 'info'],
      useShadowDom: true,
      autoScale: true
    });
    eruda.show();
    
    // Add message to console about cross-origin limitations
    console.log('%c[Eruda] Console initialized for preview wrapper', 'color: #4CAF50; font-weight: bold;');
    console.log('%c[Eruda] Note: Due to cross-origin restrictions, console logs from the iframe app may not appear here.', 'color: #FF9800;');
    console.log('%c[Eruda] For full debugging, click "Open in new tab" and use browser DevTools.', 'color: #2196F3;');
  </script>
</body>
</html>`;
  }, [previewUrl, erudaEnabled]);

  useEffect(() => {
    if (sandboxId && port) {
      const portNum = parseInt(port, 10);

      if (!isNaN(portNum) && portNum > 0 && portNum < 65536) {
        setPreviewUrl(`https://${portNum}-${sandboxId}.e2b.app`);
        setError(null);
      } else {
        setPreviewUrl(null);
        setError('Invalid port number');
      }
    } else {
      setPreviewUrl(null);
    }
  }, [sandboxId, port]);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
    setIsLoading(true);
  };

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load preview. Make sure your server is running on the specified port.');
  };

  if (!chatStarted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 bg-bolt-elements-background-depth-2">
        <CloudOff size={64} className="mb-6 opacity-30" />
        <h2 className="text-xl font-semibold mb-2 text-bolt-elements-textPrimary">No Sandbox Connected</h2>
        <p className="text-sm text-bolt-elements-textSecondary text-center max-w-md">
          Start a chat and connect to an E2B sandbox to see your application preview here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-bolt-elements-background-depth-2">
      {/* Header Bar */}
      <div className="h-12 bg-bolt-elements-background-depth-3 border-b border-bolt-elements-borderColor flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-green-400" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Preview</span>
        </div>

        <div className="flex items-center ml-4">
          <span className="text-xs text-bolt-elements-textSecondary mr-2">Port:</span>
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-20 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded px-2 py-1 text-xs text-bolt-elements-textPrimary focus:outline-none focus:border-bolt-elements-borderColorActive"
            placeholder="3000"
          />
        </div>

        <div className="flex items-center ml-auto space-x-1">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`p-2 rounded transition-colors ${deviceMode === 'desktop' ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent' : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'}`}
            title="Desktop view"
          >
            <Monitor size={16} />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-2 rounded transition-colors ${deviceMode === 'tablet' ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent' : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'}`}
            title="Tablet view"
          >
            <Tablet size={16} />
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-2 rounded transition-colors ${deviceMode === 'mobile' ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent' : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'}`}
            title="Mobile view"
          >
            <Smartphone size={16} />
          </button>
        </div>

        <div className="flex items-center space-x-1 ml-3 border-l border-bolt-elements-borderColor pl-3">
          <button
            onClick={() => setErudaEnabled(!erudaEnabled)}
            disabled={!previewUrl}
            className={`p-2 rounded transition-colors disabled:opacity-50 ${
              erudaEnabled 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1'
            }`}
            title={erudaEnabled ? 'Disable Eruda Console' : 'Enable Eruda Console'}
          >
            <Terminal size={16} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={!previewUrl}
            className="p-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 rounded disabled:opacity-50 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenExternal}
            disabled={!previewUrl}
            className="p-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 rounded disabled:opacity-50 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* URL Bar */}
      <div className="h-10 bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor flex items-center px-4">
        <div className="flex-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg px-3 py-1.5 flex items-center">
          {previewUrl ? (
            <>
              <span className="text-green-400 text-xs mr-2">🔒</span>
              <span className="text-sm text-bolt-elements-textPrimary truncate">{previewUrl}</span>
            </>
          ) : (
            <span className="text-sm text-bolt-elements-textSecondary">No preview URL - enter a valid port</span>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-bolt-elements-background-depth-1 p-6">
        {error ? (
          <div className="text-center">
            <AlertCircle size={64} className="mx-auto mb-6 text-yellow-500 opacity-50" />
            <p className="text-bolt-elements-textSecondary mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover rounded-lg text-sm text-white font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : previewUrl ? (
          <div
            className="h-full bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300 relative"
            style={{
              width: deviceSizes[deviceMode].width,
              maxWidth: '100%',
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-bolt-elements-background-depth-2 z-10">
                <Loader2 size={40} className="animate-spin text-bolt-elements-loader-progress" />
              </div>
            )}
            {erudaEnabled && erudaWrapperHtml ? (
              <iframe
                key={`eruda-${key}`}
                srcDoc={erudaWrapperHtml}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Preview with Eruda Console"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            ) : (
              <iframe
                key={key}
                src={previewUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            )}
          </div>
        ) : (
          <div className="text-center">
            <Globe size={64} className="mx-auto mb-6 opacity-20 text-bolt-elements-textSecondary" />
            <p className="text-bolt-elements-textSecondary">Enter a valid port to preview your application</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-7 bg-bolt-elements-background-depth-3 border-t border-bolt-elements-borderColor flex items-center px-4 text-xs text-bolt-elements-textSecondary">
        <span>{deviceSizes[deviceMode].label}</span>
        {erudaEnabled && (
          <span className="ml-2 px-2 py-0.5 bg-green-600 text-white rounded text-[10px] font-medium">
            Eruda Console
          </span>
        )}
        {sandboxId && (
          <span className="ml-auto">
            Sandbox: {sandboxId.substring(0, 12)}...
          </span>
        )}
      </div>
    </div>
  );
};