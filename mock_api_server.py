#!/usr/bin/env python3
"""
Mock API server to serve basic endpoints for frontend development
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading

class MockAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        if self.path == '/api/health':
            # Mock health response that matches HealthPayload type
            response = {
                "message": "Health check successful",
                "production": "Local",
                "gtag": "",
                "deployments": {
                    "WEAVIATE_URL_VERBA": "http://localhost:8079",
                    "WEAVIATE_API_KEY_VERBA": ""
                },
                "default_deployment": "Local"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            # Default response
            self.wfile.write(json.dumps({"status": "ok"}).encode())
    
    def do_POST(self):
        # Handle CORS and POST requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        if self.path == '/api/connect':
            # Mock connect response for auto-connection
            response = {
                "connected": True,
                "error": "",
                "rag_config": {
                    "generator": {
                        "name": "OpenAI"
                    },
                    "embedder": {
                        "name": "OpenAI"
                    },
                    "retriever": {
                        "name": "WindowRetriever"
                    },
                    "reader": {
                        "name": "BasicReader"
                    },
                    "chunker": {
                        "name": "RecursiveChunker"
                    }
                },
                "user_config": {
                    "getting_started": True
                },
                "theme": {},
                "themes": {}
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.wfile.write(json.dumps({"status": "ok"}).encode())
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def start_mock_server():
    server = HTTPServer(('localhost', 8000), MockAPIHandler)
    print("🔄 Mock API server running on http://localhost:8000")
    print("📍 Health endpoint: http://localhost:8000/api/health")
    server.serve_forever()

if __name__ == '__main__':
    start_mock_server()