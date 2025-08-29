
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname); // Go up one level to project root

// Ensure uploads directory exists
const uploadsDir = path.join(projectRoot, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

// Ensure data directory exists
const dataDir = path.join(projectRoot, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log('Created data directory');
}

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'certaintimaster',
  port: 3306
};

// Serve uploaded files
app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));

// Serve generated JSON files
app.use('/json', express.static(dataDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Serve generated text files
app.use('/text', express.static(dataDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.txt')) {
      res.setHeader('Content-Type', 'text/plain');
    }
  }
}));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Project data endpoint
app.get('/api/project/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Fetching project data for ID: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established');
    
    const projectQuery = `
      SELECT 
        p.projectId, p.projectCode, p.projectName,
        c.companyIdentifier, c.companyName, c.billingCountry,
        c.currency, c.industry, c.status
      FROM projects p
      INNER JOIN company c ON p.companyId = c.companyId
      WHERE p.projectId = ?
    `;

    const summaryQuery = `
      SELECT summary FROM master_project_ai_summary_sections WHERE projectid = ? 
    `;

    console.log('Executing project query...');
    const [projectRows] = await connection.execute(projectQuery, [projectId]);
    console.log(`Project query returned ${projectRows.length} rows`);
    
    console.log('Executing summary query...');
    const [summaryRows] = await connection.execute(summaryQuery, [projectId]);
    console.log(`Summary query returned ${summaryRows.length} rows`);

    if (projectRows.length > 0) {
      const result = projectRows[0];
      const refId = 'Y.LL' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  const summary = summaryRows.length > 4 ? summaryRows[4].summary : null;
      const projectData = {
        projectId: result.projectId,
        projectNumber: result.projectCode,
        projectRefId: refId,
        accountId: result.companyIdentifier,
        accountName: result.companyName,
        country: result.billingCountry,
        currency: result.currency,
        industry: result.industry,
        programName: result.projectName,
        status: result.status,
        summary: summary
      };
      console.log('Successfully fetched project data:', projectData);

      // ✨ NEW: Generate text files automatically when project data is fetched
      console.log('🔄 Auto-generating text files...');
      try {
        // Step 1: Get and save section summaries
        console.log('[1/2] Fetching section summaries...');
        const sectionSummaryDict = await getProjectSummaryBySections(connection, projectId);
        const summaryFilePath = saveSectionSummaries(sectionSummaryDict, projectId);
        
        // Step 2: Get and save interactions
        console.log('[2/2] Fetching interactions...');
        const interactions = await getProjectInteractions(connection, projectId);
        const interactionsFilePath = saveInteractionsText(interactions, projectId);
        
        console.log('✅ Text files auto-generated successfully!');
        
        // Add JSON file information to the response
        projectData.jsonFiles = {
          sectionSummaries: summaryFilePath ? `summary.txt` : null,
          interactions: interactionsFilePath ? `question.txt` : null,
          downloadUrls: {
            sectionSummaries: summaryFilePath ? `http://localhost:${PORT}/text/summary.txt` : null,
            interactions: interactionsFilePath ? `http://localhost:${PORT}/text/question.txt` : null
          },
          stats: {
            sectionsCount: Object.keys(sectionSummaryDict).length,
            interactionsCount: interactions.length,
            usedFillerContent: {
              summary: Object.keys(sectionSummaryDict).length === 0,
              questions: interactions.length === 0
            }
          }
        };
      } catch (jsonError) {
        console.error('⚠️ Error generating JSON files:', jsonError);
        // Don't fail the main request if JSON generation fails
        projectData.jsonFiles = {
          error: 'Failed to generate JSON files',
          message: jsonError.message
        };
      }

      res.json({ success: true, data: projectData });
    } else {
      console.log(`No project found with ID: ${projectId}`);
      res.status(404).json({ 
        success: false, 
        error: `No project found with ID: ${projectId}`,
        message: `Project "${projectId}" does not exist in the system. Please verify the project ID and try again.`,
        errorCode: 'PROJECT_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Error fetching project data:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Database not available, returning mock data');
      const mockData = {
        projectId: req.params.projectId,
        projectNumber: 'PJT-MOCK',
        projectRefId: 'Y.LL' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
        accountId: 'MOCK-001',
        accountName: 'Mock Company Inc.',
        country: 'United States',
        currency: 'USD',
        industry: 'Technology',
        programName: 'Mock Project',
        status: 'Active',
        summary: 'This is mock project data returned when the database is not available.',
        jsonFiles: {
          error: 'Database not available',
          message: 'JSON files cannot be generated without database connection'
        }
      };
      res.json({ success: true, data: mockData });
    } else {
      let errorMessage = 'Database error occurred';
      let statusCode = 500;
      
      if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Database configuration error. Please contact support.';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Database server not found. Please contact support.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection timeout. Please try again later.';
      } else if (error.message && error.message.includes('Connection lost')) {
        errorMessage = 'Database connection lost. Please try again.';
      }
      
      res.status(statusCode).json({ 
        success: false, 
        error: errorMessage,
        message: 'Unable to fetch project data due to a server error. Please try again later.',
        errorCode: 'DATABASE_ERROR'
      });
    }
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('File upload request received');
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    console.log('File uploaded successfully:', url);
    res.json({ url });
  } catch (err) {
    console.error('Error handling upload:', err);
    res.status(500).json({ error: 'Server error during file upload' });
  }
});

