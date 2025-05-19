import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
# In production, you should restrict this to your extension's ID
CORS(app)

# Get API key from environment variable
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable not set!")

# Gemini API endpoint
GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

@app.route('/')
def index():
    return jsonify({
        "status": "ok",
        "message": "AI Article Summarizer API Proxy Server is running"
    })

@app.route('/api/summarize', methods=['POST'])
def summarize():
    try:
        # Get article text from request
        data = request.json
        article_text = data.get('articleText')

        if not article_text:
            logger.error("No article text provided")
            return jsonify({"error": "No article text provided for summarization"}), 400

        logger.info(f"Received article text: {article_text[:200]}...")

        # Construct the prompt for Gemini
        prompt = f"""Please analyze the following article. Provide:
1. A concise summary (3-5 sentences) that captures the main point, key arguments, and significance of the article.
2. 3-5 key points that highlight the most important information, statistics, or insights from the article. Focus on actionable takeaways when relevant.
3. A 20-40 word conclusion that emphasizes the article's significance or main takeaway for readers.

Adjust your response based on the article type (news, tutorial, research, opinion, etc.). For tutorials, emphasize steps/methods; for news, focus on facts and context; for research, highlight findings and implications.

Present the summary at an accessible reading level (approximately 8th-10th grade) regardless of the article's complexity.

If the article contains strong opinion elements or potential bias, note this briefly in your summary.

IMPORTANT: Use plain text only. Do not use markdown formatting. Do not use asterisks (*), underscores (_), or other special characters for emphasis.

Article Text:
---
{article_text}
---

Format your response with clear headings and consistent structure for each section:

Summary:
[Your 3-5 sentence summary in plain text]

Key Points:
- [First key point in plain text]
- [Second key point in plain text]
- [Third key point in plain text]
(Add 1-2 more points only if truly important)

Conclusion:
[Your 20-40 word conclusion in plain text]"""

        # Prepare request to Gemini API
        request_body = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800
            }
        }

        # Call Gemini API
        logger.info("Calling Gemini API...")
        response = requests.post(
            f"{GEMINI_API_ENDPOINT}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json=request_body
        )

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"Gemini API Error: {response.status_code} - {response.text}")
            return jsonify({"error": f"API Error: {response.status_code}"}), 500

        # Parse the response
        gemini_response = response.json()
        logger.info("Received response from Gemini API")

        # Extract the text from the response
        full_text = ""
        if (gemini_response.get('candidates') and
            gemini_response['candidates'][0].get('content') and
            gemini_response['candidates'][0]['content'].get('parts') and
            gemini_response['candidates'][0]['content']['parts'][0]):
            full_text = gemini_response['candidates'][0]['content']['parts'][0]['text']
        else:
            logger.error("Could not extract text from API response")
            return jsonify({"error": "Could not extract text from API response"}), 500

        # Parse the response
        summary = "Could not extract summary."
        keypoints = ["Could not extract key points."]
        conclusion = "Could not extract conclusion."

        # Extract summary
        summary_match = None
        try:
            import re
            summary_match = re.search(r'Summary:\s*([\s\S]*?)(Key Points:|Conclusion:|$)', full_text, re.IGNORECASE)
            if summary_match and summary_match.group(1):
                summary = summary_match.group(1).strip()
        except Exception as e:
            logger.error(f"Error extracting summary: {str(e)}")

        # Extract key points
        keypoints_match = None
        try:
            keypoints_match = re.search(r'Key Points:\s*([\s\S]*?)(Conclusion:|$)', full_text, re.IGNORECASE)
            if keypoints_match and keypoints_match.group(1):
                keypoints_text = keypoints_match.group(1).strip()
                keypoints = [pt.strip() for pt in re.split(r'\n\s*-\s*', keypoints_text)
                            if pt.strip() and pt.strip().lower() != 'key points:']
                if not keypoints:
                    keypoints = ["Could not parse key points."]
        except Exception as e:
            logger.error(f"Error extracting key points: {str(e)}")

        # Extract conclusion
        conclusion_match = None
        try:
            conclusion_match = re.search(r'Conclusion:\s*([\s\S]*?$)', full_text, re.IGNORECASE)
            if conclusion_match and conclusion_match.group(1):
                conclusion = conclusion_match.group(1).strip()
        except Exception as e:
            logger.error(f"Error extracting conclusion: {str(e)}")

        # Return the parsed response
        return jsonify({
            "summary": summary,
            "keypoints": keypoints,
            "conclusion": conclusion
        })

    except Exception as e:
        logger.exception(f"Error in summarize endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.getenv('PORT', 5000))

    # Run the app
    app.run(host='0.0.0.0', port=port)
