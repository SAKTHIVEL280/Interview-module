# Context History Database Integration

## Overview
The Interview Module now stores all conversation history in the MySQL database, ensuring persistence across project switches and page refreshes.

## Database Schema

### Table: `context_history`
```sql
CREATE TABLE `context_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` varchar(50) NOT NULL,
  `message_type` enum('user','bot') NOT NULL,
  `message_text` longtext NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `message_date` date NOT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `files` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_project_timestamp` (`project_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Setup Instructions

1. **Create the database table**:
   ```bash
   mysql -u root -p certaintimaster < database/setup_context_history.sql
   ```

2. **Verify the table exists**:
   ```sql
   USE certaintimaster;
   DESCRIBE context_history;
   ```

## Key Features

### 🔄 **Automatic Persistence**
- All chat messages (user and bot) are automatically saved to database
- Context history loads automatically when switching between projects
- Data persists across page refreshes and browser sessions

### 🚀 **Real-time Synchronization**
- Messages appear immediately in UI (optimistic updates)
- Background database saves ensure persistence
- Failed saves are handled gracefully with user feedback

### 📱 **Project-specific Storage**
- Each project (`projectId`) has its own conversation history
- Switch between projects without losing conversation context
- URL-based project switching: `localhost:8080/1`, `localhost:8080/2`, etc.

### 📁 **File Support**
- Uploaded files are stored as JSON in the `files` column
- File metadata includes URL and original filename
- Full support for multiple file types (images, PDFs, documents)

## API Endpoints

### GET `/api/context-history/:projectId`
- **Purpose**: Retrieve all context history for a project
- **Response**: Array of context history entries
- **Usage**: Automatically called when loading a project

### POST `/api/context-history`
- **Purpose**: Save a new context history entry
- **Body**: 
  ```json
  {
    "projectId": "3000609",
    "messageType": "user|bot",
    "messageText": "Message content",
    "files": [{"url": "...", "name": "..."}], // optional
    "sessionId": "session_identifier" // optional
  }
  ```

### DELETE `/api/context-history/:projectId`
- **Purpose**: Clear all context history for a project
- **Usage**: Administrative/debugging purposes

## Frontend Integration

### New Hook: `useContextHistory`
```typescript
const { 
  contextHistory,      // Array of context entries
  isLoading,          // Loading state
  addContextEntry,    // Function to add new entry
  error               // Error state
} = useContextHistory(projectId);
```

### Usage Example
```typescript
// Add a user message
await addContextEntry('user', 'Hello, how are you?');

// Add a bot response with file
await addContextEntry('bot', 'Here is your document', [
  { url: 'http://...', name: 'document.pdf' }
]);
```

## Data Flow

```
User Input → Frontend State → Database → Context History Timeline
     ↓              ↑              ↓              ↑
   Chat UI     Optimistic      API Call     Real-time
            Updates                        Updates
```

1. **User sends message** → Immediately appears in chat
2. **Background save** → Message saved to database
3. **Project switch** → New project context loaded from database
4. **Page refresh** → Full context history restored

## Testing the Feature

### Test Scenario 1: Basic Persistence
1. Go to `localhost:8080/1`
2. Answer 2 questions in the interview
3. Refresh the page
4. ✅ **Expected**: All previous messages still visible in context history

### Test Scenario 2: Project Switching
1. Go to `localhost:8080/1` and answer some questions
2. Switch to `localhost:8080/2` and answer different questions
3. Switch back to `localhost:8080/1`
4. ✅ **Expected**: Original conversation for project 1 is restored

### Test Scenario 3: File Uploads
1. Upload files during conversation
2. Refresh or switch projects and return
3. ✅ **Expected**: File attachments are preserved and clickable

## Database Queries for Debugging

### View all context history:
```sql
SELECT project_id, message_type, LEFT(message_text, 50) as preview, timestamp 
FROM context_history 
ORDER BY timestamp DESC;
```

### View history for specific project:
```sql
SELECT * FROM context_history 
WHERE project_id = '3000609' 
ORDER BY timestamp ASC;
```

### Count messages per project:
```sql
SELECT project_id, COUNT(*) as message_count 
FROM context_history 
GROUP BY project_id;
```

### Clear history for a project (if needed):
```sql
DELETE FROM context_history WHERE project_id = '3000609';
```

## Benefits

✅ **Seamless User Experience**: No data loss when switching between projects  
✅ **Reliable Persistence**: Database storage ensures data survives crashes  
✅ **Scalable Architecture**: Designed to handle multiple concurrent users  
✅ **File Support**: Complete preservation of uploaded files and metadata  
✅ **Performance Optimized**: Efficient indexing for fast queries  
✅ **Error Handling**: Graceful degradation if database is unavailable  

## Future Enhancements

- 🔄 Session management for multiple concurrent interviews
- 📊 Analytics and reporting on conversation patterns
- 🗑️ Automatic cleanup of old conversation data
- 🔐 User-specific access controls and permissions
- ⚡ Real-time collaboration features
