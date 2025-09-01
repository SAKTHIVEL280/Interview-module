#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import setupDatabase from './setup-database.js';

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
const isWindows = os.platform() === 'win32';

console.log(`${colors.bright}${colors.magenta}
====================================================
        Interview Module - Starting All Servers
====================================================${colors.reset}`);

const processes = [];

// Function to start a process
function startProcess(name, command, args, cwd, color) {
  return new Promise((resolve) => {
    log(color, name.toUpperCase(), `Starting ${name}...`);
    
    const proc = spawn(command, args, {
      cwd: cwd,
      stdio: 'inherit',
      shell: isWindows,
      detached: !isWindows
    });

    proc.on('error', (error) => {
      log('red', name.toUpperCase(), `❌ Error: ${error.message}`);
    });

    processes.push(proc);
    
    // Give a moment for the process to start
    setTimeout(() => {
      log('green', name.toUpperCase(), `✅ ${name} process started`);
      resolve();
    }, 1000);
  });
}

async function main() {
  try {
    // First, setup database
    log('magenta', 'DATABASE', 'Setting up database...');
    const dbSetupSuccess = await setupDatabase();
    
    if (!dbSetupSuccess) {
      log('yellow', 'WARNING', 'Database setup failed, but continuing with server startup...');
      log('yellow', 'WARNING', 'You may need to run database setup manually later.');
    }

    console.log('');
    log('blue', 'SERVERS', 'Starting application servers...');
    console.log('');

    // Start backend server
    await startProcess('Backend', 'node', ['server/server.js'], projectRoot, 'blue');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start chat server  
    await startProcess('Chat', 'python', ['chat-server.py'], path.join(projectRoot, 'server', 'chat'), 'green');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start frontend
    await startProcess('Frontend', 'npx', ['vite'], projectRoot, 'cyan');
    
    console.log('');
    log('green', 'SUCCESS', '🎉 All servers have been started!');
    console.log('');
    log('cyan', 'INFO', '📋 Expected Server URLs:');
    log('cyan', 'INFO', '   • Backend API:      http://localhost:5000');
    log('cyan', 'INFO', '   • Python Chat:      http://localhost:5001');
    log('cyan', 'INFO', '   • Frontend UI:      http://localhost:8080');
    console.log('');
    log('yellow', 'INFO', '💡 Each server is running in the same terminal');
    log('yellow', 'INFO', '💡 Press Ctrl+C to stop all servers');
    console.log('');

    // Handle graceful shutdown
    const shutdown = () => {
      log('yellow', 'SHUTDOWN', 'Stopping all servers...');
      processes.forEach(proc => {
        try {
          if (isWindows) {
            // On Windows, kill the process tree
            spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { stdio: 'ignore' });
          } else {
            // On Unix-like systems
            process.kill(-proc.pid, 'SIGTERM');
          }
        } catch (error) {
          // Ignore errors during shutdown
        }
      });
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep the main process alive
    await new Promise(() => {});

  } catch (error) {
    log('red', 'ERROR', `Failed to start servers: ${error.message}`);
    process.exit(1);
  }
}

main();
