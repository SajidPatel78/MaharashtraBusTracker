import socket
import time

# Create a socket and try to bind to the port to check if it's free
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return False  # Port is free
        except OSError:
            return True   # Port is in use

# Wait for the port to be released
def wait_for_port_release(port, timeout=30):
    start_time = time.time()
    while is_port_in_use(port):
        if time.time() - start_time > timeout:
            print(f"Timeout waiting for port {port} to be released.")
            return False
        print(f"Port {port} is still in use. Waiting...")
        time.sleep(1)
    
    print(f"Port {port} is now free.")
    return True

# Check port 5000
port = 5000
print(f"Checking if port {port} is in use...")
if is_port_in_use(port):
    print(f"Port {port} is in use. Waiting for it to be released...")
    wait_for_port_release(port)
else:
    print(f"Port {port} is free.")