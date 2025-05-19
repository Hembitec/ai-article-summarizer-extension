# AI Article Summarizer API Proxy Server

This is a Python Flask API proxy server for the AI Article Summarizer Chrome extension. It securely handles API calls to the Gemini API by keeping the API key on the server side.

## Local Development

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=5000
   ```

3. Run the server:
   ```
   python server.py
   ```

4. The server will be available at `http://localhost:5000`

## Deployment to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: article-summarizer-api (or your preferred name)
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`
   - **Root Directory**: `server` (if your repository has the server code in a subdirectory)

4. Add the environment variable:
   - `GEMINI_API_KEY`: Your Gemini API key

5. Deploy the service

## API Endpoints

### GET /

Returns a simple status message to confirm the server is running.

### POST /api/summarize

Summarizes an article using the Gemini API.

**Request Body:**
```json
{
  "articleText": "The full text of the article to summarize"
}
```

**Response:**
```json
{
  "summary": "A concise summary of the article",
  "keypoints": ["Key point 1", "Key point 2", "Key point 3"],
  "conclusion": "A brief conclusion"
}
```

## Security Notes

- The Gemini API key is stored as an environment variable on the server
- CORS is configured to allow requests only from the Chrome extension
- The API key is never exposed to the client