// Helper function to get project code
async function getProjectCode(connection, projectId) {
  try {
    // Try to get project code from summary table
    let query = `
      SELECT DISTINCT projectCode 
      FROM master_project_ai_summary 
      WHERE projectId = ?
      LIMIT 1
    `;
    let [results] = await connection.execute(query, [projectId]);
    
    if (results.length > 0 && results[0].projectCode) {
      return results[0].projectCode;
    }
    
    // If not found, try interactions table
    query = `
      SELECT DISTINCT projectCode 
      FROM master_project_ai_interaction 
      WHERE projectId = ?
      LIMIT 1
    `;
    [results] = await connection.execute(query, [projectId]);
    
    if (results.length > 0 && results[0].projectCode) {
      return results[0].projectCode;
    }
    
    return "Unknown";
  } catch (error) {
    console.error('Error getting project code:', error);
    return "Unknown";
  }
}

// Helper function to get project sections and summaries
async function getProjectSummaryBySections(connection, projectId) {
  try {
    const projectCode = await getProjectCode(connection, projectId);
    
    // Try both possible table names
    let query = `
      SELECT section, summary 
      FROM master_project_ai_summary_sections 
      WHERE projectId = ?
    `;
    
    try {
      let [results] = await connection.execute(query, [projectId]);
      
      if (results.length === 0) {
        // If first table returned no results, try the other one
        query = `
          SELECT section, summary 
          FROM master_project_ai_summary 
          WHERE projectId = ?
        `;
        [results] = await connection.execute(query, [projectId]);
      }
      
      if (results.length > 0) {
        // Create dictionary with section as key and summary as value
        const sectionSummaryDict = {};
        results.forEach(row => {
          if (row.section && row.summary) {
            sectionSummaryDict[row.section] = row.summary;
          }
        });
        return sectionSummaryDict;
      } else {
        console.log(`No sections/summaries found for project ID: ${projectId}`);
        return {};
      }
    } catch (tableError) {
      // If first table doesn't exist, try the second one
      query = `
        SELECT section, summary 
        FROM master_project_ai_summary 
        WHERE projectId = ?
      `;
      const [results] = await connection.execute(query, [projectId]);
      
      const sectionSummaryDict = {};
      results.forEach(row => {
        if (row.section && row.summary) {
          sectionSummaryDict[row.section] = row.summary;
        }
      });
      return sectionSummaryDict;
    }
  } catch (error) {
    console.error('Database error in getProjectSummaryBySections:', error);
    return {};
  }
}

