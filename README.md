# AI Article Summarizer

A Chrome extension that uses the Gemini API to summarize articles on the web.

## Project Structure

- `js/`: JavaScript files for the Chrome extension
- `css/`: CSS files for styling the extension UI
- `icons/`: Icon files for the extension
- `server.py`: Python Flask API proxy server
- `Dockerfile`: Docker configuration for the API proxy server
- `docker-compose.yml`: Docker Compose configuration for local development
- `render.yaml`: Configuration for deploying to Render

## API Proxy Server

The API proxy server securely handles API calls to the Gemini API by keeping the API key on the server side.

### Local Development with Docker

1. Make sure you have Docker and Docker Compose installed
2. Run the server locally:
   ```
   docker-compose up
   ```
3. The server will be available at `http://localhost:8080`

### Deployment to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Environment**: Docker
   - **Docker Configuration**: Use the Dockerfile in the repository

4. Add the environment variable:
   - `GEMINI_API_KEY`: Your Gemini API key

5. Deploy the service

## Chrome Extension

### Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and ready to use

### Usage

1. Navigate to an article you want to summarize
2. Click the extension icon in the toolbar
3. The extension will extract the article content and send it to the API proxy server
4. The summary will be displayed in a panel on the page

## Development

### Updating the API Endpoint

If you deploy the API proxy server to a different URL, you'll need to update the endpoint in the extension:

1. Update the `proxyServerUrl` in `js/background.js`
2. Update the host permissions in `manifest.json`
3. Reload the extension in Chrome

### Testing

1. Make sure the API proxy server is running
2. Load the extension in Chrome
3. Navigate to an article and test the summarization feature
