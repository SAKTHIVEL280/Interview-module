import { useState, useCallback } from 'react';

interface AnsweredQuestion {
  id: number;
  questionNumber: number;
  question: string;
  answer: string;
  answeredAt: string;
  files?: any[];
  sessionId?: string;
}

interface AnsweredQuestionsSummary {
  project_id: string;
  total_answered: number;
  answered_question_numbers: string | null;
  last_answered_at: string | null;
}

interface UseAnsweredQuestionsReturn {
  answeredQuestions: AnsweredQuestion[];
  answeredQuestionNumbers: number[];
  summary: AnsweredQuestionsSummary | null;
  loading: boolean;
  error: string | null;
  fetchAnsweredQuestions: (projectId: string) => Promise<void>;
  fetchAnsweredQuestionNumbers: (projectId: string) => Promise<number[]>;
  saveAnsweredQuestion: (data: {
    projectId: string;
    questionNumber: number;
    questionText: string;
    answerText: string;
    files?: any[];
    sessionId?: string;
  }) => Promise<void>;
  fetchSummary: (projectId: string) => Promise<void>;
  clearAnsweredQuestions: (projectId: string) => Promise<void>;
}

export const useAnsweredQuestions = (): UseAnsweredQuestionsReturn => {
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [answeredQuestionNumbers, setAnsweredQuestionNumbers] = useState<number[]>([]);
  const [summary, setSummary] = useState<AnsweredQuestionsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnsweredQuestions = useCallback(async (projectId: string) => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/api/answered-questions/${projectId}`);
      const result = await response.json();
      
      if (result.success) {
        setAnsweredQuestions(result.data);
        console.log(`Fetched ${result.data.length} answered questions for project ${projectId}`);
      } else {
        throw new Error(result.error || 'Failed to fetch answered questions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch answered questions';
      setError(errorMessage);
      console.error('Error fetching answered questions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnsweredQuestionNumbers = useCallback(async (projectId: string): Promise<number[]> => {
    if (!projectId) return [];
    
    try {
      const response = await fetch(`http://localhost:5000/api/answered-questions/${projectId}/numbers`);
      const result = await response.json();
      
      if (result.success) {
        setAnsweredQuestionNumbers(result.answeredQuestions);
        console.log(`Fetched answered question numbers: [${result.answeredQuestions.join(', ')}]`);
        return result.answeredQuestions;
      } else {
        throw new Error(result.error || 'Failed to fetch answered question numbers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch answered question numbers';
      console.error('Error fetching answered question numbers:', err);
      return [];
    }
  }, []);

  const saveAnsweredQuestion = useCallback(async (data: {
    projectId: string;
    questionNumber: number;
    questionText: string;
    answerText: string;
    files?: any[];
    sessionId?: string;
  }) => {
    if (!data.projectId || !data.questionNumber || !data.questionText || !data.answerText) {
      throw new Error('Missing required fields for saving answered question');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/answered-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Saved answered question ${data.questionNumber} for project ${data.projectId}`);
        
        // Update local state
        await fetchAnsweredQuestions(data.projectId);
        await fetchAnsweredQuestionNumbers(data.projectId);
      } else {
        throw new Error(result.error || 'Failed to save answered question');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save answered question';
      setError(errorMessage);
      console.error('Error saving answered question:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAnsweredQuestions, fetchAnsweredQuestionNumbers]);

  const fetchSummary = useCallback(async (projectId: string) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/answered-questions/${projectId}/summary`);
      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data);
        console.log(`Fetched summary: ${result.data.total_answered} answered questions`);
      } else {
        throw new Error(result.error || 'Failed to fetch summary');
      }
    } catch (err) {
      console.error('Error fetching answered questions summary:', err);
    }
  }, []);

  const clearAnsweredQuestions = useCallback(async (projectId: string) => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/api/answered-questions/${projectId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnsweredQuestions([]);
        setAnsweredQuestionNumbers([]);
        setSummary(null);
        console.log(`Cleared ${result.deletedCount} answered questions for project ${projectId}`);
      } else {
        throw new Error(result.error || 'Failed to clear answered questions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear answered questions';
      setError(errorMessage);
      console.error('Error clearing answered questions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    answeredQuestions,
    answeredQuestionNumbers,
    summary,
    loading,
    error,
    fetchAnsweredQuestions,
    fetchAnsweredQuestionNumbers,
    saveAnsweredQuestion,
    fetchSummary,
    clearAnsweredQuestions,
  };
};
