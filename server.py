# This file imports and runs the server from the server directory
# This allows Render to find the server.py file in the root directory

# Import the app from the server directory
from server.server import app

# This is only used when running this file directly
if __name__ == '__main__':
    import os
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
