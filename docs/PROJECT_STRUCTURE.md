# Interview Module - Project Structure

## 📁 Directory Structure

```
Interview-module/
├── 📁 src/                     # Frontend React application
│   ├── 📁 components/          # React components
│   │   ├── ErrorBoundary.tsx   # Error handling component
│   │   ├── ProjectSummary.tsx  # Project summary display
│   │   ├── TopNavBar.tsx       # Navigation bar
│   │   └── 📁 ui/              # UI components
│   ├── 📁 hooks/              # Custom React hooks
│   ├── 📁 lib/                # Utility libraries and API functions
│   └── 📁 pages/              # Page components
├── 📁 server/                 # Backend server files
│   ├── 📁 chat/               # AI chat system (Python)
│   │   ├── chat-server.py     # Python chat server (Port 5001)
│   │   └── Q-Bot.py           # AI questionnaire engine
│   ├── 📁 config/             # Server configuration files
│   │   └── server.config.js   # Centralized server config
│   └── server.js              # Main Node.js server (Port 5000)
├── 📁 scripts/                # Automation scripts
│   ├── start-interview-module.bat  # Main startup script
│   ├── quick-start.bat        # Quick start script
│   ├── stop-servers.bat       # Stop all servers script
│   └── start-all.js           # Cross-platform npm start script
├── 📁 data/                   # Data files
│   ├── summary.txt            # Project summary data
│   ├── question.txt           # Generated questions
│   ├── enhanced_summary.txt   # AI-enhanced summary
│   └── .gitkeep             # Preserve directory
├── 📁 uploads/                # User uploaded files
│   └── .gitkeep             # Preserve directory
├── 📁 public/                 # Static assets
│   ├── favicon.svg           # Site favicon
│   └── robots.txt            # SEO robots file
├── 📁 docs/                   # Documentation
└── Configuration files        # Root config files
```

## 🚀 Getting Started

1. **Super Quick Start**: `npm start` (starts all servers)
2. **Alternative**: Run `scripts/start-interview-module.bat`
3. **Manual Start**: 
   - Backend: `npm run server` (starts `server/server.js`)
   - Chat: `npm run chat` (starts `server/chat/chat-server.py`)
   - Frontend: `npm run dev` (starts React on port 8080)

## 🔧 Server Architecture

- **Node.js Server (Port 5000)**: Main backend API, database, file handling
- **Python Chat Server (Port 5001)**: AI-powered questionnaire system
- **React Frontend (Port 8080)**: User interface

## 📊 Data Flow

1. Frontend fetches project data from Node.js server
2. Node.js server queries MySQL database
3. Generated text files are saved to `data/` directory
4. Python chat server reads from `data/` files
5. AI processes questions and generates enhanced summaries
