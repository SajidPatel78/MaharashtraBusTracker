import os
import http.server
import socketserver
import re
from http import HTTPStatus

PORT = 5000

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
                return os.environ.get(env_var, "")
            
            processed_content = self.env_pattern.sub(replace_env_var, content)
            self.wfile.write(processed_content.encode())
            return
            
        # For all other files, use the default handler
        return super().do_GET()

if __name__ == "__main__":
    handler = EnvTemplateHandler
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()