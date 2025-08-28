# Textarea Placeholder Fix

## Problem
The textarea was showing "Preparing interview questions..." which appeared unprofessional and confusing to users.

## Root Cause
The placeholder logic was using a generic "Preparing interview questions..." message for any state that wasn't actively loading or showing a question, which included the initial state before the interview started.

## Solution
Implemented a more comprehensive and professional placeholder system that provides appropriate messaging for each interview state.

## Changes Made

### 1. Enhanced Placeholder Logic
```tsx
// BEFORE
placeholder={
  chatSession.isActive && chatSession.currentQuestion 
    ? "Type your answer here..." 
    : chatSession.isLoading
    ? "Starting interview..."
    : "Preparing interview questions..."  // ← Generic, confusing message
}

// AFTER
placeholder={
  chatSession.completed
    ? "Interview completed"               // ← Clear completion state
    : chatSession.isActive && chatSession.currentQuestion 
    ? "Type your answer here..." 
    : chatSession.isLoading
    ? "Starting interview..."
    : chatSession.isStarted
    ? "Waiting for next question..."      // ← Between questions
    : "Loading..."                        // ← Initial loading state
}
```

### 2. Improved Textarea Disabled Logic
```tsx
// BEFORE
disabled={chatSession.isLoading || (chatSession.isActive && !chatSession.currentQuestion)}

// AFTER
disabled={
  chatSession.completed ||                           // ← Disable after completion
  chatSession.isLoading || 
  (chatSession.isActive && !chatSession.currentQuestion) ||
  (!chatSession.isActive && !chatSession.isStarted) // ← Disable before start
}
```

### 3. Enhanced Send Button Logic
```tsx
// BEFORE
disabled={
  chatSession.isLoading || 
  (chatSession.isActive && chatSession.currentQuestion && !message.trim() && pendingFiles.length === 0) ||
  (!chatSession.isActive && !message.trim() && pendingFiles.length === 0)
}

// AFTER
disabled={
  chatSession.completed ||                           // ← Disable after completion
  chatSession.isLoading || 
  (chatSession.isActive && chatSession.currentQuestion && !message.trim() && pendingFiles.length === 0) ||
  (!chatSession.isActive && !chatSession.isStarted) || // ← Disable before start
  (!chatSession.isActive && !message.trim() && pendingFiles.length === 0)
}
```

## State-Specific Placeholders

| Interview State | Placeholder Message | Purpose |
|----------------|-------------------|---------|
| **Initial Loading** | "Loading..." | When app is starting up |
| **Starting Interview** | "Starting interview..." | When `isLoading: true` |
| **Active Question** | "Type your answer here..." | When user can answer |
| **Between Questions** | "Waiting for next question..." | When `isStarted: true` but no current question |
| **Interview Complete** | "Interview completed" | When `completed: true` |

## Benefits

✅ **Professional Messaging**: No more confusing "Preparing interview questions..."
✅ **Clear State Communication**: Users understand exactly what's happening
✅ **Proper Input Control**: Textarea disabled when input isn't expected
✅ **Consistent UI Logic**: Send button and textarea states are synchronized
✅ **Better UX**: Clear feedback for each stage of the interview process

## User Experience Improvements

- **Before**: Confusing "Preparing interview questions..." message
- **After**: Clear, contextual messages that guide the user through the interview process
- **Result**: Professional, intuitive interface that communicates status effectively

The fix ensures users always know what's expected of them at each stage of the interview process.
