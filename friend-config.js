// Configuration for friend to connect to your database and server
// Your friend should update their files with these settings

// 1. Update src/lib/api.ts:
// Change API_BASE_URL to: 'http://192.168.1.43:8080'

// 2. Update server.js dbConfig to:
const friendDbConfig = {
  host: '192.168.1.43',  // Your IP address
  user: 'friend',         // New user we'll create
  password: 'friend123',  // Password for friend user
  database: 'certaintimaster',
  port: 3307
};

// 3. Steps for you to setup MySQL for sharing:
// Run these commands in MySQL:
// CREATE USER 'friend'@'%' IDENTIFIED BY 'friend123';
// GRANT ALL PRIVILEGES ON certaintimaster.* TO 'friend'@'%';
// FLUSH PRIVILEGES;

// 4. Update MySQL config to use port 3307:
// Stop MySQL service
// Edit my.ini file and change port to 3307
// Restart MySQL service

console.log('Friend Configuration:');
console.log('Your IP:', '192.168.1.43');
console.log('Server Port:', '8080');
console.log('MySQL Port:', '3307');
console.log('Database User:', 'friend');
console.log('Database Password:', 'friend123');
