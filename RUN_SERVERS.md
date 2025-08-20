# How to Run the Interview Module

## Simple 3-Step Process

### Step 1: Start the Node.js Backend Server
```bash
npm run server
```
This will start the main server on http://localhost:5000

### Step 2: Start the Python Chat Server
```bash
npm run chat
```
Or directly:
```bash
python chat-server.py
```
This will start the Python chat server on http://localhost:5001

### Step 3: Start the Frontend
```bash
npm run dev
```
This will start the React frontend on http://localhost:8080

## What Each Server Does

- **Node.js Server (port 5000)**: Handles database connections, file generation, and API bridge
- **Python Chat Server (port 5001)**: Runs the Q-Bot AI chat functionality
- **React Frontend (port 8080)**: The web interface

## Quick Commands

Run each command in a separate terminal window:

1. `npm run server` - Backend
2. `npm run chat` - Python chat  
3. `npm run dev` - Frontend

Then open http://localhost:8080 in your browser!

## Features

- ✅ Automatic text file generation (summary.txt and question.txt)
- ✅ AI-powered interview questions
- ✅ Auto-start interview (no button clicks needed)
- ✅ Real-time chat interface
- ✅ Progress tracking
