# Interview Module

A sophisticated AI-powered interview system that enhances project summaries through intelligent questioning and conversation.

## 🚀 Quick Start

1. **Super Quick Start**: One command starts everything
   ```bash
   npm start
   ```

2. **Alternative**: Use the startup script
   ```bash
   scripts/start-interview-module.bat
   ```

3. **Manual Start**: Start each component separately
   ```bash
   npm run server  # Node.js backend (Port 5000)
   npm run chat    # Python chat server (Port 5001) 
   npm run dev     # React frontend (Port 8080)
   ```

4. **Access the Application**
   - Open: http://localhost:8080
   - Or use project-specific URL: http://localhost:8080/3000609

## 📁 Project Structure

```
Interview-module/
├── 📁 src/                    # React frontend application
├── 📁 server/                 # Backend services
│   ├── 📁 chat/              # AI chat system (Python)
│   ├── 📁 config/            # Configuration files
│   ├── 📁 routes/            # API route handlers
│   ├── 📁 utils/             # Server utilities
│   └── server.js             # Main Node.js server
├── 📁 scripts/               # Automation scripts
├── 📁 data/                  # Generated data files
├── 📁 uploads/               # User uploaded files
├── 📁 docs/                  # Documentation
└── 📁 public/                # Static assets
```

## 🔧 Technology Stack

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend
- **Node.js** + Express (Port 5000)
- **Python** HTTP server (Port 5001)
- **MySQL** database
- **Google Gemini AI** API

## 🌟 Key Features

- **AI-Powered Interviews**: Smart questioning with context awareness
- **Voice Input**: Real-time speech-to-text recording
- **File Uploads**: Support for documents, images, and PDFs
- **Enhanced Summaries**: AI-generated improved project documentation
- **Real-time Chat**: Professional chat interface with typing indicators
- **Multi-Question Detection**: Single answers can address multiple questions

## 🛠️ Development

### Prerequisites
- Node.js 16+
- Python 3.8+
- MySQL database

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure database in `server/config/server.config.js`
4. Start with `scripts/start-interview-module.bat`

### Available Scripts
- `npm start` - **Start all servers at once** (Recommended)
- `npm run dev` - Start React development server only
- `npm run server` - Start Node.js backend only
- `npm run chat` - Start Python chat server only
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run start:batch` - Alternative startup using batch file
- `npm run start:parallel` - Start all servers in parallel (alternative)

## 📖 Documentation

- [Project Structure](docs/PROJECT_STRUCTURE.md) - Detailed folder organization
- [API Documentation](docs/API.md) - Backend API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Production setup

## 🔄 Workflow

1. **Load Project**: Fetch data from database by project ID
2. **Generate Files**: Create summary.txt and question.txt in data/
3. **AI Analysis**: Process content with Google Gemini
4. **Interactive Interview**: Conduct Q&A session with validation
5. **Enhanced Summary**: Generate improved documentation

## 🚀 Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production setup instructions.

## 📝 License

This project is proprietary to Certainti.ai

---

For more information, visit the [documentation](docs/) folder.