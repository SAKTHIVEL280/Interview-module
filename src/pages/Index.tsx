/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Paperclip, Send } from 'lucide-react';
import { useParams } from 'react-router-dom';
import TopNavBar from '@/components/TopNavBar';
import ProjectSummary from '@/components/ProjectSummary';
import { useProjectData } from '@/hooks/use-project-data';

interface TimelineEntry {
  id: number;
  type: 'user' | 'bot';
  text: string;
  timestamp: string;
  date: string;
}

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
  // Get project ID from URL parameter (e.g., /3000609)
  const { projectId } = useParams<{ projectId: string }>();
  
  // Use project ID from URL, fallback to default if none provided
  const PROJECT_ID = projectId || "3000609";
  
  // Load project data to ensure it's available before starting chat
  const { projectData, isLoading, error } = useProjectData(PROJECT_ID);
  
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [messageCounter, setMessageCounter] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [leftPanelWidth, setLeftPanelWidth] = useState(400); // Default fixed size
  
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
    isLoading: false
  });
  
  // AI-powered question rephrasing function
  const rephraseQuestionWithAI = async (originalQuestion: string): Promise<string> => {
    try {
      const API_KEY = "AIzaSyDJ9185yjRgJ5ykjv3FEdNJzutWX2tZQPE";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
      
      const prompt = `You are an expert interviewer. I need you to completely rewrite this question using totally different words and structure, but asking for the exact same information.

ORIGINAL QUESTION: "${originalQuestion}"

IMPORTANT RULES:
1. DO NOT use the same starting words (What, How, Why, etc.)
2. DO NOT just add prefixes like "Can you tell me" or "I'd like to know"
3. CREATE a completely new sentence structure
4. USE simple, everyday words that everyone understands
5. AVOID fancy or complicated vocabulary
6. MAKE it sound like a casual, friendly conversation
7. KEEP it as one clear question
8. USE words a 16-year-old would understand

EXAMPLES:
- Instead of "What kind of food does John like?" → "Tell me about the food John enjoys"
- Instead of "What is Sarah's favorite color?" → "Which color does Sarah like best?"
- Instead of "How does this work?" → "Walk me through how this happens"

REWRITTEN QUESTION (use simple words only):`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        let rephrasedQuestion = data.candidates[0].content.parts[0].text.trim();
        
        // Clean up the response - remove any extra text and formatting
        rephrasedQuestion = rephrasedQuestion.replace(/^REWRITTEN QUESTION[:\s]*/i, '');
        rephrasedQuestion = rephrasedQuestion.replace(/^Question[:\s]*/i, '');
        rephrasedQuestion = rephrasedQuestion.replace(/^Answer[:\s]*/i, '');
        rephrasedQuestion = rephrasedQuestion.replace(/^\*+\s*/, '');
        rephrasedQuestion = rephrasedQuestion.replace(/\*+$/, '');
        rephrasedQuestion = rephrasedQuestion.replace(/^["']|["']$/g, '');
        rephrasedQuestion = rephrasedQuestion.trim();
        
        // Split by lines and take only the first meaningful line
        const lines = rephrasedQuestion.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          rephrasedQuestion = lines[0].trim();
        }
        
        // Ensure it ends with a question mark
        if (!rephrasedQuestion.endsWith('?')) {
          rephrasedQuestion += '?';
        }
        
        // Validate that the rephrased question is actually different
        const originalWords = originalQuestion.toLowerCase().split(' ');
        const rephrasedWords = rephrasedQuestion.toLowerCase().split(' ');
        const commonWords = originalWords.filter(word => rephrasedWords.includes(word));
        
        // If too many words are the same, try fallback
        if (commonWords.length > originalWords.length * 0.7) {
          console.log('AI rephrasing too similar, using creative fallback');
          return getCreativeFallbackRephrasing(originalQuestion);
        }
        
        console.log('AI Rephrasing successful:', { original: originalQuestion, rephrased: rephrasedQuestion });
        return rephrasedQuestion;
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error('AI rephrasing failed:', error);
      
      // Fallback to creative rephrasing if AI fails
      return getCreativeFallbackRephrasing(originalQuestion);
    }
  };

  // Creative fallback rephrasing function - works for ANY question type
  const getCreativeFallbackRephrasing = (originalQuestion: string): string => {
    const questionLower = originalQuestion.toLowerCase();
    
    // Extract person's name if present
    const personMatch = originalQuestion.match(/(\w+)'s/);
    const person = personMatch ? personMatch[1] : null;
    
    // Create multiple variation patterns that work for any question
    const patterns = [
      // Pattern 1: Change question starters
      {
        from: /^What (is|are|does|do|did|was|were)/i,
        to: ["Tell me", "Share", "Let me know", "I want to know", "Help me understand"]
      },
      {
        from: /^How (is|are|does|do|did|was|were|can|could|would|will)/i,
        to: ["Show me how", "Explain how", "Walk me through how", "Help me understand how"]
      },
      {
        from: /^Why (is|are|does|do|did|was|were|can|could|would|will)/i,
        to: ["Help me understand why", "Explain why", "Tell me why", "I want to know why"]
      },
      {
        from: /^Which/i,
        to: ["Tell me which", "Share which", "Let me know which", "I want to know which"]
      },
      {
        from: /^Who/i,
        to: ["Tell me who", "Share who", "Let me know who", "I want to know who"]
      },
      {
        from: /^Where/i,
        to: ["Tell me where", "Share where", "Let me know where", "I want to know where"]
      },
      {
        from: /^When/i,
        to: ["Tell me when", "Share when", "Let me know when", "I want to know when"]
      }
    ];
    
    // Try to apply pattern-based rephrasing
    for (const pattern of patterns) {
      if (pattern.from.test(originalQuestion)) {
        const replacement = pattern.to[Math.floor(Math.random() * pattern.to.length)];
        let result = originalQuestion.replace(pattern.from, replacement);
        
        // Clean up the result
        result = result.replace(/\?$/, '');
        
        // Add person-specific variations if person is found
        if (person) {
          const personVariations = [
            ` about ${person}`,
            ` regarding ${person}`,
            ` concerning ${person}`,
            ` when it comes to ${person}`
          ];
          
          // Sometimes add person context
          if (Math.random() > 0.5) {
            result += personVariations[Math.floor(Math.random() * personVariations.length)];
          }
        }
        
        // Ensure it ends with a question mark
        if (!result.endsWith('?')) {
          result += '?';
        }
        
        return result;
      }
    }
    
    // If no pattern matches, use generic transformations
    const genericTransformations = [
      // Simple replacements
      originalQuestion.replace(/^What's/, "Tell me what").replace(/\?$/, '?'),
      originalQuestion.replace(/^What/, "Share").replace(/\?$/, '?'),
      originalQuestion.replace(/^How/, "Explain how").replace(/\?$/, '?'),
      
      // Add conversation starters
      `Can you tell me ${originalQuestion.toLowerCase().replace(/^(what|how|why|which|who|where|when)\s+/i, '')}`,
      `I'd like to know ${originalQuestion.toLowerCase().replace(/^(what|how|why|which|who|where|when)\s+/i, '')}`,
      `Could you share ${originalQuestion.toLowerCase().replace(/^(what|how|why|which|who|where|when)\s+/i, '')}`,
      
      // Flip the structure
      `Please tell me ${originalQuestion.toLowerCase().replace(/\?$/, '')}?`,
      `I want to understand ${originalQuestion.toLowerCase().replace(/\?$/, '')}?`,
      `Help me learn ${originalQuestion.toLowerCase().replace(/\?$/, '')}?`
    ];
    
    let result = genericTransformations[Math.floor(Math.random() * genericTransformations.length)];
    
    // Ensure it ends with a question mark
    if (!result.endsWith('?')) {
      result += '?';
    }
    
    return result;
  };
  
  const recognitionRef = useRef<any>(null);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${ampm}`;
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
          isLoading: false
        }));
        
        // Add welcome message (but don't add to timeline)
        const welcomeMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: `Hello!`,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        
        setChatMessages([welcomeMessage]);
        // Don't add welcome message to timeline - keep timeline empty initially
        setTimelineEntries([]);
        
        // Get first question
        await getNextQuestion();
      } else {
        setChatSession(prev => ({ ...prev, isLoading: false }));
        console.error('Failed to start chat session:', data.error);
        
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: `Sorry, there was an error starting the interview: ${data.error || 'Unknown error'}. Please refresh the page to try again.`,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        setChatMessages([errorMessage]);
      }
    } catch (error) {
      setChatSession(prev => ({ ...prev, isLoading: false }));
      console.error('Error starting chat session:', error);
      
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
        if (data.is_retry) {
          console.log('Question retry detected, using AI to rephrase:', data.question);
          try {
            // Use AI to rephrase the question completely differently
            questionText = await rephraseQuestionWithAI(data.question);
            console.log('AI rephrasing completed:', questionText);
          } catch (error) {
            console.error('AI rephrasing failed, using fallback:', error);
            // Fallback already handled in the rephraseQuestionWithAI function
            questionText = getCreativeFallbackRephrasing(data.question);
          }
        }
        
        // Add question to chat
        const questionMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: questionText,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        
        setChatMessages(prev => [...prev, questionMessage]);
        
        // Add question to timeline (context history)
        const questionTimelineEntry: TimelineEntry = {
          id: Date.now() + 1, // Ensure unique ID
          type: 'bot',
          text: questionText,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        
        setTimelineEntries(prev => [...prev, questionTimelineEntry]);
      }
    } catch (error) {
      console.error('Error getting next question:', error);
    }
  };

  const submitAnswerToBot = async (answer: string) => {
    setChatSession(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch('http://localhost:5000/api/chat/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add ALL answers to timeline (both correct and incorrect)
        const timelineEntry: TimelineEntry = {
          id: Date.now(),
          type: 'user',
          text: answer,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        setTimelineEntries(prev => [...prev, timelineEntry]);
        
        // Update progress
        setChatSession(prev => ({
          ...prev,
          progress: data.progress,
          isLoading: false
        }));
        
        // Get next question after a delay (regardless of correctness)
        setTimeout(() => {
          getNextQuestion();
        }, data.valid ? 500 : 500); // Same short delay for both correct and incorrect answers
      } else {
        setChatSession(prev => ({ ...prev, isLoading: false }));
        console.error('Failed to submit answer:', data.error);
      }
    } catch (error) {
      setChatSession(prev => ({ ...prev, isLoading: false }));
      console.error('Error submitting answer:', error);
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
          currentQuestion: null
        }));
        
        const completionMessage: ChatMessage = {
          id: Date.now(),
          type: 'bot',
          text: `🎉 All done! Thank you for your responses. Your enhanced summary has been generated and saved.`,
          timestamp: getCurrentTime(),
          date: getCurrentDate()
        };
        
        setChatMessages(prev => [...prev, completionMessage]);
      }
    } catch (error) {
      console.error('Error completing chat:', error);
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
      // Q-Bot mode: submit answer
      if (!message.trim()) return;
      
      const userMessage: ChatMessage = {
        id: Date.now(),
        type: 'user',
        text: message.trim(),
        timestamp: getCurrentTime(),
        date: getCurrentDate()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      const answerText = message.trim();
      setMessage('');
      
      await submitAnswerToBot(answerText);
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

    const userTimelineEntry: TimelineEntry = {
      id: currentMessageCounter + 1,
      type: 'user',
      text: message.trim() || `Uploaded ${uploadedFileUrls.length} file${uploadedFileUrls.length > 1 ? 's' : ''}: ${uploadedFileUrls.map(f => f.name).join(', ')}`,
      timestamp: getCurrentTime(),
      date: getCurrentDate()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setTimelineEntries(prev => [...prev, userTimelineEntry]);

    currentMessageCounter += 2;

    // Clear message and pending files
    setMessage('');
    setPendingFiles([]);
    setMessageCounter(currentMessageCounter);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Simulate bot response
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: currentMessageCounter,
        type: 'bot',
        text: 'Thank you for your message. I\'m processing your request and will provide you with a detailed response.',
        timestamp: getCurrentTime(),
        date: getCurrentDate()
      };

      const botTimelineEntry: TimelineEntry = {
        id: currentMessageCounter,
        type: 'bot',
        text: 'Thank you for your message. I\'m processing your request and will provide you with a detailed response.',
        timestamp: getCurrentTime(),
        date: getCurrentDate()
      };

      setChatMessages(prev => [...prev, botResponse]);
      setTimelineEntries(prev => [...prev, botTimelineEntry]);
    }, 1000);
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

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setMessage(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        recognition.stop();
        alert('Speech recognition error: ' + event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
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

  // Handle window resize to maintain proper panel sizing
  useEffect(() => {
    const DEFAULT_LEFT_WIDTH = 400;
    const handleResize = () => {
      const minRightPanelWidth = Math.max(320, window.innerWidth * 0.25); // At least 25% of screen or 320px
      const maxLeftWidth = window.innerWidth - minRightPanelWidth;
      setLeftPanelWidth(prevWidth => {
        if (prevWidth > maxLeftWidth) {
          return maxLeftWidth;
        } else if (prevWidth < DEFAULT_LEFT_WIDTH) {
          return DEFAULT_LEFT_WIDTH;
        }
        return prevWidth;
      });
    };

    handleResize(); // Call on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(220,232,255,255)' }}>
      {/* Top Navigation Bar with SME Project Info */}
      <TopNavBar projectId={PROJECT_ID} />

      {/* Main Content Area */}
      <div className="flex h-full overflow-hidden">
        {/* Left Panel - Context Timeline */}
        <div 
          className="relative flex flex-col bg-white shadow-lg overflow-hidden"
          style={{ width: `${leftPanelWidth}px`, minWidth: '400px', maxWidth: `${window.innerWidth - Math.max(320, window.innerWidth * 0.25)}px` }}
        >
          <div className="w-full h-full border-r-0 flex flex-col bg-white shadow-lg overflow-hidden">
            {/* Fixed Conversation Summary Card */}
            <div className="sticky top-0 z-10 p-4 border-b-0" style={{ backgroundColor: 'rgba(237,249,240,255)' }}>
              <div className="font-semibold text-lg mb-2 w-full text-left" style={{ color: 'rgba(45,62,79,255)' }}>Summary</div>
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
              <div className="font-semibold text-lg mb-4" style={{ color: 'rgba(45,62,79,255)' }}>Context History</div>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-grow p-6 pt-2 overflow-y-auto">
              <div className="relative min-h-[600px]">
                {/* Show timeline line only when there are entries */}
                {timelineEntries.length > 0 && (
                  <div className="absolute left-1/2 top-6 bottom-0 w-0.5 bg-gray-200 transform -translate-x-1/2"></div>
                )}
                
                <div className="space-y-6 mt-6">
                  {timelineEntries.map((entry) => (
                    <div
                      key={entry.id}
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
              </div>
            </div>
          </div>
          
          {/* Custom Resize Handle */}
          <div 
            className="resizable-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = leftPanelWidth;
              
              // Add body class to prevent text selection
              document.body.classList.add('resizing');
              
              const handleMouseMove = (e: MouseEvent) => {
                const newWidth = startWidth + (e.clientX - startX);
                const minWidth = 400;
                const maxWidth = window.innerWidth - Math.max(320, window.innerWidth * 0.25);
                
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                  setLeftPanelWidth(newWidth);
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

        {/* Right Panel - Chat Area */}
        <div className="flex-grow h-full flex flex-col bg-white shadow-lg min-w-0 overflow-hidden">
          {/* Chat Messages */}
          <div 
            ref={chatMessagesRef}
            className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 min-h-[400px]"
          >
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
                    {msg.timestamp} • {msg.date}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
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
            
            {/* Input Controls */}
            <div className="p-4 flex items-end gap-3">
            <button 
              onClick={handleVoiceRecord}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : ''
              }`}
              style={!isRecording ? { background: '#f2603b', color: '#fff' } : {}}
              onMouseOver={e => { if (!isRecording) { (e.currentTarget as HTMLButtonElement).style.background = '#f2603b'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
              onMouseOut={e => { if (!isRecording) { (e.currentTarget as HTMLButtonElement).style.background = '#f2603b'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; } }}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleFileAttach}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: '#f2603b', color: '#fff' }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e55a35'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f2603b'; }}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
              multiple
            />
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                chatSession.isActive && chatSession.currentQuestion 
                  ? "Type your answer here..." 
                  : chatSession.isLoading
                  ? "Starting interview..."
                  : "Preparing interview questions..."
              }
              disabled={chatSession.isLoading || (chatSession.isActive && !chatSession.currentQuestion)}
              className="flex-grow border rounded-lg p-2 text-base min-h-[40px] max-h-[120px] resize-none outline-none transition-all duration-200 overflow-y-hidden"
              style={{ 
                borderColor: 'rgba(220,232,255,255)', 
                backgroundColor: 'white',
                color: 'rgba(45,62,79,255)'
              }}
              rows={1}
            />
            
            <button
              onClick={handleSend}
              disabled={
                chatSession.isLoading || 
                (chatSession.isActive && chatSession.currentQuestion && !message.trim()) ||
                (!chatSession.isActive && !message.trim() && pendingFiles.length === 0)
              }
              className="w-10 h-10 flex items-center justify-center text-white rounded-lg disabled:cursor-not-allowed transition-colors"
              style={{ 
                backgroundColor: (
                  chatSession.isLoading || 
                  (chatSession.isActive && chatSession.currentQuestion && !message.trim()) ||
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
        </div>
      </div>
    </div>
  );
};

export default Index;
