#!/usr/bin/env python3
"""
Standalone demo of Executive AI Assistant
This version runs without any external dependencies
"""

import http.server
import socketserver
import json
import datetime
import os
from urllib.parse import parse_qs, urlparse

PORT = 8000

HTML_CONTENT = """
<!DOCTYPE html>
<html>
<head>
    <title>Executive AI Assistant - Standalone Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .chat-container {
            border: 1px solid #ddd;
            border-radius: 5px;
            height: 300px;
            overflow-y: auto;
            padding: 15px;
            margin: 20px 0;
            background: #fafafa;
        }
        .message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
        }
        .user {
            background: #007bff;
            color: white;
            text-align: right;
        }
        .assistant {
            background: #e9ecef;
            color: #333;
        }
        .input-group {
            display: flex;
            gap: 10px;
        }
        input[type="text"] {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background: #0056b3;
        }
        .info {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        code {
            background: #f8f9fa;
            padding: 2px 5px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Executive AI Assistant - Standalone Demo</h1>
        
        <div class="warning">
            <strong>Limited Demo Mode:</strong> This is running without the full dependencies. 
            For full AI features, please install the requirements.
        </div>
        
        <div class="chat-container" id="chat">
            <div class="message assistant">
                Welcome to the Executive AI Assistant demo! This is a simplified version 
                that shows the interface. In the full version, I would be powered by 
                advanced AI models to help with your executive tasks.
            </div>
        </div>
        
        <div class="input-group">
            <input type="text" id="message" placeholder="Type your message..." 
                   onkeypress="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()">Send</button>
        </div>
        
        <div class="info">
            <strong>To enable full AI features:</strong><br>
            1. Install dependencies: <code>sudo apt install python3-pip</code><br>
            2. Install packages: <code>pip3 install -r requirements.txt</code><br>
            3. Add API keys to <code>.env</code> file<br>
            4. Run: <code>python3 start_server.py</code>
        </div>
    </div>
    
    <script>
        function sendMessage() {
            const input = document.getElementById('message');
            const chat = document.getElementById('chat');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message
            chat.innerHTML += '<div class="message user">' + message + '</div>';
            
            // Simulate response
            setTimeout(() => {
                const responses = [
                    "In the full version, I would provide intelligent responses based on your query.",
                    "I could help with healthcare, legal, sports, and general business decisions.",
                    "Voice control and multi-language support would also be available.",
                    "This demo shows the interface, but the AI features require proper installation."
                ];
                const response = responses[Math.floor(Math.random() * responses.length)];
                chat.innerHTML += '<div class="message assistant">' + response + '</div>';
                chat.scrollTop = chat.scrollHeight;
            }, 500);
            
            input.value = '';
            chat.scrollTop = chat.scrollHeight;
        }
    </script>
</body>
</html>
"""

class DemoHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(HTML_CONTENT.encode())
        else:
            super().do_GET()

def main():
    print("Executive AI Assistant - Standalone Demo")
    print("=" * 50)
    print("This is a limited demo without AI features.")
    print("For full functionality, please install the dependencies.")
    print()
    print(f"Starting server on http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    print()
    
    with socketserver.TCPServer(("", PORT), DemoHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()