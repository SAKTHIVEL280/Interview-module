// Configuration for your friend to connect to your database
// Your friend should use this configuration in their server.js

// Database connection configuration for friend
const dbConfig = {
  host: '192.168.1.43', // Your computer's IP address
  user: 'friend',
  password: 'friend123',
  database: 'certaintimaster',
  port: 3306
};

// API base URL for frontend
const API_BASE_URL = 'http://192.168.1.43:5000';

// Instructions for your friend:
// 1. Replace the dbConfig in server.js with the one above
// 2. Update src/lib/api.ts to use the API_BASE_URL above
// 3. Make sure both computers are on the same WiFi network
// 4. Your friend can then run: npm run dev

module.exports = { dbConfig, API_BASE_URL };
