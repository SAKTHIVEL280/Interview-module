import { useState, useEffect, useCallback } from 'react';
import { ContextHistoryEntry, fetchContextHistory, saveContextHistory } from '@/lib/api';

export const useContextHistory = (projectId: string) => {
  const [contextHistory, setContextHistory] = useState<ContextHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load context history from database
  const loadContextHistory = useCallback(async () => {
    if (!projectId) {
      setContextHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Loading context history for project: ${projectId}`);
      const history = await fetchContextHistory(projectId);
      
      console.log(`Loaded ${history.length} context history entries`);
      setContextHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load context history';
      console.error('Error loading context history:', errorMessage);
      setError(errorMessage);
      // Don't clear existing history on error, just show error
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Save a new context history entry
  const addContextEntry = useCallback(async (
    type: 'user' | 'bot',
    text: string,
    files?: Array<{url: string, name: string}>,
    sessionId?: string
  ) => {
    if (!projectId || !text.trim()) {
      console.warn('Cannot save context entry: missing projectId or text');
      return;
    }

    // Add to local state immediately for responsive UI
    const newEntry: ContextHistoryEntry = {
      id: Date.now(), // Temporary ID, will be replaced with DB ID
      type,
      text,
      timestamp: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      date: new Date().toISOString().split('T')[0],
      files,
      sessionId
    };

    setContextHistory(prev => [...prev, newEntry]);

    try {
      // Save to database
      const dbId = await saveContextHistory(projectId, type, text, files, sessionId);
      
      // Update the entry with the real database ID
      setContextHistory(prev => 
        prev.map(entry => 
          entry.id === newEntry.id 
            ? { ...entry, id: dbId }
            : entry
        )
      );

      console.log(`Context entry saved with DB ID: ${dbId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save context entry';
      console.error('Error saving context entry:', errorMessage);
      
      // Remove the failed entry from local state
      setContextHistory(prev => prev.filter(entry => entry.id !== newEntry.id));
      setError(errorMessage);
    }
  }, [projectId]);

  // Clear all context history (optional - for debugging)
  const clearAllContext = useCallback(async () => {
    if (!projectId) return;

    try {
      setContextHistory([]);
      // We could call clearContextHistory API here if needed
      console.log('Context history cleared locally');
    } catch (err) {
      console.error('Error clearing context history:', err);
    }
  }, [projectId]);

  // Load context history when project changes
  useEffect(() => {
    loadContextHistory();
  }, [loadContextHistory]);

  return {
    contextHistory,
    isLoading,
    error,
    addContextEntry,
    clearAllContext,
    refetchContextHistory: loadContextHistory
  };
};
