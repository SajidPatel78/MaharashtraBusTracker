import os
import http.server
import socketserver
import re
import json
from http import HTTPStatus

PORT = 5000

# Hard-coded fallback API keys for development environment
# In production, these would be overridden by actual environment variables
FALLBACK_ENV = {
    'FIREBASE_API_KEY': 'AIzaSyBBB_FXf8Pigd4NivnXnryZwkWdrEEg4_c',
    'FIREBASE_AUTH_DOMAIN': 'maha-bus-tracking.firebaseapp.com',
    'FIREBASE_DATABASE_URL': 'https://maha-bus-tracking-default-rtdb.firebaseio.com',
    'FIREBASE_PROJECT_ID': 'maha-bus-tracking',
    'FIREBASE_STORAGE_BUCKET': 'maha-bus-tracking.firebasestorage.app',
    'FIREBASE_MESSAGING_SENDER_ID': '886661432689',
    'FIREBASE_APP_ID': '1:886661432689:web:7ecfd6ebbcf3b63dd1e2d0',
    'FIREBASE_VAPID_KEY': 'BF870dqdEqPt5ykfUgZ_57xG0EK3rGG2Z5WWVQaImSeG5INnNxqkIrby6VMFaPC5nMjYnnncg30RkyhhzUIeVKo',
    'GOOGLE_MAPS_API_KEY': 'AIzaSyD8CW9jOXKWRiWxoGPU21nsPdWGEfjsAY4'
}

class EnvTemplateHandler(http.server.SimpleHTTPRequestHandler):
    env_pattern = re.compile(r'{{ env\.([A-Z_]+) }}')
    
    def do_GET(self):
        # Special handling for the env-config.js file
        if self.path == '/env-config.js':
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/javascript")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.end_headers()
            
            # Read the template file
            with open('env-config.js', 'r') as file:
                content = file.read()
            
            # Replace all environment variable placeholders
            def replace_env_var(match):
                env_var = match.group(1)
                # First check real environment variables
                env_value = os.environ.get(env_var)
                
                # If not found in environment, use fallback
                if not env_value and env_var in FALLBACK_ENV:
                    env_value = FALLBACK_ENV[env_var]
                    print(f"Using fallback value for {env_var}")
                else:
                    print(f"Using environment value for {env_var}")
                
                return env_value or ""
            
            processed_content = self.env_pattern.sub(replace_env_var, content)
            self.wfile.write(processed_content.encode())
            
            return
        
        # For debugging: Access to current environment config
        elif self.path == '/api/debug/env-config':
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/json")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            
            # Create a safe version of the config (masking key values)
            safe_config = {}
            for key in FALLBACK_ENV:
                if os.environ.get(key):
                    value = os.environ.get(key)
                    safe_config[key] = value[:5] + '...' if value else ''
                else:
                    fallback = FALLBACK_ENV.get(key, '')
                    safe_config[key] = fallback[:5] + '...' if fallback else ''
            
            self.wfile.write(json.dumps({
                'source': 'Environment variables available',
                'config': safe_config
            }).encode())
            return
            
        # For all other files, use the default handler
        return super().do_GET()

if __name__ == "__main__":
    handler = EnvTemplateHandler
    
    # Allow reuse of the port
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at port {PORT}")
        print(f"Environment variables configured: {list(FALLBACK_ENV.keys())}")
        httpd.serve_forever()