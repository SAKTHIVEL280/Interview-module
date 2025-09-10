/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Paperclip, Send } from 'lucide-react';
import { useParams } from 'react-router-dom';
import TopNavBar from '@/components/TopNavBar';
import ProjectSummary from '@/components/ProjectSummary';
import { useProjectData } from '@/hooks/use-project-data';
import { useContextHistory } from '@/hooks/use-context-history';
import { useAnsweredQuestions } from '@/hooks/use-answered-questions';

interface ChatMessage {
  id: number;
  type: 'user' | 'bot';
  text: string;
  timestamp: string;
  date: string;
  files?: Array<{url: string, name: string}>; // Support multiple files in one message
  fileUrl?: string; // Keep for backward compatibility
  fileName?: string; // Keep for backward compatibility
}

const Index = () => {
  // Get project ID and role from URL parameter (e.g., /user/3000609, /consultant/3000609, /admin/3000609)
  const { projectId } = useParams<{ projectId: string }>();
  const location = window.location.pathname;
  
  // Determine user role from URL
  const getUserRole = (): 'user' | 'admin' | 'consultant' => {
    if (location.includes('/consultant/')) return 'consultant';
    if (location.includes('/admin/')) return 'admin';
    if (location.includes('/user/')) return 'user';
    // Legacy route support - treat as user
    return 'user';
  };
  
  const userRole: 'user' | 'admin' | 'consultant' = getUserRole();
  
  // Use project ID from URL, fallback to default if none provided
  const PROJECT_ID = projectId || "3000609";
  
  // Load project data to ensure it's available before starting chat
  const { projectData, isLoading, error } = useProjectData(PROJECT_ID);
  
  // Load and manage context history from database
  const { 
    contextHistory: timelineEntries, 
    isLoading: isContextLoading, 
    addContextEntry,
    error: contextError 
  } = useContextHistory(PROJECT_ID);
  
  // Load and manage answered questions from database
  const {
    answeredQuestions,
    answeredQuestionNumbers,
    fetchAnsweredQuestions,
    fetchAnsweredQuestionNumbers,
    saveAnsweredQuestion,
    summary: answeredQuestionsSummary
  } = useAnsweredQuestions();
  
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageCounter, setMessageCounter] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false); // AI typing indicator
  const [typingMessage, setTypingMessage] = useState(''); // Current typing message
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Default 50% (1:1 ratio)
  const [isLayoutInitialized, setIsLayoutInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Q-Bot specific state
  const [chatSession, setChatSession] = useState({
    isActive: false,
    isStarted: false,
    currentQuestion: null as string | null,
    questionNumber: 0,
    totalQuestions: 0,
    progress: 0,
    isRetry: false,
    completed: false,
    isLoading: false,
    isEnded: false  // For admin session termination
  });
  
  // Session management for admin
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // End session function (admin only)
  const endSession = async () => {
    if (userRole !== 'admin') return;
    
    try {
      const response = await fetch('http://localhost:5000/api/chat/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: PROJECT_ID })
      });
      
      if (response.ok) {
        setSessionEnded(true);
        setChatSession(prev => ({ ...prev, isEnded: true, isActive: false }));
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Restart session function (admin only)
  const restartSession = async () => {
    if (userRole !== 'admin') return;
    
    try {
      console.log('Attempting to restart session for project:', PROJECT_ID);
      
      const response = await fetch(`http://localhost:5000/api/session-management/${PROJECT_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Restart session response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Restart session response data:', data);
        
        setSessionEnded(false);
        setChatSession(prev => ({ ...prev, isEnded: false, isActive: false, isStarted: false, completed: false }));
        
        // Show success message
        console.log('Session restarted successfully, reloading page...');
        alert('Session restarted successfully!');
        
        // Reload the page to reset everything
        window.location.reload();
      } else {
        const errorData = await response.text();
        console.error('Failed to restart session. Status:', response.status, 'Response:', errorData);
        alert('Failed to restart session. Please try again.');
      }
    } catch (error) {
      console.error('Error restarting session:', error);
      alert('Error restarting session. Please check if the server is running.');
    }
  };
  
  // AI-powered question rephrasing function
  // TEMPORARILY DISABLED: AI rephrasing functionality
  // const rephraseQuestionWithAI = async (originalQuestion: string): Promise<string> => {
  //   console.log('🤖 Starting AI rephrasing for:', originalQuestion);
  //   
  //   try {
  //     const API_KEY = "AIzaSyBPqXoIuouQ3IhtHe-l0kJYEDiL4-VAQx8";
  //     const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  //     
  //     const prompt = `You are an expert interviewer. I need you to completely rewrite this question using totally different words and structure, but asking for the exact same information.

  // ORIGINAL QUESTION: "${originalQuestion}"

  // IMPORTANT RULES:
  // 1. YOU CAN use the same starting words (What, How, Why, etc.) but it should be different than the original
  // 2. DO NOT just add prefixes like "Can you tell me" or "I'd like to know"
  // 3. CREATE a completely new sentence structure 
  // 4. USE simple, everyday words that everyone understands
  // 5. AVOID fancy or complicated vocabulary make it easy to understand
  // 6. MAKE it sound like a casual, professional conversation
  // 7. KEEP it as one clear question
  // 8. USE words a 16-year-old would understand
  // 9. RETURN ONLY the rephrased question, nothing else

  // EXAMPLES:
  // - Instead of "What kind of food does John like?" → "Tell me about the food John enjoys"
  // - Instead of "What is Sarah's favorite color?" → "Which color does Sarah like best?"
  // - Instead of "How does this work?" → "Walk me through how this happens"

  // RESPONSE FORMAT: Return ONLY the rephrased question, no explanations or extra text.`;

  //     console.log('🌐 Making API request to Gemini...');
  //     
  //     const response = await fetch(url, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         contents: [{
  //           parts: [{ text: prompt }]
  //         }]
  //       })
  //     });

  //     console.log('📡 API Response status:', response.status);

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error('❌ API request failed:', response.status, errorText);
  //       throw new Error(`API request failed: ${response.status} - ${errorText}`);
  //     }

  //     const data = await response.json();
  //     console.log('📦 Raw API response:', data);
  //     
  //     if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
  //       let rephrasedQuestion = data.candidates[0].content.parts[0].text.trim();
  //       console.log('🔤 Raw rephrased text:', rephrasedQuestion);
  //       
  //       // Clean up the response - remove any extra text and formatting
  //       rephrasedQuestion = rephrasedQuestion.replace(/^REWRITTEN QUESTION[:\s]*/i, '');
  //       rephrasedQuestion = rephrasedQuestion.replace(/^Question[:\s]*/i, '');
  //       rephrasedQuestion = rephrasedQuestion.replace(/^Answer[:\s]*/i, '');
  //       rephrasedQuestion = rephrasedQuestion.replace(/^Rephrased[:\s]*/i, '');
  //       rephrasedQuestion = rephrasedQuestion.replace(/^\*+\s*/, '');
  //       rephrasedQuestion = rephrasedQuestion.replace(/\*+$/, '');
  //       rephrasedQuestion = rephrasedQuestion.replace(/^["']|["']$/g, '');
  //       rephrasedQuestion = rephrasedQuestion.trim();
  //       
  //       // Split by lines and take only the first meaningful line
  //       const lines = rephrasedQuestion.split('\n').filter(line => line.trim().length > 0);
  //       if (lines.length > 0) {
  //         rephrasedQuestion = lines[0].trim();
  //       }
  //       
  //       // Ensure it ends with a question mark
  //       if (!rephrasedQuestion.endsWith('?')) {
  //         rephrasedQuestion += '?';
  //       }
  //       
  //       console.log('🎯 Final rephrased question:', rephrasedQuestion);
  //       
  //       // Basic validation - make sure we got a meaningful response
  //       if (rephrasedQuestion.length < 5 || rephrasedQuestion.toLowerCase() === originalQuestion.toLowerCase()) {
  //         console.error('⚠️ AI returned invalid or identical response');
  //         throw new Error('AI returned invalid or identical response');
  //       }
  //       
  //       console.log('✅ AI Rephrasing successful!');
  //       return rephrasedQuestion;
  //     } else {
  //       console.error('❌ Invalid response format from AI:', data);
  //       throw new Error('Invalid response format from AI');
  //     }
  //   } catch (error) {
  //     console.error('💥 AI rephrasing failed:', error);
  //     
  //     // Fallback to original question if AI fails
  //     return getCreativeFallbackRephrasing(originalQuestion);
  //   }
  // };

  // Simple fallback that just returns the original question if AI fails
  const getCreativeFallbackRephrasing = (originalQuestion: string): string => {
    // If AI fails completely, just return the original question
    console.log('AI rephrasing failed completely, returning original question');
    return originalQuestion;
  };
  
  const recognitionRef = useRef<any>(null);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to reset textarea to normal size
  const resetTextareaSize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '40px'; // Reset to initial single line height
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  // Professional typing messages
  const getTypingMessage = () => {
    return "Processing...";
  };

  // Reset textarea size when message becomes empty
  useEffect(() => {
    if (message === '') {
      resetTextareaSize();
    }
  }, [message]);

  // Auto-scroll when typing indicator appears or disappears
  useEffect(() => {
    if (isTyping) {
      setTimeout(() => {
        scrollToBottom();
      }, 100); // Small delay to ensure DOM is updated
    }
  }, [isTyping]);

  // Load answered questions when PROJECT_ID changes
  useEffect(() => {
    if (PROJECT_ID) {
      fetchAnsweredQuestions(PROJECT_ID);
      fetchAnsweredQuestionNumbers(PROJECT_ID);
    }
  }, [PROJECT_ID, fetchAnsweredQuestions, fetchAnsweredQuestionNumbers]);

  // Clean up duplicate entries in context history
  const cleanupDuplicateEntries = async () => {
    if (timelineEntries.length <= 1) return;
    
    // Check if there are consecutive duplicate bot messages
    let hasDuplicates = false;
    for (let i = 1; i < timelineEntries.length; i++) {
      const current = timelineEntries[i];
      const previous = timelineEntries[i - 1];
      
      if (current.type === 'bot' && 
          previous.type === 'bot' && 
          current.text === previous.text) {
        hasDuplicates = true;
        break;
      }
    }
    
    // Call backend to clean up duplicates if found
    if (hasDuplicates) {
      try {
        console.log(`🧹 Cleaning up duplicate context entries for project ${PROJECT_ID}`);
        const response = await fetch(`http://localhost:5000/api/context-history/${PROJECT_ID}/duplicates`, {
          method: 'DELETE',
        });
        
        const result = await response.json();
        if (result.success && result.deletedCount > 0) {
          console.log(`✅ Cleaned up ${result.deletedCount} duplicate entries`);
          // Refresh the context history after cleanup
          window.location.reload();
        }
      } catch (error) {
        console.error('Error cleaning up duplicates:', error);
      }
    }
  };

  // Clean up duplicates when timeline entries change
  useEffect(() => {
    if (timelineEntries.length > 0) {
      cleanupDuplicateEntries();
    }
  }, [timelineEntries]);

  const getCurrentTime = () => {
    return new Date().toISOString();
  };

  const formatDisplayTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        // If timestamp is already formatted (legacy), return as is
        return timestamp;
      }
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return timestamp; // Fallback to original timestamp
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  // Q-Bot Integration Functions
  const startChatSession = async () => {
    console.log('Starting chat session with PROJECT_ID:', PROJECT_ID);
    setChatSession(prev => ({ ...prev, isLoading: true }));
    
    try {
      // First, fetch answered questions to know the current state
      console.log('Fetching answered questions for project:', PROJECT_ID);
      await fetchAnsweredQuestions(PROJECT_ID);
      
      console.log('Sending request to /api/chat/start...');
      const response = await fetch('http://localhost:5000/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: PROJECT_ID })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setChatSession(prev => ({
          ...prev,
          isActive: true,
          isStarted: true,
          totalQuestions: data.total_questions,
          answeredQuestions: data.answered_questions || 0,
          remainingQuestions: data.remaining_questions || data.total_questions,
          isLoading: false
        }));
        
        // Add welcome message when starting chat
        const welcomeMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: `Hello! 👋`,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        setChatMessages([welcomeMessage]);
        
        // Show typing indicator IMMEDIATELY and get first question
        setIsTyping(true);
        setTypingMessage(getTypingMessage());
        
        // Small delay then get first question
        setTimeout(() => {
          getNextQuestion();
        }, 400); // Reduced to 400ms for faster initial response
      } else {
        setChatSession(prev => ({ ...prev, isLoading: false }));
        setIsTyping(false); // Hide typing indicator on error
        console.error('Failed to start chat session:', data.error);
        console.log('Start chat session failed: typing indicator hidden'); // Debug log
        
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: `Sorry, there was an error starting the session: ${data.error || 'Unknown error'}. Please refresh the page to try again.`,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        setChatMessages([errorMessage]);
      }
    } catch (error) {
      setChatSession(prev => ({ ...prev, isLoading: false }));
      setIsTyping(false); // Hide typing indicator on error
      console.error('Error starting chat session:', error);
      console.log('Start chat session error: typing indicator hidden'); // Debug log
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now(),
        type: 'bot',
        text: `Sorry, there was a connection error. Please make sure all servers are running and refresh the page to try again.`,
        timestamp: getCurrentTime(),
        date: getCurrentDate()
      };
      setChatMessages([errorMessage]);
    }
  };

  const getNextQuestion = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/chat/next-question');
      const data = await response.json();
      
      if (data.success) {
        if (data.completed) {
          // Keep typing indicator visible during completion process
          console.log('Questions completed: keeping typing indicator until completion message is ready'); // Debug log
          await completeChat();
          return;
        }
        
        setChatSession(prev => ({
          ...prev,
          currentQuestion: data.question,
          questionNumber: data.question_number,
          progress: data.progress,
          isRetry: data.is_retry,
          completed: false
        }));
        
        // Rephrase question differently if it's a retry
        let questionText = data.question;
        console.log('🔄 Question received from backend:', data.question);
        console.log('🔍 Is this a retry?', data.is_retry);
        
        // TEMPORARILY DISABLED: Question rephrasing for retries
        // if (data.is_retry) {
        //   console.log('🚨 Question retry detected, using AI to rephrase:', data.question);
        //   try {
        //     // Use AI to rephrase the question completely differently
        //     questionText = await rephraseQuestionWithAI(data.question);
        //     console.log('🎉 AI rephrasing completed successfully:', questionText);
        //   } catch (error) {
        //     console.error('💥 AI rephrasing failed, using fallback:', error);
        //     // Fallback already handled in the rephraseQuestionWithAI function
        //     questionText = getCreativeFallbackRephrasing(data.question);
        //     console.log('🔄 Using fallback question:', questionText);
        //   }
        // } else {
        //   console.log('✅ First attempt, using original question');
        // }
        
        // For now, always use the original question
        console.log('✅ Using original question (rephrasing disabled)');
        questionText = data.question;
        
        // Add question to chat
        setIsTyping(false); // Hide typing indicator
        console.log('Q-Bot typing indicator hidden'); // Debug log
        const questionMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: questionText,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        
        setChatMessages(prev => [...prev, questionMessage]);
        
        // Add question to timeline (context history) - save to database
        // For retries, always save to show conversation flow
        const shouldAddToHistory = data.is_retry || 
          timelineEntries.length === 0 || 
          timelineEntries[timelineEntries.length - 1]?.text !== questionText ||
          timelineEntries[timelineEntries.length - 1]?.type !== 'bot';
          
        if (shouldAddToHistory) {
          console.log(`📝 Adding ${data.is_retry ? 'retry' : 'new'} question to context history`);
          await addContextEntry('bot', questionText);
        } else {
          console.log('🚫 Skipping duplicate question in context history');
        }
      }
    } catch (error) {
      setIsTyping(false); // Hide typing indicator on error
      console.error('Error getting next question:', error);
      console.log('Get next question error: typing indicator hidden'); // Debug log
    }
  };

  const submitAnswerToBot = async (answer: string, files?: {url: string; name: string}[]) => {
    setChatSession(prev => ({ ...prev, isLoading: true }));
    
    try {
      const requestBody = {
        answer,
        files: files || []
      };
      
      const response = await fetch('http://localhost:5000/api/chat/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add ALL answers to timeline (both correct and incorrect) - save to database
        await addContextEntry('user', answer);
        
        // Update progress
        setChatSession(prev => ({
          ...prev,
          progress: data.progress,
          isLoading: false
        }));
        
        // Get next question immediately (no delay)
        setIsTyping(true); // Show typing indicator immediately
        setTypingMessage(getTypingMessage());
        console.log('Q-Bot typing indicator shown'); // Debug log
        
        // Small delay just to show typing indicator then get next question
        setTimeout(() => {
          getNextQuestion();
        }, 600); // Reduced to 600ms for faster response
      } else {
        setChatSession(prev => ({ ...prev, isLoading: false }));
        setIsTyping(false); // Hide typing indicator on error
        console.error('Failed to submit answer:', data.error);
        console.log('Submit answer failed: typing indicator hidden'); // Debug log
      }
    } catch (error) {
      setChatSession(prev => ({ ...prev, isLoading: false }));
      setIsTyping(false); // Hide typing indicator on error
      console.error('Error submitting answer:', error);
      console.log('Submit answer error: typing indicator hidden'); // Debug log
    }
  };

  const completeChat = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/chat/complete');
      const data = await response.json();
      
      if (data.success) {
        setChatSession(prev => ({
          ...prev,
          completed: true,
          currentQuestion: null,
          isLoading: false
        }));
        
        // Small delay to make the transition feel natural, then hide typing indicator and show completion message
        setTimeout(() => {
          setIsTyping(false);
          console.log('Chat completion: typing indicator hidden with smooth transition'); // Debug log
          
          const completionMessage: ChatMessage = {
            id: Date.now(),
            type: 'bot',
            text: `🎉 All done! Thank you for your responses.`,
            timestamp: getCurrentTime(),
            date: getCurrentDate()
          };
          
          setChatMessages(prev => [...prev, completionMessage]);
        }, 500); // Small delay for natural transition
      }
    } catch (error) {
      console.error('Error completing chat:', error);
      // Hide typing indicator on error as well
      setIsTyping(false);
      console.log('Chat completion error: typing indicator hidden'); // Debug log
    }
  };

  const handleSend = async () => {
    // If mic is recording, stop it first but don't send yet
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return; // Exit early, don't send message
    }

    // Check if chat session is active
    if (chatSession.isActive && chatSession.currentQuestion) {
      // Q-Bot mode: submit answer with possible file uploads
      if (!message.trim() && pendingFiles.length === 0) return;
      
      // Upload files first if any
      const uploadedFileUrls: {url: string; name: string}[] = [];
      
      if (pendingFiles.length > 0) {
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          
          try {
            const formData = new FormData();
            formData.append('file', file);
            
            console.log(`Uploading file: ${file.name}`);
            const response = await fetch('http://localhost:5000/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Upload failed with status ${response.status}:`, errorText);
              throw new Error(`Upload failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Upload successful:', data);
            uploadedFileUrls.push({ url: data.url, name: file.name });
          } catch (error) {
            console.error(`Upload error for file ${file.name}:`, error);
            alert(`Upload failed for file: ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return; // Stop if any upload fails
          }
        }
      }
      
      const userMessage: ChatMessage = {
        id: Date.now(),
        type: 'user',
        text: message.trim() || `Uploaded ${uploadedFileUrls.length} file${uploadedFileUrls.length > 1 ? 's' : ''}: ${uploadedFileUrls.map(f => f.name).join(', ')}`,
        timestamp: getCurrentTime(),
        date: getCurrentDate(),
        files: uploadedFileUrls.length > 0 ? uploadedFileUrls : undefined
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      const answerText = message.trim() || `[Files uploaded: ${uploadedFileUrls.map(f => f.name).join(', ')}]`;
      setMessage('');
      setPendingFiles([]);
      resetTextareaSize(); // Reset textarea to normal size
      
      // Show typing indicator IMMEDIATELY
      setIsTyping(true);
      setTypingMessage(getTypingMessage());
      
      await submitAnswerToBot(answerText, uploadedFileUrls);
      return;
    }

    // Regular file upload handling for backward compatibility
    if (!message.trim() && pendingFiles.length === 0) return;

    let currentMessageCounter = messageCounter;
    const uploadedFileUrls: {url: string; name: string}[] = [];

    // Upload all pending files first
    if (pendingFiles.length > 0) {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        
        try {
          // Upload file to backend
          const formData = new FormData();
          formData.append('file', file);
          
          console.log(`Uploading file: ${file.name}`);
          const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          console.log(`Upload response status: ${response.status}`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Upload failed with status ${response.status}:`, errorText);
            throw new Error(`Upload failed: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Upload successful:', data);
          uploadedFileUrls.push({ url: data.url, name: file.name });
        } catch (error) {
          console.error(`Upload error for file ${file.name}:`, error);
          alert(`Upload failed for file: ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return; // Stop if any upload fails
        }
      }
    }

    // Create a single combined message with text and all files
    const userMessage: ChatMessage = {
      id: currentMessageCounter + 1,
      type: 'user',
      text: message.trim(),
      timestamp: getCurrentTime(),
      date: getCurrentDate(),
      files: uploadedFileUrls.length > 0 ? uploadedFileUrls : undefined
    };

    setChatMessages(prev => [...prev, userMessage]);
    
    // Save user message to database
    await addContextEntry(
      'user', 
      message.trim() || `Uploaded ${uploadedFileUrls.length} file${uploadedFileUrls.length > 1 ? 's' : ''}: ${uploadedFileUrls.map(f => f.name).join(', ')}`,
      uploadedFileUrls.length > 0 ? uploadedFileUrls : undefined
    );

    currentMessageCounter += 2;

    // Clear message and pending files
    setMessage('');
    setPendingFiles([]);
    setMessageCounter(currentMessageCounter);

    // Reset textarea to normal size
    resetTextareaSize();

    // Show typing indicator IMMEDIATELY after sending message
    setIsTyping(true);
    setTypingMessage(getTypingMessage());
    console.log('Typing indicator shown'); // Debug log

    // Simulate bot response
    setTimeout(async () => {
      setIsTyping(false); // Hide typing indicator
      console.log('Typing indicator hidden'); // Debug log
      
      const botResponse: ChatMessage = {
        id: currentMessageCounter,
        type: 'bot',
        text: 'Thank you for your message. I\'m processing your request and will provide you with a detailed response.',
        timestamp: getCurrentTime(),
        date: getCurrentDate()
      };

      setChatMessages(prev => [...prev, botResponse]);
      
      // Save bot response to database
      await addContextEntry('bot', 'Thank you for your message. I\'m processing your request and will provide you with a detailed response.');
    }, 1200); // Reduced to 1.2 seconds for faster response
  };

  // Live Speech Recognition Handler
  const handleVoiceRecord = () => {
    if (!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (!isRecording) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Preserve existing message content instead of starting fresh
      const existingMessage = message;
      let sessionTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        sessionTranscript = ''; // Reset session transcript for this result
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Combine existing message + session final transcript + current interim
        const combinedMessage = existingMessage + 
          (existingMessage && sessionTranscript ? ' ' : '') + 
          sessionTranscript + 
          (interimTranscript ? (existingMessage || sessionTranscript ? ' ' : '') + interimTranscript : '');
          
        setMessage(combinedMessage);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        recognition.stop();
        alert('Speech recognition error: ' + event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
        // When recognition ends, finalize the session transcript to the message
        if (sessionTranscript) {
          const finalMessage = existingMessage + 
            (existingMessage ? ' ' : '') + 
            sessionTranscript;
          setMessage(finalMessage);
        }
      };

      recognition.start();
      setIsRecording(true);
    } else {
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // If mic is recording, turn it off
      if (isRecording) {
        setIsRecording(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }

      // Add selected files to pending files
      const newFiles = Array.from(files);
      setPendingFiles(prev => [...prev, ...newFiles]);
      
      // Clear the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // If mic is recording, turn it off
      if (isRecording) {
        setIsRecording(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }
      
      Array.from(files).forEach(file => {
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
          return;
        }
        setPendingFiles(prev => [...prev, file]);
      });
    }
    // Clear the input
    event.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // If mic is recording, stop it first before sending message
      if (isRecording) {
        setIsRecording(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        // Don't send the message if mic was recording, just stop the mic
        return;
      }
      
      // Send if there is a message or pending files
      if (message.trim() || pendingFiles.length > 0) {
        handleSend();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 96); // 96px = approximately 3 lines
    textarea.style.height = newHeight + 'px';
    
    // Show scrollbar only when content exceeds 3 lines
    if (textarea.scrollHeight > 96) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Auto-start chat session after project data is loaded
  useEffect(() => {
    console.log('Project data loading state:', { isLoading, projectData: !!projectData, error: !!error });
    
    // Only start chat session after project data is successfully loaded
    if (!isLoading && projectData && !error && !chatSession.isStarted) {
      console.log('Project data loaded successfully, starting chat session...');
      startChatSession();
    }
  }, [isLoading, projectData, error, chatSession.isStarted]);

  // Initialize layout to ensure 1:1 ratio on mount and project changes
  useEffect(() => {
    setIsLayoutInitialized(false);
    setLeftPanelWidth(50); // Force 50% (1:1 ratio)
    
    // Small delay to ensure DOM is ready, then mark as initialized
    const timer = setTimeout(() => {
      setIsLayoutInitialized(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [PROJECT_ID]);

  // Handle window resize to keep the left width within reasonable bounds
  useEffect(() => {
    const handleResize = () => {
      // Keep current percentage-based width, just ensure it's within bounds
      const minPercent = 25; // Minimum 25%
      const maxPercent = 75; // Maximum 75%
      setLeftPanelWidth(prev => Math.min(Math.max(prev, minPercent), maxPercent));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check session status periodically and on mount
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/chat/session-status/${PROJECT_ID}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Update session state based on server response
            setSessionEnded(data.sessionEnded);
            if (data.sessionEnded) {
              setChatSession(prev => ({ ...prev, isEnded: true, isActive: false }));
            }
          }
        } else if (response.status === 404) {
          // Endpoint not found - server might not be fully updated
          // Silently continue without session checking
          console.warn('Session status endpoint not available - continuing without session management');
        }
        
        // Also refresh answered questions count for real-time updates
        if (PROJECT_ID) {
          fetchAnsweredQuestionNumbers(PROJECT_ID);
        }
      } catch (error) {
        // Network error or server down - silently continue
        console.warn('Could not check session status:', error.message);
      }
    };

    // Check immediately on mount
    checkSessionStatus();

    // Check every 5 seconds for real-time updates (for all roles)
    const interval = setInterval(checkSessionStatus, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [PROJECT_ID]);

  // Render right panel content based on user role
  const renderRightPanelContent = () => {
    // Consultant role: Show chat interface with status bar (same as admin but read-only)
    if (userRole === 'consultant') {
      return (
        <div className="flex flex-col h-full">
          {/* Chat Messages Container for Consultant */}
          <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 min-h-[400px]">
            {/* Display all history as chat messages */}
            {timelineEntries.length > 0 ? (
              timelineEntries.map((entry, index) => (
                <div
                  key={`${entry.id}-${index}-${entry.type}-${entry.timestamp}`}
                  className={`max-w-full flex items-start gap-2 ${
                    entry.type === 'bot' ? 'self-start flex-row' : 'self-end flex-row-reverse'
                  }`}
                >
                  {/* Profile Avatar */}
                  <div className="flex-shrink-0 mt-0.5">
                    {entry.type === 'bot' ? (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-md bg-white">
                        <img src="/favicon.svg" alt="Certainti Logo" className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-md" style={{ backgroundColor: 'rgba(237,249,240,255)', color: 'rgba(45,62,79,255)' }}>
                        U
                      </div>
                    )}
                  </div>
                  {/* Message Bubble and Timestamp */}
                  <div className="flex flex-col min-w-0 flex-1 max-w-[80%]">
                    <div className={`p-3 rounded-xl text-base shadow-sm border transition-all duration-200 hover:shadow-md word-wrap break-words ${
                      entry.type === 'bot'
                        ? 'bg-gray-100 border-gray-200 text-gray-700 rounded-tl-sm'
                        : 'rounded-tr-sm'
                    }`} style={{
                      ...(entry.type === 'user' ? { backgroundColor: 'rgba(237,249,240,255)', border: '1px solid #d1fae5', color: '#065f46' } : {}),
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto',
                      lineHeight: '1.5'
                    }}>
                      <div className="word-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto', lineHeight: '1.5' }}>
                        {entry.text}
                      </div>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 whitespace-nowrap ${
                      entry.type === 'user' ? 'self-end' : 'self-start'
                    }`}>
                      {formatDisplayTime(entry.timestamp)} • {entry.date}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">�️‍🗨️</div>
                  <div className="text-lg font-medium text-gray-700 mb-2">Monitoring Interview</div>
                  <div className="text-sm text-gray-500">
                    The conversation will appear here when the user begins their interview.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Admin role: Show all history as chat messages with End Session button
    if (userRole === 'admin') {
      return (
        <div className="flex flex-col h-full relative">
          {/* Floating Question Progress Indicator */}
          {chatSession.totalQuestions > 0 && (
            <div className="absolute top-3 right-3 z-10 rounded-lg shadow-lg px-3 py-1.5" style={{ backgroundColor: '#2d3e4f' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#32cd32' }}></div>
                <span className="text-xs font-medium" style={{ color: '#ffffff' }}>
                  {answeredQuestionNumbers.length}/{chatSession.totalQuestions}
                </span>
              </div>
            </div>
          )}
          
          {/* Chat Messages Container for Admin */}
          <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 min-h-[400px]">
            {/* Display all history as chat messages */}
            {timelineEntries.length > 0 ? (
              timelineEntries.map((entry, index) => (
                <div
                  key={`${entry.id}-${index}-${entry.type}-${entry.timestamp}`}
                  className={`max-w-full flex items-start gap-2 ${
                    entry.type === 'bot' ? 'self-start flex-row' : 'self-end flex-row-reverse'
                  }`}
                >
                  {/* Profile Avatar */}
                  <div className="flex-shrink-0 mt-0.5">
                    {entry.type === 'bot' ? (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-md bg-white">
                        <img src="/favicon.svg" alt="Certainti Logo" className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-md" style={{ backgroundColor: 'rgba(237,249,240,255)', color: 'rgba(45,62,79,255)' }}>
                        U
                      </div>
                    )}
                  </div>
                  {/* Message Bubble and Timestamp */}
                  <div className="flex flex-col min-w-0 flex-1 max-w-[80%]">
                    <div className={`p-3 rounded-xl text-base shadow-sm border transition-all duration-200 hover:shadow-md word-wrap break-words ${
                      entry.type === 'bot'
                        ? 'bg-gray-100 border-gray-200 text-gray-700 rounded-tl-sm'
                        : 'rounded-tr-sm'
                    }`} style={{
                      ...(entry.type === 'user' ? { backgroundColor: 'rgba(237,249,240,255)', border: '1px solid #d1fae5', color: '#065f46' } : {}),
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto',
                      lineHeight: '1.5'
                    }}>
                      <div className="word-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto', lineHeight: '1.5' }}>
                        {entry.text}
                      </div>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 whitespace-nowrap ${
                      entry.type === 'user' ? 'self-end' : 'self-start'
                    }`}>
                      {formatDisplayTime(entry.timestamp)} • {entry.date}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">👁️‍🗨️</div>
                  <div className="text-lg font-medium text-gray-700 mb-2">Waiting for Interview to Start</div>
                  <div className="text-sm text-gray-500">
                    The conversation will appear here when the user begins their interview.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* End/Restart Session Button for Admin */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex justify-center">
              {!sessionEnded ? (
                <button
                  onClick={endSession}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  End Session
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium flex items-center gap-2">
                    Session Ended
                  </div>
                  <button
                    onClick={restartSession}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    Restart Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // User role with session ended: Show thank you message
    if (userRole === 'user' && sessionEnded) {
      return (
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for providing your information. The session has been ended by the administrator.
            </p>
            <p className="text-sm text-gray-500">
              Your responses have been saved and will be reviewed by our team.
            </p>
          </div>
        </div>
      );
    }

    // Default: Regular chat interface for users and admins
    return (
      <>
        {/* Chat Messages Container */}
        <div 
          ref={chatMessagesRef}
          className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 min-h-[400px]"
        >
          {/* Chat Messages Display */}
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-full flex items-start gap-2 ${
                msg.type === 'bot' ? 'self-start flex-row' : 'self-end flex-row-reverse'
              }`}
            >
              {/* Profile Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {msg.type === 'bot' ? (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-md bg-white">
                    <img src="/favicon.svg" alt="Certainti Logo" className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-md" style={{ backgroundColor: 'rgba(237,249,240,255)', color: 'rgba(45,62,79,255)' }}>
                    U
                  </div>
                )}
              </div>
              {/* Message Bubble and Timestamp */}
              <div className="flex flex-col min-w-0 flex-1 max-w-[80%]">
                <div className={`p-3 rounded-xl text-base shadow-sm border transition-all duration-200 hover:shadow-md word-wrap break-words ${
                  msg.type === 'bot'
                    ? 'bg-gray-100 border-gray-200 text-gray-700 rounded-tl-sm'
                    : 'rounded-tr-sm'
                }`} style={{
                  ...(msg.type === 'user' ? { backgroundColor: 'rgba(237,249,240,255)', border: '1px solid #d1fae5', color: '#065f46' } : {}),
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                  lineHeight: '1.5'
                }}>
                  
                  {/* Display files if they exist - PDF at top-right, text below */}
                  {msg.files && msg.files.length > 0 && (
                    <div>
                      {/* PDF files positioned at top-right */}
                      <div className="flex justify-end mb-2">
                        {msg.files.map((file, index) => {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (ext === 'pdf') {
                            return (
                              <div key={index}>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 hover:bg-red-100 transition-colors cursor-pointer text-sm"
                                  title={`Open ${file.name}`}
                                >
                                  <span className="text-red-500">📄</span>
                                  <span className="max-w-[120px] truncate font-medium">
                                    {file.name}
                                  </span>
                                </a>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      {/* Non-PDF files in grid layout */}
                      {msg.files.some(file => {
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        return ext !== 'pdf';
                      }) && (
                        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', maxWidth: '500px' }}>
                          {msg.files.map((file, index) => {
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            if (ext === 'pdf') return null;
                            
                            if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext || '')) {
                              return (
                                <div key={index} className="relative">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-14 border rounded overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                                    style={{ aspectRatio: '4/3' }}
                                  >
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                  <div className="text-xs text-gray-500 truncate mt-1 max-w-20" title={file.name}>
                                    {file.name}
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div key={index} className="relative">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-14 bg-gray-100 border rounded flex items-center justify-center text-xl hover:bg-gray-200 transition-colors cursor-pointer"
                                    style={{ aspectRatio: '4/3' }}
                                  >
                                    📄
                                  </a>
                                  <div className="text-xs text-gray-500 truncate mt-1 max-w-20" title={file.name}>
                                    {file.name}
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                      
                      {/* Text content below files */}
                      {msg.text && (
                        <div className="word-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto', lineHeight: '1.5' }}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Display text only if no files are present */}
                  {msg.text && (!msg.files || msg.files.length === 0) && (
                    <div className="word-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto', lineHeight: '1.5' }}>
                      {msg.text}
                    </div>
                  )}
                  
                  {/* Backward compatibility - display single file if using old format */}
                  {msg.fileUrl && !msg.files && (
                    (() => {
                      const ext = msg.fileName?.split('.').pop()?.toLowerCase();
                      if (ext === 'pdf') {
                        return (
                          <div className="inline-block">
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                              title={`Open ${msg.fileName || 'PDF Document'}`}
                            >
                              <span className="text-red-500">📄</span>
                              <span className="max-w-[150px] truncate font-medium">
                                {msg.fileName || 'PDF Document'}
                              </span>
                            </a>
                          </div>
                        );
                      } else if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext || '')) {
                        return (
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName}
                            className="max-w-xs max-h-32 rounded border"
                            style={{ maxWidth: '200px' }}
                          />
                        );
                      } else {
                        return (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline break-all text-sm"
                          >
                            📄 {msg.fileName || 'Open Document'}
                          </a>
                        );
                      }
                    })()
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 whitespace-nowrap ${
                  msg.type === 'user' ? 'self-end' : 'self-start'
                }`}>
                  {formatDisplayTime(msg.timestamp)} • {msg.date}
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {chatMessages.length === 0 && !isTyping && (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                {!projectData && !isLoading && !isContextLoading ? (
                  // Project not found state (only when not loading)
                  <>
                    <div className="text-4xl mb-3">❌</div>
                    <div className="text-lg font-medium text-gray-700 mb-2">Project Not Found</div>
                    <div className="text-sm text-gray-500 mb-4">
                      Unable to load project data. Please check the project ID.
                    </div>
                  </>
                ) : (
                  // Always show loading when data is being fetched or not ready
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <div className="text-lg font-medium text-gray-700 mb-2">Loading...</div>
                    <div className="text-sm text-gray-500 mb-4">
                      Preparing your interview session...
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="max-w-full flex items-start gap-2 self-start flex-row animate-fadeIn">
              {/* Bot Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-md bg-white">
                  <img src="/favicon.svg" alt="Certainti Logo" className="w-5 h-5" />
                </div>
              </div>
              {/* Typing Bubble */}
              <div className="flex flex-col min-w-0 flex-1 max-w-[80%]">
                <div className="p-3 rounded-xl text-base shadow-sm border bg-gray-100 border-gray-200 text-gray-700 rounded-tl-sm max-w-fit">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ 
                        backgroundColor: 'rgba(45,62,79,255)', 
                        animation: 'dotPulse 1.6s ease-in-out infinite',
                        animationDelay: '0ms'
                      }}></div>
                      <div className="w-2 h-2 rounded-full" style={{ 
                        backgroundColor: 'rgba(45,62,79,255)', 
                        animation: 'dotPulse 1.6s ease-in-out infinite',
                        animationDelay: '200ms'
                      }}></div>
                      <div className="w-2 h-2 rounded-full" style={{ 
                        backgroundColor: 'rgba(45,62,79,255)', 
                        animation: 'dotPulse 1.6s ease-in-out infinite',
                        animationDelay: '400ms'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area - only show for user role when session is not ended */}
        {userRole === 'user' && !sessionEnded && (
          <div className="border-t border-gray-200 bg-white">
            {/* Pending Files Display */}
            {pendingFiles.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border"
                      style={{ backgroundColor: 'rgba(237,249,240,255)', borderColor: 'rgba(220,232,255,255)' }}
                    >
                      <span className="truncate max-w-[120px]" style={{ color: 'rgba(45,62,79,255)' }}>
                        📄 {file.name}
                      </span>
                      <button
                        onClick={() => removePendingFile(index)}
                        className="text-red-500 hover:text-red-700 text-sm leading-none w-3 h-3 flex items-center justify-center"
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chat Bar UI - Input Controls */}
            <div className="p-4 flex items-end gap-3">
              {/* Voice Recording Button */}
              <button 
                onClick={handleVoiceRecord}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                  isRecording 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : ''
                }`}
                style={!isRecording ? { background: '#f2603b', color: '#fff' } : {}}
                onMouseOver={e => { if (!isRecording) { (e.currentTarget as HTMLButtonElement).style.background = '#e55a35'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
                onMouseOut={e => { if (!isRecording) { (e.currentTarget as HTMLButtonElement).style.background = '#f2603b'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {/* File Attachment Button */}
              <button
                onClick={handleFileAttach}
                className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                style={{ backgroundColor: '#f2603b', color: '#fff' }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e55a35'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f2603b'; }}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
                multiple
              />
              
              {/* Main Text Input Textarea */}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  chatSession.completed
                    ? "Completed"
                    : chatSession.isActive && chatSession.currentQuestion 
                    ? "Type your answer here..." 
                    : chatSession.isLoading
                    ? "Loading..."
                    : chatSession.isStarted
                    ? "Waiting for next chat..."
                    : "Type a message or use voice to start..."
                }
                disabled={
                  chatSession.completed || 
                  chatSession.isLoading || 
                  (chatSession.isActive && !chatSession.currentQuestion) ||
                  (!chatSession.isActive && !chatSession.isStarted)
                }
                className="flex-grow border rounded-lg p-2 text-base min-h-[40px] max-h-[120px] resize-none outline-none transition-all duration-200 overflow-y-hidden"
                style={{ 
                  borderColor: 'rgba(220,232,255,255)', 
                  backgroundColor: 'white',
                  color: 'rgba(45,62,79,255)'
                }}
                rows={1}
              />
              
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={
                  chatSession.completed ||
                  chatSession.isLoading || 
                  (chatSession.isActive && chatSession.currentQuestion && !message.trim() && pendingFiles.length === 0) ||
                  (!chatSession.isActive && !chatSession.isStarted) ||
                  (!chatSession.isActive && !message.trim() && pendingFiles.length === 0)
                }
                className="w-10 h-10 flex items-center justify-center text-white rounded-lg disabled:cursor-not-allowed transition-colors"
                style={{ 
                  backgroundColor: (
                    chatSession.completed ||
                    chatSession.isLoading || 
                    (chatSession.isActive && chatSession.currentQuestion && !message.trim() && pendingFiles.length === 0) ||
                    (!chatSession.isActive && !chatSession.isStarted) ||
                    (!chatSession.isActive && !message.trim() && pendingFiles.length === 0)
                  ) ? '#d1d5db' : '#f2603b'
                }}
                onMouseOver={e => { 
                  if (!e.currentTarget.disabled) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e55a35';
                  }
                }}
                onMouseOut={e => { 
                  if (!e.currentTarget.disabled) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f2603b';
                  }
                }}
              >
                {chatSession.isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Handle loading states
  if (isLoading || isContextLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">Loading...</div>
          <div className="text-sm text-gray-500">Fetching project data...</div>
        </div>
      </div>
    );
  }

  // Handle error states - project not found
  if (error || contextError || !projectData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-medium text-gray-800 mb-2">Project Not Found</div>
          <div className="text-sm text-gray-600 mb-4">
            The project with ID <span className="font-mono bg-gray-100 px-2 py-1 rounded">{PROJECT_ID}</span> was not found in the database.
          </div>
          <div className="text-xs text-gray-500">
            Please check the project ID and try again, or contact your administrator.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(220,232,255,255)' }}>
      {/* Top Navigation Bar with SME Project Info */}
      <TopNavBar 
        projectId={PROJECT_ID} 
      />

      {/* Main Content Area */}
      <div ref={containerRef} className="flex h-full overflow-hidden">
        {/* Left Panel - Context Timeline */}
        <div 
          className="relative flex flex-col bg-white shadow-lg overflow-hidden"
          style={{ 
            width: `${isLayoutInitialized ? leftPanelWidth : 50}%`,
            minWidth: '25%',
            maxWidth: '75%',
            transition: isLayoutInitialized ? 'none' : 'width 0.1s ease'
          }}
        >
          <div className="w-full h-full border-r-0 flex flex-col bg-white shadow-lg overflow-hidden">
            {/* Fixed Conversation Summary Card */}
            <div className="sticky top-0 z-10 p-4 border-b-0" style={{ backgroundColor: 'rgba(237,249,240,255)' }}>
              <div className="flex items-center justify-between mb-2 w-full">
                <div className="font-semibold text-lg" style={{ color: 'rgba(45,62,79,255)' }}>Summary</div>
                {/* Active/Ended Status Badge */}
                {userRole === 'consultant' && (
                  <div className="rounded-lg shadow-md px-2 py-1" style={{ backgroundColor: '#2d3e4f' }}>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${sessionEnded ? 'bg-red-400' : 'bg-green-400'}`}></div>
                      <span className="text-xs font-medium" style={{ color: '#ffffff' }}>
                        {sessionEnded ? 'Ended' : 'Active'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-xl p-4 shadow-sm border-0 flex flex-col custom-scrollbar" style={{ minHeight: '120px', maxHeight: '220px', overflowY: 'auto', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div className="space-y-3 text-sm w-full">
                  {/* Show only the summary from the project data, not the full TopNavBar */}
                  {/* Use a custom hook to fetch projectData and display summary */}
                  {projectId && <ProjectSummary projectId={projectId} />}
                </div>
              </div>
            </div>

            {/* Context History Header */}
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-lg" style={{ color: 'rgba(45,62,79,255)' }}>
                  Context History
                </div>
                {/* Status Indicators for Consultant View */}
                {userRole === 'consultant' && (
                  <div className="flex gap-2">                    
                    {/* Question Progress */}
                    {chatSession.totalQuestions > 0 && (
                      <div className="rounded-lg shadow-md px-2 py-1" style={{ backgroundColor: '#edf9f0' }}>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2d3e4f' }}></div>
                          <span className="text-xs font-medium" style={{ color: '#2d3e4f' }}>
                            Questions answered: {answeredQuestionNumbers.length}/{chatSession.totalQuestions}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Message Count */}
                    <div className="rounded-lg shadow-md px-2 py-1" style={{ backgroundColor: '#dce8ff' }}>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2d3e4f' }}></div>
                        <span className="text-xs font-medium" style={{ color: '#2d3e4f' }}>
                          {timelineEntries.length} messages
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow p-6 pt-2 overflow-y-auto">
              <div className="relative min-h-[600px]">
                {/* Show timeline conversation flow */}
                {timelineEntries.length > 0 ? (
                  <>
                    {/* Timeline line */}
                    <div className="absolute left-1/2 top-6 bottom-0 w-0.5 bg-gray-200 transform -translate-x-1/2"></div>
                    
                    <div className="space-y-6 mt-6">
                      {timelineEntries.map((entry, index) => (
                        <div
                          key={`${entry.id}-${index}-${entry.type}-${entry.timestamp}`}
                          className={`relative max-w-[80%] ${
                            entry.type === 'user' 
                              ? 'ml-[50%] pl-4' 
                              : 'mr-[50%] pr-4 text-right'
                          }`}
                        >
                          {/* Timeline Dot */}
                          <div className={`absolute w-3 h-3 rounded-full top-3 border-2 border-white shadow-sm ${
                            entry.type === 'user' 
                              ? '-left-[6px]' 
                              : '-right-[6px]'
                          }`} style={entry.type === 'user' ? { backgroundColor: 'rgba(45,62,79,255)' } : { backgroundColor: '#9ca3af' }}></div>
                          
                          {/* Message Bubble */}
                          <div className={`rounded-xl p-3 text-sm shadow-sm border-0 transition-all duration-200 hover:shadow-md break-words ${
                            entry.type === 'user'
                              ? 'text-gray-900'
                              : 'bg-gray-50 text-gray-700'
                          }`} style={entry.type === 'user' ? { backgroundColor: 'rgba(237,249,240,255)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } : { backgroundColor: 'rgba(220,232,255,255)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {entry.text}
                          </div>
                          
                          {/* Timestamp */}
                          <div className={`text-xs text-gray-500 mt-1 whitespace-nowrap ${
                            entry.type === 'bot' ? 'text-left' : 'text-right'
                          }`}>
                            {entry.timestamp} • {entry.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Loading or error state when no conversation history yet */
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center max-w-md">
                      {!projectData && !isLoading && !isContextLoading ? (
                        // Project not found state (only when not loading)
                        <>
                          <div className="text-4xl mb-4">❌</div>
                          <div className="text-lg font-medium text-gray-700 mb-2">Project Not Found</div>
                          <div className="text-sm text-gray-500 mb-4">
                            Project ID: <span className="font-medium text-red-600">{PROJECT_ID}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            This project does not exist in the database. Please verify the project ID.
                          </div>
                        </>
                      ) : (
                        // Always show loading when data is being fetched or not ready
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <div className="text-lg font-medium text-gray-700 mb-2">Loading...</div>
                          <div className="text-sm text-gray-500 mb-4">
                            Project ID: <span className="font-medium text-gray-700">{PROJECT_ID}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Fetching conversation history...
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Custom Resize Handle */}
          <div 
            className="resizable-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidthPercent = leftPanelWidth;
              const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
              
              // Add body class to prevent text selection
              document.body.classList.add('resizing');
              
              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaPercent = (deltaX / containerWidth) * 100;
                const newWidthPercent = startWidthPercent + deltaPercent;
                
                // Set bounds: minimum 25%, maximum 75%
                const minPercent = 25;
                const maxPercent = 75;
                
                if (newWidthPercent >= minPercent && newWidthPercent <= maxPercent) {
                  setLeftPanelWidth(newWidthPercent);
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.classList.remove('resizing');
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>

        {/* Right Panel - Role-based Content */}
        <div 
          className="flex-grow h-full flex flex-col bg-white shadow-lg min-w-0 overflow-hidden"
          style={{
            width: `${isLayoutInitialized ? (100 - leftPanelWidth) : 50}%`,
            transition: isLayoutInitialized ? 'none' : 'width 0.1s ease'
          }}
        >
          {renderRightPanelContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
