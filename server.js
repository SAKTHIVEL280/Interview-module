
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve generated JSON files
app.use('/json', express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
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
      const summary = summaryRows.length > 0 ? summaryRows[0].summary : null;
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

      // ✨ NEW: Generate JSON files automatically when project data is fetched
      console.log('🔄 Auto-generating JSON files...');
      try {
        // Step 1: Get and save section summaries
        console.log('[1/2] Fetching section summaries...');
        const sectionSummaryDict = await getProjectSummaryBySections(connection, projectId);
        const summaryFilePath = saveSectionSummaries(sectionSummaryDict, projectId);
        
        // Step 2: Get and save interactions
        console.log('[2/2] Fetching interactions...');
        const interactions = await getProjectInteractions(connection, projectId);
        const interactionsFilePath = saveInteractionsJson(interactions, projectId);
        
        console.log('✅ JSON files auto-generated successfully!');
        
        // Add JSON file information to the response
        projectData.jsonFiles = {
          sectionSummaries: summaryFilePath ? `summary.json` : null,
          interactions: interactionsFilePath ? `question.json` : null,
          downloadUrls: {
            sectionSummaries: summaryFilePath ? `http://localhost:${PORT}/json/summary.json` : null,
            interactions: interactionsFilePath ? `http://localhost:${PORT}/json/question.json` : null
          },
          stats: {
            sectionsCount: Object.keys(sectionSummaryDict).length,
            interactionsCount: interactions.length
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

// Helper function to save section summaries to JSON file
function saveSectionSummaries(sectionSummaryDict, projectId) {
  if (Object.keys(sectionSummaryDict).length > 0) {
    const filePath = path.join(__dirname, `summary.json`);
    fs.writeFileSync(filePath, JSON.stringify(sectionSummaryDict, null, 4), 'utf-8');
    console.log(`Section summaries saved to summary.json`);
    return filePath;
  } else {
    console.log("No section summaries to save");
    return null;
  }
}

// Helper function to save interactions to JSON file
function saveInteractionsJson(interactions, projectId) {
  if (interactions.length === 0) {
    console.log("No interactions to save.");
    return null;
  }
  
  // Format for the JSON file
  const interactionsDict = { [projectId]: interactions };
  
  const filePath = path.join(__dirname, `question.json`);
  
  // Custom formatting to ensure each item is on a new line
  let jsonContent = "{\n";
  jsonContent += `    "${projectId}": [\n`;
  
  interactions.forEach((interaction, index) => {
    // Escape any double quotes in the interaction
    const escapedInteraction = interaction.replace(/"/g, '\\"');
    
    // Add comma if not the last item
    if (index < interactions.length - 1) {
      jsonContent += `        "${escapedInteraction}",\n`;
    } else {
      jsonContent += `        "${escapedInteraction}"\n`;
    }
  });
  
  jsonContent += "    ]\n}";
  
  fs.writeFileSync(filePath, jsonContent, 'utf-8');
  console.log(`Interactions saved to question.json`);
  return filePath;
}

// New route to generate JSON files for a project ID
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
    
    console.log(`Generating JSON files for project ID: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established for JSON generation');
    
    // Step 1: Get and save section summaries
    console.log('[1/2] Fetching section summaries...');
    const sectionSummaryDict = await getProjectSummaryBySections(connection, projectId);
    const summaryFilePath = saveSectionSummaries(sectionSummaryDict, projectId);
    
    // Step 2: Get and save interactions
    console.log('[2/2] Fetching interactions...');
    const interactions = await getProjectInteractions(connection, projectId);
    const interactionsFilePath = saveInteractionsJson(interactions, projectId);
    
    const response = {
      success: true,
      projectId: projectId,
      message: 'JSON files generated successfully',
      files: {
        sectionSummaries: summaryFilePath ? `summary.json` : null,
        interactions: interactionsFilePath ? `question.json` : null
      },
      stats: {
        sectionsCount: Object.keys(sectionSummaryDict).length,
        interactionsCount: interactions.length
      },
      downloadUrls: {
        sectionSummaries: summaryFilePath ? `http://localhost:${PORT}/json/summary.json` : null,
        interactions: interactionsFilePath ? `http://localhost:${PORT}/json/question.json` : null
      }
    };
    
    console.log('JSON files generation complete!');
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    endpoints: [
      'GET /api/health',
      'GET /api/project/:projectId',
      'POST /api/upload',
      'GET /generate/:projectId - Generate JSON files for project',
      'GET /:projectId - Direct access to generate JSON files (numeric IDs only)'
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
    
    console.log(`Generating JSON files for project ID: ${projectId}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established for JSON generation');
    
    // Step 1: Get and save section summaries
    console.log('[1/2] Fetching section summaries...');
    const sectionSummaryDict = await getProjectSummaryBySections(connection, projectId);
    const summaryFilePath = saveSectionSummaries(sectionSummaryDict, projectId);
    
    // Step 2: Get and save interactions
    console.log('[2/2] Fetching interactions...');
    const interactions = await getProjectInteractions(connection, projectId);
    const interactionsFilePath = saveInteractionsJson(interactions, projectId);
    
    const response = {
      success: true,
      projectId: projectId,
      message: 'JSON files generated successfully',
      files: {
        sectionSummaries: summaryFilePath ? `project_${projectId}_section_summaries.json` : null,
        interactions: interactionsFilePath ? `project_${projectId}_interactions.json` : null
      },
      stats: {
        sectionsCount: Object.keys(sectionSummaryDict).length,
        interactionsCount: interactions.length
      },
      downloadUrls: {
        sectionSummaries: summaryFilePath ? `http://localhost:${PORT}/json/project_${projectId}_section_summaries.json` : null,
        interactions: interactionsFilePath ? `http://localhost:${PORT}/json/project_${projectId}_interactions.json` : null
      }
    };
    
    console.log('JSON files generation complete!');
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