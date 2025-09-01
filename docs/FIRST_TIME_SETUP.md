# Interview Module - First Time Setup

This document provides step-by-step instructions for developers who have just cloned the Interview Module project.

## 🛠️ Prerequisites Setup

### 1. Install Node.js
- Download and install Node.js 16+ from [nodejs.org](https://nodejs.org/)
- Verify installation: `node --version` and `npm --version`

### 2. Install Python
- Download and install Python 3.8+ from [python.org](https://www.python.org/)
- Verify installation: `python --version`

### 3. Install MySQL
- Download and install MySQL from [mysql.com](https://dev.mysql.com/downloads/mysql/)
- During installation, remember your root password
- Verify installation: `mysql --version`

### 4. Create Database
Connect to MySQL and create the required database:
```sql
mysql -u root -p
CREATE DATABASE certaintimaster;
EXIT;
```

## 🚀 Project Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd Interview-module
npm install
```

### 2. Start Everything
```bash
npm start
```

**What happens when you run `npm start`:**
1. **Database Setup**: Automatically creates required tables
   - `context_history` - Stores chat conversations
   - `project_question_answers` - Tracks answered questions
   - `answered_questions_summary` - Summary view
2. **Server Startup**: Starts all three servers:
   - Backend API (Node.js) - Port 5000
   - Python Chat Server - Port 5001
   - Frontend React App - Port 8080

### 3. Access the Application
- Open your browser to: http://localhost:8080
- For specific project: http://localhost:8080/PROJECT_ID

## 🔧 Alternative Commands

### Database Setup Only
If you need to setup or reset the database:
```bash
npm run setup:db
```

### Manual Server Start
Start servers individually:
```bash
npm run server     # Backend only
npm run chat       # Chat server only  
npm run dev        # Frontend only
```

## 🐛 Common Issues

### MySQL Connection Issues
- **Problem**: "MySQL is not available"
- **Solution**: Ensure MySQL is installed and accessible via command line
- **Test**: Run `mysql --version` in terminal

### Database Access Issues  
- **Problem**: "Access denied for user 'root'"
- **Solution**: Use correct MySQL root password when prompted
- **Alternative**: Update connection settings in `server/config/server.config.js`

### Port Already in Use
- **Problem**: "Port 5000/5001/8080 is already in use"
- **Solution**: Stop other processes or change ports in configuration files

### Python Dependencies
- **Problem**: Python chat server fails to start
- **Solution**: Install Python dependencies:
  ```bash
  cd server/chat
  pip install -r requirements.txt  # if requirements.txt exists
  ```

## 📝 Next Steps

After successful setup:
1. Read [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
2. Check [API Documentation](docs/API.md)
3. Review the main [README.md](README.md) for feature details

## 🆘 Getting Help

If you encounter issues:
1. Check this troubleshooting guide
2. Review the main README.md
3. Check the docs/ folder for detailed documentation
4. Contact the development team

---

**Happy coding! 🎉**