// Helper function to get project interactions
async function getProjectInteractions(connection, projectId) {
  try {
    const query = `
      SELECT interaction 
      FROM master_project_ai_interaction 
      WHERE projectId = ?
      ORDER BY id
    `;
    
    const [results] = await connection.execute(query, [projectId]);
    
    if (results.length > 0) {
      // Extract just the interaction texts
      const interactions = results
        .map(row => row.interaction)
        .filter(interaction => interaction); // Filter out null/empty interactions
      return interactions;
    } else {
      console.log(`No interactions found for project ID: ${projectId}`);
      return [];
    }
  } catch (error) {
    console.error('Database error in getProjectInteractions:', error);
    return [];
  }
}

// Helper function to save section summaries to text file
function saveSectionSummaries(sectionSummaryDict, projectId) {
  let textContent = '';
  
  // If no data found, use simple message
  if (Object.keys(sectionSummaryDict).length === 0) {
    console.log(`No section summaries found for project ${projectId}, using no summary message`);
    textContent = `No summary available for project ${projectId}.`;
  } else {
    // Convert the dictionary to formatted text
    for (const [section, summary] of Object.entries(sectionSummaryDict)) {
      textContent += `${section}:\n${summary}\n\n`;
    }
    // Remove trailing newlines
    textContent = textContent.trim();
  }
  
  const filePath = path.join(dataDir, `summary.txt`);
  fs.writeFileSync(filePath, textContent, 'utf-8');
  console.log(`Section summaries saved to data/summary.txt`);
  return filePath;
}

// Helper function to save interactions to text file
function saveInteractionsText(interactions, projectId) {
  let textContent = '';
  
  // If no interactions found, use simple message
  if (interactions.length === 0) {
    console.log(`No interactions found for project ${projectId}, using no questions message`);
    textContent = `No questions available for project ${projectId}.`;
  } else {
    // Convert interactions array to numbered text format
    interactions.forEach((interaction, index) => {
      textContent += `${index + 1}. ${interaction}\n\n`;
    });
    // Remove trailing newlines
    textContent = textContent.trim();
  }
  
  const filePath = path.join(dataDir, `question.txt`);
  fs.writeFileSync(filePath, textContent, 'utf-8');
  console.log(`Interactions saved to data/question.txt`);
  return filePath;
}

