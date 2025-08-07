
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

// Allow CORS for local dev
app.use(cors());
app.use(express.json());

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
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

// Project data endpoint
app.get('/api/project/:projectId', async (req, res) => {
  let connection;
  try {
    const projectId = req.params.projectId;
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    
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
    const [projectRows] = await connection.execute(projectQuery, [projectId]);
    // Fetch summary
    const [summaryRows] = await connection.execute(summaryQuery, [projectId]);

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
      res.json({ success: true, data: projectData });
    } else {
      res.status(404).json({ success: false, error: `No project found with ID: ${projectId}` });
    }
    
  } catch (error) {
    console.error('Error fetching project data:', error);
    res.status(500).json({ success: false, error: 'Database error occurred' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    console.error('Error handling upload:', err);
    res.status(500).json({ error: 'Server error during file upload' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});