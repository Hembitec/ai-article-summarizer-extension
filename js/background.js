// js/background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "summarizeArticle") {
        console.log("Background: Received article text:", request.articleText ? request.articleText.substring(0, 200) + "..." : "[No article text received]");

        if (!request.articleText) {
            console.error("Background: No article text received from content script.");
            sendResponse({ error: "No article text provided for summarization." });
            return true; // Keep the message channel open for asynchronous response
        }

        // Call Gemini API directly (temporary solution)
        // NOTE: In a production environment, this API key should be kept secure on a server
        const apiKey = "AIzaSyD98LaiHuWWyXn8hISvcnvHKmflbGoeHUk";
        const apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

        console.log("Background: Calling Gemini API directly for summarization...");

        // Construct the prompt for Gemini
        const prompt = `Please analyze the following article. Provide:
1. A concise summary (3-5 sentences) that captures the main point, key arguments, and significance of the article.
2. 3-5 key points that highlight the most important information, statistics, or insights from the article. Focus on actionable takeaways when relevant.
3. A 20-40 word conclusion that emphasizes the article's significance or main takeaway for readers.

Adjust your response based on the article type (news, tutorial, research, opinion, etc.). For tutorials, emphasize steps/methods; for news, focus on facts and context; for research, highlight findings and implications.

Present the summary at an accessible reading level (approximately 8th-10th grade) regardless of the article's complexity.

If the article contains strong opinion elements or potential bias, note this briefly in your summary.

IMPORTANT: Use plain text only. Do not use markdown formatting. Do not use asterisks (*), underscores (_), or other special characters for emphasis.

Article Text:
---
${request.articleText}
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
[Your 20-40 word conclusion in plain text]`;

        const requestBody = {
            contents: [{
                parts: [{ "text": prompt }]
            }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 800
            }
        };

        fetch(`${apiEndpoint}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        })
        .then(response => {
            if (!response.ok) {
                // Try to get error message from API response body
                return response.json().then(errorBody => {
                    console.error("Gemini API Error Response:", errorBody);
                    throw new Error(`API Error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorBody.error || errorBody)}`);
                }).catch(parseError => {
                    // If parsing error body fails, throw generic error
                    throw new Error(`API Error: ${response.status} ${response.statusText}. Could not parse error response.`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Background: Received data from Gemini API:", data);

            // Process the response from Gemini API
            let fullText = "";
            if (data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0]) {
                fullText = data.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Could not extract text from API response.");
            }

            // Parse the response
            let summary = "Could not extract summary.";
            let keypoints = ["Could not extract key points."];
            let conclusion = "Could not extract conclusion.";

            const summaryMatch = fullText.match(/Summary:\s*([\s\S]*?)(Key Points:|Conclusion:|$)/i);
            if (summaryMatch && summaryMatch[1]) summary = summaryMatch[1].trim();

            const keypointsMatch = fullText.match(/Key Points:\s*([\s\S]*?)(Conclusion:|$)/i);
            if (keypointsMatch && keypointsMatch[1]) {
                keypoints = keypointsMatch[1].trim().split(/\n\s*-\s*/).map(pt => pt.trim()).filter(pt => pt && pt.toLowerCase() !== "key points:");
                if (keypoints.length === 0 || (keypoints.length === 1 && !keypoints[0])) keypoints = ["Could not parse key points."];
            }

            const conclusionMatch = fullText.match(/Conclusion:\s*([\s\S]*?$)/i);
            if (conclusionMatch && conclusionMatch[1]) conclusion = conclusionMatch[1].trim();

            // Send the parsed response back to the extension
            sendResponse({
                summary: summary,
                keypoints: keypoints,
                conclusion: conclusion
            });
        })
        .catch(error => {
            console.error("Background: Error calling Gemini API:", error);
            sendResponse({ error: "Failed to get summary: " + error.message });
        });

        return true; // Crucial: Indicates that sendResponse will be called asynchronously.
    }
});

console.log("Background script loaded and listener attached for proxy server calls.");