// New route to generate text files for a project ID
app.get('/generate/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    
    // Validate that projectId is numeric
    if (!/^\d+$/.test(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID format. Project ID must be numeric.',
        message: 'Please provide a valid numeric project ID.'
      });
    }
    
    console.log(`Generating text files for project ID: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established for text file generation');
    
    // Step 1: Get and save section summaries
    console.log('[1/2] Fetching section summaries...');
    const sectionSummaryDict = await getProjectSummaryBySections(connection, projectId);
    const summaryFilePath = saveSectionSummaries(sectionSummaryDict, projectId);
    
    // Step 2: Get and save interactions
    console.log('[2/2] Fetching interactions...');
    const interactions = await getProjectInteractions(connection, projectId);
    const interactionsFilePath = saveInteractionsText(interactions, projectId);
    
    const response = {
      success: true,
      projectId: projectId,
      message: 'Text files generated successfully',
      files: {
        sectionSummaries: summaryFilePath ? `summary.txt` : null,
        interactions: interactionsFilePath ? `question.txt` : null
      },
      stats: {
        sectionsCount: Object.keys(sectionSummaryDict).length,
        interactionsCount: interactions.length,
        usedFillerContent: {
          summary: Object.keys(sectionSummaryDict).length === 0,
          questions: interactions.length === 0
        }
      },
      downloadUrls: {
        sectionSummaries: summaryFilePath ? `http://localhost:${PORT}/text/summary.txt` : null,
        interactions: interactionsFilePath ? `http://localhost:${PORT}/text/question.txt` : null
      }
    };
    
    console.log('Text files generation complete!');
    res.json(response);
    
  } catch (error) {
    console.error('Error generating text files:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      res.status(503).json({
        success: false,
        error: 'Database connection failed',
        message: 'Unable to connect to the database. Please try again later.',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    } else {
      let errorMessage = 'Server error occurred while generating text files';
      let statusCode = 500;
      
      if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Required database tables not found. Please contact support.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection timeout. Please try again later.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: 'Unable to generate JSON files due to a server error.',
        errorCode: 'GENERATION_ERROR'
      });
    }
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Context History API endpoints
app.get('/api/context-history/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Fetching context history for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT 
        id,
        message_type,
        message_text,
        timestamp,
        message_date,
        files,
        session_id
      FROM context_history 
      WHERE project_id = ? 
      ORDER BY timestamp ASC
    `;
    
    const [rows] = await connection.execute(query, [projectId]);
    
    // Transform the data to match frontend format
    const contextHistory = rows.map(row => ({
      id: row.id,
      type: row.message_type,
      text: row.message_text,
      timestamp: new Date(row.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      date: new Date(row.message_date).toISOString().split('T')[0],
      files: row.files ? JSON.parse(row.files) : undefined,
      sessionId: row.session_id
    }));
    
    console.log(`Retrieved ${contextHistory.length} context history entries`);
    res.json({ success: true, data: contextHistory });
    
  } catch (error) {
    console.error('Error fetching context history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch context history',
      message: 'Unable to retrieve context history from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.post('/api/context-history', async (req, res) => {
  let connection;
  try {
    const { projectId, messageType, messageText, files, sessionId } = req.body;
    
    if (!projectId || !messageType || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, messageType, messageText'
      });
    }
    
    console.log(`Saving context history for project: ${projectId}, type: ${messageType}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const now = new Date();
    const messageDate = now.toISOString().split('T')[0];
    
    const query = `
      INSERT INTO context_history 
      (project_id, message_type, message_text, timestamp, message_date, files, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const filesJson = files ? JSON.stringify(files) : null;
    
    const [result] = await connection.execute(query, [
      projectId,
      messageType,
      messageText,
      now,
      messageDate,
      filesJson,
      sessionId || null
    ]);
    
    console.log(`Context history saved with ID: ${result.insertId}`);
    
    res.json({ 
      success: true, 
      id: result.insertId,
      message: 'Context history saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving context history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save context history',
      message: 'Unable to save context history to database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.delete('/api/context-history/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Clearing context history for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = 'DELETE FROM context_history WHERE project_id = ?';
    const [result] = await connection.execute(query, [projectId]);
    
    console.log(`Cleared ${result.affectedRows} context history entries`);
    
    res.json({ 
      success: true, 
      deletedCount: result.affectedRows,
      message: 'Context history cleared successfully'
    });
    
  } catch (error) {
    console.error('Error clearing context history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear context history',
      message: 'Unable to clear context history from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.delete('/api/context-history/:projectId/duplicates', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Cleaning up duplicate context history for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    // Find and delete duplicate consecutive bot messages with same text
    const duplicateQuery = `
      DELETE h1 FROM context_history h1
      INNER JOIN context_history h2
      WHERE h1.project_id = ? 
      AND h2.project_id = ?
      AND h1.id > h2.id
      AND h1.message_type = 'bot'
      AND h2.message_type = 'bot'
      AND h1.message_text = h2.message_text
      AND h1.timestamp > h2.timestamp
      AND TIMESTAMPDIFF(MINUTE, h2.timestamp, h1.timestamp) < 5
    `;
    
    const [result] = await connection.execute(duplicateQuery, [projectId, projectId]);
    
    console.log(`Cleaned up ${result.affectedRows} duplicate context history entries`);
    
    res.json({ 
      success: true, 
      deletedCount: result.affectedRows,
      message: 'Duplicate context history entries cleaned up successfully'
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicate context history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clean up duplicate context history',
      message: 'Unable to clean up duplicate context history from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Question-Answer Tracking API endpoints
app.get('/api/answered-questions/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Fetching answered questions for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT 
        id,
        question_number,
        question_text,
        answer_text,
        answered_at,
        files,
        session_id
      FROM project_question_answers 
      WHERE project_id = ? AND is_answered = 1
      ORDER BY question_number ASC
    `;
    
    const [rows] = await connection.execute(query, [projectId]);
    
    const answeredQuestions = rows.map(row => ({
      id: row.id,
      questionNumber: row.question_number,
      question: row.question_text,
      answer: row.answer_text,
      answeredAt: new Date(row.answered_at).toLocaleString(),
      files: row.files ? JSON.parse(row.files) : undefined,
      sessionId: row.session_id
    }));
    
    console.log(`Retrieved ${answeredQuestions.length} answered questions`);
    res.json({ success: true, data: answeredQuestions });
    
  } catch (error) {
    console.error('Error fetching answered questions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch answered questions',
      message: 'Unable to retrieve answered questions from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.get('/api/answered-questions/:projectId/numbers', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Fetching answered question numbers for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT question_number 
      FROM project_question_answers 
      WHERE project_id = ? AND is_answered = 1
      ORDER BY question_number ASC
    `;
    
    const [rows] = await connection.execute(query, [projectId]);
    const questionNumbers = rows.map(row => row.question_number);
    
    console.log(`Retrieved ${questionNumbers.length} answered question numbers: [${questionNumbers.join(', ')}]`);
    res.json({ success: true, answeredQuestions: questionNumbers });
    
  } catch (error) {
    console.error('Error fetching answered question numbers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch answered question numbers',
      message: 'Unable to retrieve answered question numbers from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.post('/api/answered-questions', async (req, res) => {
  let connection;
  try {
    const { projectId, questionNumber, questionText, answerText, files, sessionId } = req.body;
    
    if (!projectId || !questionNumber || !questionText || !answerText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, questionNumber, questionText, answerText'
      });
    }
    
    console.log(`Saving answered question ${questionNumber} for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      INSERT INTO project_question_answers 
      (project_id, question_number, question_text, answer_text, is_answered, answered_at, files, session_id)
      VALUES (?, ?, ?, ?, 1, NOW(), ?, ?)
      ON DUPLICATE KEY UPDATE 
      answer_text = VALUES(answer_text),
      is_answered = 1,
      answered_at = NOW(),
      files = VALUES(files),
      updated_at = NOW()
    `;
    
    const filesJson = files ? JSON.stringify(files) : null;
    
    const [result] = await connection.execute(query, [
      projectId,
      questionNumber,
      questionText,
      answerText,
      filesJson,
      sessionId || null
    ]);
    
    console.log(`Answered question saved/updated with ID: ${result.insertId || 'existing'}`);
    
    res.json({ 
      success: true, 
      id: result.insertId || result.affectedRows,
      message: 'Answered question saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving answered question:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save answered question',
      message: 'Unable to save answered question to database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.get('/api/answered-questions/:projectId/summary', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Fetching answered questions summary for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT 
        project_id,
        COUNT(*) as total_answered,
        GROUP_CONCAT(question_number ORDER BY question_number) as answered_question_numbers,
        MAX(answered_at) as last_answered_at
      FROM project_question_answers 
      WHERE project_id = ? AND is_answered = 1 
      GROUP BY project_id
    `;
    
    const [rows] = await connection.execute(query, [projectId]);
    const summary = rows[0] || { 
      project_id: projectId, 
      total_answered: 0, 
      answered_question_numbers: null,
      last_answered_at: null
    };
    
    console.log(`Retrieved summary: ${summary.total_answered} answered questions`);
    res.json({ success: true, data: summary });
    
  } catch (error) {
    console.error('Error fetching answered questions summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch answered questions summary',
      message: 'Unable to retrieve answered questions summary from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.delete('/api/answered-questions/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Clearing answered questions for project: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    
    const query = 'DELETE FROM project_question_answers WHERE project_id = ?';
    const [result] = await connection.execute(query, [projectId]);
    
    console.log(`Cleared ${result.affectedRows} answered questions`);
    
    res.json({ 
      success: true, 
      deletedCount: result.affectedRows,
      message: 'Answered questions cleared successfully'
    });
    
  } catch (error) {
    console.error('Error clearing answered questions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear answered questions',
      message: 'Unable to clear answered questions from database.'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Chat API bridge endpoints
app.post('/api/chat/start', async (req, res) => {
  try {
    const { projectId } = req.body;
    const response = await fetch('http://localhost:5001/api/chat/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chat service error:', error);
    res.status(503).json({ 
      success: false, 
      error: 'Chat service unavailable',
      message: 'The chat service is not responding. Please ensure Python server is running on port 5001.'
    });
  }
});

app.get('/api/chat/next-question', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5001/api/chat/next-question');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chat service error:', error);
    res.status(503).json({ 
      success: false, 
      error: 'Chat service unavailable',
      message: 'Please ensure Python chat server is running on port 5001.'
    });
  }
});

app.post('/api/chat/submit-answer', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5001/api/chat/submit-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chat service error:', error);
    res.status(503).json({ 
      success: false, 
      error: 'Chat service unavailable',
      message: 'Please ensure Python chat server is running on port 5001.'
    });
  }
});

