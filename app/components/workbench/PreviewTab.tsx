import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Globe, CloudOff, Link2, Copy, Check } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { e2bState } from '~/lib/stores/e2b';

interface PreviewTabProps {
  chatStarted?: boolean;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({ chatStarted }) => {
  const state = useStore(e2bState);
  const { isConnected, sandboxId } = state;

  const [port, setPort] = useState('3000');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const isValidUrl = useCallback((url: string | null): url is string => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (isValidUrl(previewUrl)) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  }, [previewUrl, isValidUrl]);

  const handleCopyUrl = useCallback(async () => {
    if (isValidUrl(previewUrl)) {
      try {
        await navigator.clipboard.writeText(previewUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  }, [previewUrl, isValidUrl]);

  const canOpenUrl = isValidUrl(previewUrl);

  if (!chatStarted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center px-4 bg-bolt-elements-background-depth-2">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-bolt-elements-background-depth-3 flex items-center justify-center mb-6">
            <CloudOff size={36} className="text-bolt-elements-textSecondary opacity-50" />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-bolt-elements-textPrimary">
            No Sandbox Connected
          </h2>
          <p className="text-sm text-bolt-elements-textSecondary leading-relaxed">
            Start a chat and connect to an E2B sandbox to see your application preview here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-4 py-8 bg-bolt-elements-background-depth-2">
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-bolt-elements-background-depth-3 to-bolt-elements-background-depth-1 border border-bolt-elements-borderColor flex items-center justify-center mb-8 shadow-lg">
          {canOpenUrl ? (
            <Globe size={36} className="text-green-400" />
          ) : (
            <Link2 size={36} className="text-bolt-elements-textSecondary opacity-50" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-2 text-bolt-elements-textPrimary text-center">
          Application Preview
        </h2>
        <p className="text-sm text-bolt-elements-textSecondary mb-8 text-center">
          {canOpenUrl ? 'Your application is ready to view' : 'Configure the port to generate preview URL'}
        </p>

        {/* Port Input */}
        <div className="w-full max-w-xs mb-6">
          <label className="block text-xs font-medium text-bolt-elements-textSecondary mb-2 text-center">
            Port Number
          </label>
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-full bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl px-4 py-3 text-center text-lg text-bolt-elements-textPrimary focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="3000"
          />
          {error && (
            <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
          )}
        </div>

        {/* URL Display Card */}
        <div className="w-full bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wide">
              Preview URL
            </span>
            {canOpenUrl && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {canOpenUrl ? (
                <p
                  className="text-sm text-bolt-elements-textPrimary break-all select-all font-mono leading-relaxed"
                  title={previewUrl}
                >
                  {previewUrl}
                </p>
              ) : (
                <p className="text-sm text-bolt-elements-textSecondary italic">
                  No preview URL available
                </p>
              )}
            </div>
            {canOpenUrl && (
              <button
                onClick={handleCopyUrl}
                className="flex-shrink-0 p-2 rounded-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-all active:scale-95"
                title="Copy URL"
              >
                {copied ? (
                  <Check size={18} className="text-green-400" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Open in New Tab Button */}
        <button
          onClick={handleOpenInNewTab}
          disabled={!canOpenUrl}
          className={`
            w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-semibold
            transition-all duration-200 transform
            ${
              canOpenUrl
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary cursor-not-allowed opacity-60'
            }
          `}
        >
          <ExternalLink size={20} />
          <span>Open in New Tab</span>
        </button>

        {/* Helper Text */}
        {!canOpenUrl && (
          <p className="mt-4 text-xs text-bolt-elements-textSecondary text-center max-w-xs">
            Enter a valid port number (1-65535) to enable the preview button
          </p>
        )}

        {/* Sandbox Info */}
        {sandboxId && (
          <div className="mt-8 px-4 py-2 rounded-full bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor">
            <span className="text-xs text-bolt-elements-textSecondary">
              Sandbox:{' '}
              <span className="font-mono text-bolt-elements-textPrimary">
                {sandboxId.length > 16 ? `${sandboxId.substring(0, 16)}...` : sandboxId}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};