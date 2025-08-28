// Server Configuration
export const SERVER_CONFIG = {
  // Port configuration
  PORTS: {
    NODE_SERVER: 5000,
    PYTHON_CHAT: 5001,
    REACT_DEV: 8080
  },
  
  // Database configuration
  DATABASE: {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'certaintimaster',
    port: 3306
  },
  
  // File paths (relative to project root)
  PATHS: {
    UPLOADS: 'uploads',
    DATA: 'data',
    CHAT_SERVER: 'server/chat',
    UTILS: 'server/utils'
  },
  
  // CORS origins
  CORS_ORIGINS: [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000'
  ],
  
  // File types
  ALLOWED_FILE_TYPES: {
    images: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'],
    documents: ['pdf', 'doc', 'docx', 'txt'],
    all: '*/*'
  }
};

export default SERVER_CONFIG;