app.get('/api/chat/complete', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5001/api/chat/complete');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chat service error:', error);
    res.status(503).json({ 
      success: false, 
      error: 'Chat service unavailable',
      message: 'Please ensure Python chat server is running on port 5001.'
    });
  }
});

app.get('/api/chat/health', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5001/health');
    const data = await response.json();
    res.json({ ...data, ready: true });
  } catch (error) {
    res.status(503).json({ 
      status: 'UNAVAILABLE', 
      error: 'Python chat server not responding on port 5001',
      ready: false,
      message: 'Please start the Python chat server with: python chat-server.py'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    endpoints: [
      'GET /api/health',
      'GET /api/project/:projectId',
      'POST /api/upload',
      'GET /generate/:projectId - Generate text files for project',
      'GET /:projectId - Direct access to generate text files (numeric IDs only)'
    ]
  });
});

// Alternative route for direct project ID access (like localhost:5000/3000609)
app.get('/:projectId', async (req, res) => {
  // Skip if it's an API route or other known routes
  if (req.params.projectId === 'api' || 
      req.params.projectId === 'uploads' || 
      req.params.projectId === 'json' ||
      req.params.projectId === 'generate' ||
      req.params.projectId === 'favicon.ico') {
    return res.status(404).json({ error: 'Route not found' });
  }

  let connection;
  try {
    const projectId = req.params.projectId;
    
    // Validate that projectId is numeric
    if (!/^\d+$/.test(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID format. Project ID must be numeric.',
        message: 'Please provide a valid numeric project ID.'
      });
    }
    
    console.log(`Generating text files for project ID: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established for text file generation');
    
    // Step 1: Get and save section summaries
    console.log('[1/2] Fetching section summaries...');
    const sectionSummaryDict = await getProjectSummaryBySections(connection, projectId);
    const summaryFilePath = saveSectionSummaries(sectionSummaryDict, projectId);
    
    // Step 2: Get and save interactions
    console.log('[2/2] Fetching interactions...');
    const interactions = await getProjectInteractions(connection, projectId);
    const interactionsFilePath = saveInteractionsText(interactions, projectId);
    
    const response = {
      success: true,
      projectId: projectId,
      message: 'Text files generated successfully',
      files: {
        sectionSummaries: summaryFilePath ? `summary.txt` : null,
        interactions: interactionsFilePath ? `question.txt` : null
      },
      stats: {
        sectionsCount: Object.keys(sectionSummaryDict).length,
        interactionsCount: interactions.length,
        usedFillerContent: {
          summary: Object.keys(sectionSummaryDict).length === 0,
          questions: interactions.length === 0
        }
      },
      downloadUrls: {
        sectionSummaries: summaryFilePath ? `http://localhost:${PORT}/text/summary.txt` : null,
        interactions: interactionsFilePath ? `http://localhost:${PORT}/text/question.txt` : null
      }
    };
    
    console.log('Text files generation complete!');
    res.json(response);
    
  } catch (error) {
    console.error('Error generating JSON files:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      res.status(503).json({
        success: false,
        error: 'Database connection failed',
        message: 'Unable to connect to the database. Please try again later.',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    } else {
      let errorMessage = 'Server error occurred while generating JSON files';
      let statusCode = 500;
      
      if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = 'Required database tables not found. Please contact support.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection timeout. Please try again later.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: 'Unable to generate JSON files due to a server error.',
        errorCode: 'GENERATION_ERROR'
      });
    }
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});