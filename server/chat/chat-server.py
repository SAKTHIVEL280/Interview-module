#!/usr/bin/env python3
"""
Chat Server for Interview Module
Integrates Q-Bot functionality with the Node.js backend
"""

import sys
import os
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import subprocess
import threading

# Add current directory to path for Q-Bot import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Q-Bot
try:
    # Import the Q-Bot module
    import importlib.util
    spec = importlib.util.spec_from_file_location("qbot", "Q-Bot.py")
    qbot_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(qbot_module)
    Questionnaire = qbot_module.Questionnaire
    print("Q-Bot module imported successfully")
except Exception as e:
    print(f"ERROR: Could not import Q-Bot: {e}")
    sys.exit(1)

class ChatHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'status': 'OK', 'service': 'chat-server', 'port': 5001}
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path == '/api/chat/start':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = chat_bot.start_web_session()
            self.wfile.write(json.dumps(result).encode())
            
        elif self.path == '/api/chat/next-question':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = chat_bot.get_next_question_web()
            self.wfile.write(json.dumps(result).encode())
            
        elif self.path == '/api/chat/complete':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            result = chat_bot.complete_questionnaire_web()
            self.wfile.write(json.dumps(result).encode())
            
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error = {'error': 'Endpoint not found'}
            self.wfile.write(json.dumps(error).encode())

    def do_POST(self):
        """Handle POST requests"""
        
        if self.path == '/api/chat/start':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length).decode('utf-8')
                
                # Parse JSON data
                try:
                    data = json.loads(post_data)
                    project_id = data.get('projectId', '')
                except json.JSONDecodeError:
                    project_id = ''
                
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                result = chat_bot.start_web_session()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error = {'success': False, 'error': f'Server error: {str(e)}'}
                self.wfile.write(json.dumps(error).encode())
                
        elif self.path == '/api/chat/submit-answer':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length).decode('utf-8')
                
                # Parse JSON data
                try:
                    data = json.loads(post_data)
                    answer = data.get('answer', '')
                except json.JSONDecodeError:
                    # Fallback to form data
                    data = urllib.parse.parse_qs(post_data)
                    answer = data.get('answer', [''])[0]
                
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                result = chat_bot.submit_answer_web(answer)
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error = {'error': f'Server error: {str(e)}'}
                self.wfile.write(json.dumps(error).encode())
                
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error = {'error': 'Endpoint not found'}
            self.wfile.write(json.dumps(error).encode())
            self.wfile.write(json.dumps(error).encode())

    def log_message(self, format, *args):
        """Custom logging to be less verbose"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] CHAT-SERVER: {format % args}")

def start_chat_server():
    """Start the chat server"""
    global chat_bot
    
    # Initialize the chat bot with API key
    api_key = "AIzaSyCbiRgEQXJsHohfaSth_5C3Vhz8uOmdj3Q"
    
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("ERROR: Please provide a valid Gemini API key.")
        return False
    
    try:
        chat_bot = Questionnaire(api_key)
        print("Chat bot initialized successfully")
    except Exception as e:
        print(f"ERROR: Failed to initialize chat bot: {e}")
        return False
    
    # Start server
    port = 5001
    try:
        server = HTTPServer(('localhost', port), ChatHandler)
        print(f"Chat server starting on http://localhost:{port}")
        print("Chat server ready for connections")
        
        # Start server in a way that can be interrupted
        server.serve_forever()
        
    except KeyboardInterrupt:
        print("\nChat server stopped by user")
        server.shutdown()
        return True
    except Exception as e:
        print(f"ERROR: Failed to start chat server: {e}")
        return False

if __name__ == "__main__":
    print("=== Interview Module Chat Server ===")
    print("Initializing chat functionality...")
    
    # Get the project root directory (two levels up from chat-server.py)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    data_dir = os.path.join(project_root, 'data')
    
    # Check if required files exist in data directory
    required_files = [
        os.path.join(data_dir, 'summary.txt'), 
        os.path.join(data_dir, 'question.txt')
    ]
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"WARNING: Missing files in data directory: {[os.path.basename(f) for f in missing_files]}")
        print("The chat server will start, but may not work properly until files are generated.")
    
    # Change working directory to data directory so Q-Bot can find the files
    os.chdir(data_dir)
    print(f"Working directory set to: {data_dir}")
    
    start_chat_server()
