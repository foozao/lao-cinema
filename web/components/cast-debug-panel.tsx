'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface DebugLog {
  time: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

/**
 * Debug panel to show console logs on screen for mobile testing
 * Only visible in development or when ?debug=true is in URL
 */
export function CastDebugPanel() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if ?debug=true in URL or in development
    const params = new URLSearchParams(window.location.search);
    const shouldShow = params.get('debug') === 'true' || process.env.NODE_ENV === 'development';
    setIsVisible(shouldShow);

    if (!shouldShow) return;

    // Intercept console.log, console.error
    const originalLog = console.log;
    const originalError = console.error;

    const addLog = (message: string, type: DebugLog['type']) => {
      const time = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-20), { time, message, type }]); // Keep last 20 logs
    };

    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Only intercept Cast-related logs (with emoji)
      if (message.includes('🎬') || message.includes('✅') || message.includes('❌') || message.includes('🔍')) {
        const type = message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info';
        addLog(message, type);
      }
      
      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.map(arg => String(arg)).join(' ');
      
      // Only intercept Cast-related errors
      if (message.toLowerCase().includes('cast') || message.includes('❌')) {
        addLog(message, 'error');
      }
      
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 bg-black/95 text-white rounded-lg shadow-2xl z-[100] overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-semibold">Cast Debug Log</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="overflow-y-auto max-h-80 p-2 space-y-1 text-xs font-mono">
        {logs.length === 0 ? (
          <p className="text-gray-500 p-2">Waiting for Cast logs...</p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`p-2 rounded ${
                log.type === 'error' ? 'bg-red-900/30 text-red-300' :
                log.type === 'success' ? 'bg-green-900/30 text-green-300' :
                'bg-gray-800/50 text-gray-300'
              }`}
            >
              <span className="text-gray-500">{log.time}</span>
              <pre className="whitespace-pre-wrap break-words mt-1">{log.message}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
