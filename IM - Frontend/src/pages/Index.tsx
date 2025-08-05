/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Paperclip, Send, ChevronDown } from 'lucide-react';

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
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: 0,
    type: 'bot',
    text: "Hello! I'm your AI assistant. How can I help you today?",
    timestamp: (() => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      return `${hours}:${minutes} ${ampm}`;
    })(),
    date: (() => {
      const now = new Date();
      return now.toISOString().split('T')[0];
    })(),
  }]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [messageCounter, setMessageCounter] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

  const handleSend = async () => {
    // Check if there's either a message or pending files
    if (!message.trim() && pendingFiles.length === 0) return;

    // If mic is recording, turn it off first
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }

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
          const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          uploadedFileUrls.push({ url: data.url, name: file.name });
        } catch (error) {
          alert(`Upload failed for file: ${file.name}`);
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
      // Send if there is a message or pending files
      if (message.trim() || pendingFiles.length > 0) {
        handleSend();
      } else if (isRecording) {
        // If mic is on but no message, just turn off mic
        setIsRecording(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
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

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(220,232,255,255)' }}>
      {/* Top Navigation Bar with SME Project Info */}
      <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor: 'rgba(45,62,79,255)', minHeight: '64px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', padding: '0' }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(2, auto)',
            gap: 'min(10px, 1vw)',
            width: '100%',
            maxWidth: '100vw',
            alignItems: 'start',
            fontSize: 'clamp(9px, 1.2vw, 13px)',
            margin: '0 auto',
            padding: 'min(10px, 2vw)',
            boxSizing: 'border-box',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Project Id</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>2003001</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Project Number</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>TT2P001</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Project Ref Id</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Y.LL2100234</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Account ID</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>1001002</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Account Name</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', display: 'block', lineHeight: 1.2, maxHeight: '2.5em' }}>True Tech AI Solutions Inc - US</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Country</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>USA</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Currency</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>USD</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Industry</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Health Care</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Program Name</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', display: 'block', lineHeight: 1.2, maxHeight: '2.5em' }}>Virginia Casualty Management Company</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Status</span>
            <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#4ade80', fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Active</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-full overflow-hidden">
        {/* Left Panel - Context Timeline */}
        <div className="w-[30%] h-full border-r-0 flex flex-col bg-white shadow-lg">
          {/* Fixed Conversation Summary Card */}
          <div className="sticky top-0 z-10 p-6 border-b-0" style={{ backgroundColor: 'rgba(237,249,240,255)' }}>
            <div className="rounded-xl p-4 shadow-sm border-0 flex flex-col items-center" style={{ minHeight: '120px', maxHeight: '220px', overflowY: 'auto', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div className="font-semibold text-lg mb-3 w-full text-center" style={{ color: 'rgba(45,62,79,255)' }}>Summary</div>
              <div className="space-y-3 text-sm w-full">
                {/* Notes or summary content goes here. If empty, show placeholders. */}
                <div className="h-4 bg-transparent"></div>
                <div className="h-4 bg-transparent"></div>
                <div className="h-4 bg-transparent"></div>
                <div className="h-4 bg-transparent"></div>
                <div className="h-4 bg-transparent"></div>
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
                    <div className={`text-xs text-gray-500 mt-1 ${
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

        {/* Right Panel - Chat Area */}
        <div className="w-[70%] h-full flex flex-col bg-white shadow-lg">
          {/* Chat Header Removed */}

          {/* Chat Messages */}
          <div 
            ref={chatMessagesRef}
            className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 min-h-[400px]"
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[70%] flex items-start gap-2 ${
                  msg.type === 'bot' ? 'self-start flex-row' : 'self-end flex-row-reverse'
                }`}
              >
                {/* Profile Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  {msg.type === 'bot' ? (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-md" style={{ backgroundColor: 'rgba(45,62,79,255)' }}>
                      AI
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-md" style={{ backgroundColor: 'rgba(237,249,240,255)', color: 'rgba(45,62,79,255)' }}>
                      U
                    </div>
                  )}
                </div>
                {/* Message Bubble and Timestamp */}
                <div className="flex flex-col">
                  <div className={`p-3 rounded-xl text-base shadow-sm border transition-all duration-200 hover:shadow-md break-words ${
                    msg.type === 'bot'
                      ? 'bg-gray-100 border-gray-200 text-gray-700 rounded-tl-sm'
                      : 'rounded-tr-sm'
                  }`} style={msg.type === 'user' ? { backgroundColor: 'rgba(237,249,240,255)', border: '1px solid #d1fae5', color: '#065f46' } : {}}>
                    
                    {/* Display files if they exist - Files first, then text */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="mb-3">
                        <div className="grid grid-cols-4 gap-2 max-w-2xl">
                          {msg.files.map((file, index) => {
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            if (ext === 'pdf') {
                              return (
                                <div key={index} className="relative">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-14 border rounded overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                                    style={{ aspectRatio: '4/3' }}
                                  >
                                    <iframe
                                      src={file.url}
                                      title={file.name}
                                      className="w-full h-full text-xs pointer-events-none"
                                    />
                                  </a>
                                  <div className="text-xs text-gray-500 truncate mt-1 max-w-20" title={file.name}>
                                    {file.name}
                                  </div>
                                </div>
                              );
                            } else if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext || '')) {
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
                      </div>
                    )}
                    
                    {/* Display text below files */}
                    {msg.text && (
                      <div>
                        {msg.text}
                      </div>
                    )}
                    
                    {/* Backward compatibility - display single file if using old format */}
                    {msg.fileUrl && !msg.files && (
                      (() => {
                        const ext = msg.fileName?.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') {
                          return (
                            <iframe
                              src={msg.fileUrl}
                              title={msg.fileName}
                              className="w-full h-32 border rounded"
                              style={{ minWidth: '150px', maxWidth: '300px' }}
                            />
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
                  <div className={`text-xs text-gray-500 mt-1 ${
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
              placeholder="Type your response..."
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
              disabled={!message.trim() && pendingFiles.length === 0}
              className="w-10 h-10 flex items-center justify-center text-white rounded-lg disabled:cursor-not-allowed transition-colors"
              style={{ 
                backgroundColor: (!message.trim() && pendingFiles.length === 0) ? '#d1d5db' : '#f2603b'
              }}
              onMouseOver={e => { 
                if (message.trim() || pendingFiles.length > 0) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e55a35';
                }
              }}
              onMouseOut={e => { 
                if (message.trim() || pendingFiles.length > 0) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f2603b';
                }
              }}
            >
              <Send className="w-5 h-5" />
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
