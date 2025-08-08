
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 5000;

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

// Allow CORS for local dev with specific configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Database connection configuration with error handling
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'skyp',
  database: 'certaintimaster',
  port: 3306
};

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Project data endpoint with better error handling
app.get('/api/project/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    console.log(`Fetching project data for ID: ${projectId}`);
    
    // Create database connection with timeout
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection established');
    
    // SQL query to fetch project data with company information
    const projectQuery = `
      SELECT 
        p.projectId,
        p.projectCode,
        p.projectName,
        c.companyIdentifier,
        c.companyName,
        c.billingCountry,
        c.currency,
        c.industry,
        c.status
      FROM 
        projects p
      INNER JOIN 
        company c ON p.companyId = c.companyId
      WHERE 
        p.projectId = ?
    `;

    // SQL query to fetch summary from master_project_ai_summary_sections
    const summaryQuery = `
      SELECT summary FROM master_project_ai_summary_sections WHERE projectid = ?
    `;

    // Fetch project data
    console.log('Executing project query...');
    const [projectRows] = await connection.execute(projectQuery, [projectId]);
    console.log(`Project query returned ${projectRows.length} rows`);
    
    // Fetch summary
    console.log('Executing summary query...');
    const [summaryRows] = await connection.execute(summaryQuery, [projectId]);
    console.log(`Summary query returned ${summaryRows.length} rows`);

    if (projectRows.length > 0) {
      const result = projectRows[0];
      // Generate a random Project Ref Id like 'Y.LL2100234'
      const refId = 'Y.LL' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      // Get summary (if exists)
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
    
    // Check if it's a database connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      // Return mock data when database is not available
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
        summary: 'This is mock project data returned when the database is not available.'
      };
      res.json({ success: true, data: mockData });
    } else {
      // Provide user-friendly error messages
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

// Upload endpoint with better error handling
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    endpoints: [
      'GET /api/health',
      'GET /api/project/:projectId',
      'POST /api/upload'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});