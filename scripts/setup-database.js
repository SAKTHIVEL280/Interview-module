#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, prefix, message) => {
  console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`);
};

const projectRoot = path.resolve(__dirname, '..');
const databaseDir = path.join(projectRoot, 'database');

// Check if MySQL is available
function checkMySQLAvailable() {
  return new Promise((resolve) => {
    const mysql = spawn('mysql', ['--version'], { stdio: 'ignore' });
    mysql.on('close', (code) => {
      resolve(code === 0);
    });
    mysql.on('error', () => {
      resolve(false);
    });
  });
}

// Get MySQL password securely
function getMySQLPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter MySQL root password (or press Enter if no password): ', (password) => {
      rl.close();
      resolve(password.trim());
    });
  });
}

// Execute SQL file
function executeSQLFile(filePath, password) {
  return new Promise((resolve, reject) => {
    const args = ['-u', 'root'];
    
    if (password) {
      args.push(`-p${password}`);
    }
    
    args.push('-e', `source ${filePath}`);

    console.log(`Executing: mysql ${args.join(' ')}`);

    const mysql = spawn('mysql', args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    mysql.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text.trim());
    });

    mysql.stderr.on('data', (data) => {
      const text = data.toString();
      error += text;
      if (!text.includes('Warning')) {
        console.error(text.trim());
      }
    });

    mysql.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject({ success: false, error: error || 'Unknown MySQL error', code });
      }
    });

    mysql.on('error', (err) => {
      reject({ success: false, error: err.message });
    });
  });
}

// Main database setup function
async function setupDatabase() {
  console.log(`${colors.bright}${colors.magenta}
====================================================
        Interview Module - Database Setup
====================================================${colors.reset}`);

  try {
    // Check if MySQL is available
    log('blue', 'CHECK', 'Checking MySQL availability...');
    const mysqlAvailable = await checkMySQLAvailable();
    
    if (!mysqlAvailable) {
      log('red', 'ERROR', 'MySQL is not available. Please ensure MySQL is installed and accessible from command line.');
      log('yellow', 'INFO', 'You can download MySQL from: https://dev.mysql.com/downloads/mysql/');
      return false;
    }

    log('green', 'SUCCESS', 'MySQL is available');

    // Check if database files exist
    const setupFile = path.join(databaseDir, 'setup_context_history.sql');
    if (!existsSync(setupFile)) {
      log('red', 'ERROR', `Database setup file not found: ${setupFile}`);
      return false;
    }

    log('blue', 'INFO', 'Found database setup files');

    // Get MySQL password
    log('yellow', 'INPUT', 'Please provide MySQL credentials:');
    const password = await getMySQLPassword();

    // Execute the main setup file
    log('blue', 'SETUP', 'Setting up database tables...');
    
    try {
      const result = await executeSQLFile(setupFile, password);
      
      if (result.output.includes('successfully') || result.output.includes('created')) {
        log('green', 'SUCCESS', '✅ Database setup completed successfully!');
        log('cyan', 'INFO', '📋 Created tables:');
        log('cyan', 'INFO', '   • context_history - Chat conversation storage');
        log('cyan', 'INFO', '   • project_question_answers - Question tracking');
        log('cyan', 'INFO', '   • answered_questions_summary - Summary view');
        return true;
      } else {
        log('green', 'SUCCESS', '✅ Database setup completed!');
        return true;
      }
    } catch (error) {
      // Check if it's just a "table exists" error
      if (error.error && (
          error.error.includes('already exists') || 
          error.error.includes('Table') && error.error.includes('already exists')
      )) {
        log('yellow', 'INFO', 'Database tables already exist - skipping setup');
        log('green', 'SUCCESS', '✅ Database is ready!');
        return true;
      } else {
        throw error;
      }
    }

  } catch (error) {
    log('red', 'ERROR', `Database setup failed: ${error.error || error.message}`);
    log('yellow', 'HELP', 'Please check:');
    log('yellow', 'HELP', '1. MySQL server is running');
    log('yellow', 'HELP', '2. Root password is correct');
    log('yellow', 'HELP', '3. "certaintimaster" database exists');
    return false;
  }
}

// Export for use in other scripts or run directly
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  console.log('Starting database setup...');
  setupDatabase().then((success) => {
    console.log(`Database setup ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export default setupDatabase;
