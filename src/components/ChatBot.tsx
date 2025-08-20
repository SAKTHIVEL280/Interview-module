import React, { useState, useEffect } from 'react';
import { MessageCircle, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';

interface ChatSession {
  isActive: boolean;
  currentQuestion: string | null;
  questionNumber: number;
  totalQuestions: number;
  progress: number;
  isRetry: boolean;
  completed: boolean;
}

interface ChatBotProps {
  projectId: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ projectId }) => {
  const [session, setSession] = useState<ChatSession>({
    isActive: false,
    currentQuestion: null,
    questionNumber: 0,
    totalQuestions: 0,
    progress: 0,
    isRetry: false,
    completed: false
  });
  
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{
    type: 'question' | 'answer' | 'validation';
    content: string;
    timestamp: string;
    valid?: boolean;
  }>>([]);

  // Start chat session
  const startChat = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat/start');
      const data = await response.json();
      
      if (data.success) {
        setSession({
          isActive: true,
          currentQuestion: null,
          questionNumber: 0,
          totalQuestions: data.total_questions,
          progress: 0,
          isRetry: false,
          completed: false
        });
        
        // Get first question
        await getNextQuestion();
      } else {
        setError(data.error || 'Failed to start chat session');
      }
    } catch (err) {
      setError('Failed to connect to chat service');
      console.error('Chat start error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get next question
  const getNextQuestion = async () => {
    try {
      const response = await fetch('/api/chat/next-question');
      const data = await response.json();
      
      if (data.success) {
        if (data.completed) {
          // Chat completed
          await completeChat();
          return;
        }
        
        setSession(prev => ({
          ...prev,
          currentQuestion: data.question,
          questionNumber: data.question_number,
          progress: data.progress,
          isRetry: data.is_retry,
          completed: false
        }));
        
        // Add question to chat history
        setChatHistory(prev => [...prev, {
          type: 'question',
          content: `Question ${data.question_number}/${data.total_questions}: ${data.question}`,
          timestamp: new Date().toLocaleTimeString(),
        }]);
      } else {
        setError(data.error || 'Failed to get next question');
      }
    } catch (err) {
      setError('Failed to get next question');
      console.error('Get question error:', err);
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!answer.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Add user answer to chat history
      setChatHistory(prev => [...prev, {
        type: 'answer',
        content: answer,
        timestamp: new Date().toLocaleTimeString(),
      }]);
      
      const response = await fetch('/api/chat/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add validation result to chat history
        setChatHistory(prev => [...prev, {
          type: 'validation',
          content: data.message,
          timestamp: new Date().toLocaleTimeString(),
          valid: data.valid
        }]);
        
        // Update progress
        setSession(prev => ({
          ...prev,
          progress: data.progress
        }));
        
        // Clear answer input
        setAnswer('');
        
        // Get next question after a short delay
        setTimeout(() => {
          getNextQuestion();
        }, 1500);
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch (err) {
      setError('Failed to submit answer');
      console.error('Submit answer error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete chat session
  const completeChat = async () => {
    try {
      const response = await fetch('/api/chat/complete');
      const data = await response.json();
      
      if (data.success) {
        setSession(prev => ({
          ...prev,
          completed: true,
          currentQuestion: null
        }));
        
        setChatHistory(prev => [...prev, {
          type: 'validation',
          content: `🎉 Chat completed! You've successfully answered ${data.total_answers} out of ${data.total_questions} questions. Your enhanced summary has been generated.`,
          timestamp: new Date().toLocaleTimeString(),
          valid: true
        }]);
      } else {
        setError(data.error || 'Failed to complete chat session');
      }
    } catch (err) {
      setError('Failed to complete chat session');
      console.error('Complete chat error:', err);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (answer.trim() && !isLoading) {
        submitAnswer();
      }
    }
  };

  // Calculate progress percentage
  const progressPercentage = session.totalQuestions > 0 
    ? (session.progress / session.totalQuestions) * 100 
    : 0;

  if (!session.isActive) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MessageCircle className="w-16 h-16 text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'rgba(45,62,79,255)' }}>
          AI Interview Assistant
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Start an interactive interview session to enhance the project summary with detailed information through AI-powered questions.
        </p>
        <button
          onClick={startChat}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlayCircle className="w-5 h-5" />
          {isLoading ? 'Starting...' : 'Start Interview'}
        </button>
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="p-4 bg-blue-50 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-blue-800">
            AI Interview Session
          </span>
          <span className="text-sm text-blue-600">
            {session.progress}/{session.totalQuestions} completed
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((item, index) => (
          <div key={index} className={`flex ${item.type === 'answer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              item.type === 'question' 
                ? 'bg-blue-100 text-blue-800' 
                : item.type === 'answer'
                ? 'bg-green-100 text-green-800'
                : item.valid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-orange-50 text-orange-700 border border-orange-200'
            }`}>
              <div className="text-sm font-medium">
                {item.type === 'question' && '🤖 '}
                {item.type === 'answer' && '👤 '}
                {item.type === 'validation' && (item.valid ? '✅ ' : '⚠️ ')}
                {item.content}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {item.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      {session.currentQuestion && !session.completed && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex gap-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer here..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={submitAnswer}
              disabled={!answer.trim() || isLoading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          {session.isRetry && (
            <div className="mt-2 text-sm text-orange-600">
              ⚠️ This question needs a more specific answer. Please try again.
            </div>
          )}
        </div>
      )}

      {/* Completion State */}
      {session.completed && (
        <div className="p-6 bg-green-50 border-t text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Interview Completed!
          </h3>
          <p className="text-green-700">
            Your enhanced summary has been generated and saved.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 border-t border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatBot;
