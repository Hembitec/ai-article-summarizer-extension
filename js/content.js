// js/content.js

let summaryPanel;

// Check if the current site is in the blocked list
function isCurrentSiteBlocked() {
    return new Promise((resolve) => {
        // Get the domain of the current site
        const currentDomain = window.location.hostname.toLowerCase();
        
        // Automatically block all localhost URLs
        if (currentDomain === 'localhost' || currentDomain.startsWith('localhost:') || currentDomain.includes('.localhost')) {
            console.log("AI Article Summarizer: Automatically blocking localhost domain:", currentDomain);
            resolve(true);
            return;
        }
        
        // Get the list of blocked sites from storage
        chrome.storage.sync.get({ blockedSites: [] }, (data) => {
            const blockedSites = data.blockedSites;
            
            // Check if the current domain matches any blocked site
            // We check for exact match or if the current domain ends with .blockedsite.com
            const isBlocked = blockedSites.some(site => 
                currentDomain === site || 
                currentDomain.endsWith(`.${site}`) ||
                // Also handle cases where user entered with port numbers
                (site.includes(':') && currentDomain.startsWith(site.split(':')[0]))
            );
            
            resolve(isBlocked);
        });
    });
}

function createSummaryPanel() {
    summaryPanel = document.createElement('div');
    summaryPanel.id = 'ai-summarizer-panel';
    summaryPanel.style.display = 'none'; // Initially hidden

    summaryPanel.innerHTML = `
        <div id="ai-summarizer-panel-header">
            <h2>Article Summary</h2>
            <button id="ai-summarizer-close-btn">&times;</button>
        </div>
        <div id="ai-summary-content-area">
            <div id="ai-summary-content"></div>
            <div id="ai-summary-keypoints"></div>
            <div id="ai-summary-conclusion"></div>
        </div>
        <!-- Footer with copy button removed -->
    `;
    document.body.appendChild(summaryPanel);

    // Directly set scrolling styles using JavaScript
    const contentArea = document.getElementById('ai-summary-content-area');
    if (contentArea) {
        contentArea.style.overflowY = 'scroll';
        contentArea.style.maxHeight = 'calc(85vh - 70px)';
        contentArea.style.display = 'block';
    }

    const closeButton = document.getElementById('ai-summarizer-close-btn');
    closeButton.addEventListener('click', () => {
        summaryPanel.style.display = 'none';
    });

    // Copy button and its listener are removed.
}

function toggleSummaryPanel() {
    if (!summaryPanel) {
        createSummaryPanel(); // Create panel if it doesn't exist yet
    }
    // Check if summaryPanel is defined before accessing style
    if (summaryPanel) {
        const isHidden = summaryPanel.style.display === 'none';
        summaryPanel.style.display = isHidden ? 'block' : 'none';

        // If opening the panel, extract and display article content
        if (isHidden && summaryPanel.style.display === 'block') {
            console.log("Attempting to extract article content...");
            const summaryContentEl = document.getElementById('ai-summary-content');
            const panelTitleEl = summaryPanel.querySelector('#ai-summarizer-panel-header h2');

            try {
                // Check if Readability is defined
                if (typeof Readability === 'undefined') {
                    console.error("Readability library is not defined!");
                    if (summaryContentEl) summaryContentEl.innerHTML = "<p><em>Error: Readability library not loaded.</em></p>";
                    if (panelTitleEl) panelTitleEl.textContent = "Error";
                    return; // Stop further execution in this block
                }
                console.log("Readability type:", typeof Readability);

                const documentClone = document.cloneNode(true);
                console.log("Document cloned for Readability.");

                const article = new Readability(documentClone).parse();
                console.log("Readability parse attempted.");

                if (article) {
                    console.log('Extracted Title:', article.title);
                    console.log('Extracted Text Content (Snippet):', article.textContent ? article.textContent.substring(0, 200) + "..." : "No text content extracted.");
                    console.log('Extracted HTML Content (Snippet):', article.content ? article.content.substring(0, 200) + "..." : "No HTML content extracted.");

                    if (panelTitleEl) {
                        panelTitleEl.textContent = article.title || "Article Summary"; // Keep showing extracted title
                    }
                    // Display a simulated progress bar while waiting for the summary from background
                    if (summaryContentEl) {
                        // Clear previous content and show progress bar
                        summaryContentEl.innerHTML = `
                            <div class="ai-summarizer-progress-container">
                                <div class="ai-summarizer-progress-bar"></div>
                            </div>
                            <p style="text-align: center; font-size: 0.9em; margin-top: 10px;">Generating summary...</p>
                        `;
                        // Ensure other areas are clear
                        const keypointsEl = document.getElementById('ai-summary-keypoints');
                        const conclusionEl = document.getElementById('ai-summary-conclusion');
                        if (keypointsEl) keypointsEl.innerHTML = "";
                        if (conclusionEl) conclusionEl.innerHTML = "";
                    }

                    // Send extracted text to background script
                    if (article.textContent) {
                        chrome.runtime.sendMessage(
                            { type: "summarizeArticle", articleText: article.textContent },
                            (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error("Error sending message to background:", chrome.runtime.lastError.message);
                                    if (summaryContentEl) summaryContentEl.innerHTML = `<p><em>Error communicating with background: ${chrome.runtime.lastError.message}</em></p>`;
                                    return;
                                }
                                console.log("Received response from background:", response);

                                const keypointsEl = document.getElementById('ai-summary-keypoints');
                                const conclusionEl = document.getElementById('ai-summary-conclusion');

                                // Clear loading spinner and previous content before populating
                                if (summaryContentEl) summaryContentEl.innerHTML = ""; 
                                if (keypointsEl) keypointsEl.innerHTML = "";
                                if (conclusionEl) conclusionEl.innerHTML = "";

                                if (response && response.summary && response.keypoints && response.conclusion) {
                                    if (summaryContentEl) {
                                        // Clean up summary text - remove asterisks and fix spacing
                                        let cleanSummary = response.summary
                                            .replace(/\*/g, '') // Remove all asterisks
                                            .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
                                            .replace(/\n/g, '<br>') // Convert remaining newlines to <br>
                                            .replace(/\s{2,}/g, ' '); // Replace multiple spaces with single space
                                        
                                        summaryContentEl.innerHTML = `<h4>Summary:</h4><p>${cleanSummary}</p>`;
                                    }
                                    if (keypointsEl && Array.isArray(response.keypoints)) {
                                        // Clean up keypoints - remove asterisks, extra dashes, and fix spacing
                                        const cleanKeypoints = response.keypoints.map(kp => {
                                            return kp
                                                .replace(/^[-•*]\s*/, '') // Remove leading dash, bullet, or asterisk
                                                .replace(/\*/g, '') // Remove all asterisks
                                                .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
                                                .trim();
                                        }).filter(kp => kp.length > 0); // Remove any empty points
                                        
                                        keypointsEl.innerHTML = '<h4>Key Points:</h4><ul>' + 
                                            cleanKeypoints.map(kp => `<li>${kp}</li>`).join('') + 
                                            '</ul>';
                                    }
                                    if (conclusionEl) {
                                        // Clean up conclusion - remove asterisks and fix spacing
                                        let cleanConclusion = response.conclusion
                                            .replace(/\*/g, '') // Remove all asterisks
                                            .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
                                            .replace(/\n/g, '<br>') // Convert remaining newlines to <br>
                                            .replace(/\s{2,}/g, ' '); // Replace multiple spaces with single space
                                        
                                        conclusionEl.innerHTML = `<h4>Conclusion:</h4><p>${cleanConclusion}</p>`;
                                    }
                                } else if (response && response.error) {
                                    console.error("Error from background script:", response.error);
                                    // Clear spinner and show error
                                    if (summaryContentEl) summaryContentEl.innerHTML = `<p><em>Error generating summary: ${response.error}</em></p>`;
                                } else {
                                    console.warn("Received an incomplete or unexpected response from background script:", response);
                                     // Clear spinner and show warning
                                    if (summaryContentEl) summaryContentEl.innerHTML = `<p><em>Could not retrieve a complete summary. The AI response might be in an unexpected format. Check console for details.</em></p>`;
                                }
                            }
                        );
                    } else {
                        console.warn("No text content extracted by Readability to send to background.");
                        if (summaryContentEl) {
                            summaryContentEl.innerHTML = "<p><em>Could not extract text content to summarize.</em></p>";
                        }
                    }
                } else {
                    console.warn('Readability could not parse the article or returned null.');
                    if (panelTitleEl) {
                        panelTitleEl.textContent = "Article Summary";
                    }
                    if (summaryContentEl) {
                        summaryContentEl.innerHTML = "<p><em>Could not extract article content.</em></p>";
                    }
                }
            } catch (e) {
                console.error("Error during Readability parsing or content display:", e);
                if (panelTitleEl) {
                    panelTitleEl.textContent = "Error Extracting Content";
                }
                if (summaryContentEl) {
                    summaryContentEl.innerHTML = `<p><em>Error during article extraction: ${e.message}</em></p>`;
                }
            }

            const keypointsEl = document.getElementById('ai-summary-keypoints');
            if (keypointsEl) keypointsEl.innerHTML = ""; // Clear previous
            const conclusionEl = document.getElementById('ai-summary-conclusion');
            if (conclusionEl) conclusionEl.innerHTML = ""; // Clear previous
        }
    }
}

function createFAB() {
    const fab = document.createElement('div');
    fab.id = 'ai-summarizer-fab';
    // fab.textContent = 'S'; // Remove placeholder text

    // Create image element for the icon
    const fabIcon = document.createElement('img');
    fabIcon.src = chrome.runtime.getURL("icons/icon48.png");
    fabIcon.alt = "Summarize Article";
    fabIcon.id = 'ai-summarizer-fab-icon'; // Add ID for styling
    fab.appendChild(fabIcon);

    document.body.appendChild(fab);

    fab.addEventListener('click', () => {
        console.log('--- FAB Clicked! --- Beginning of click handler.');
        toggleSummaryPanel();
    });
}

// Initialize the extension on page load
async function initializeExtension() {
    // Check if the current site is blocked
    const isBlocked = await isCurrentSiteBlocked();
    
    // Only create the FAB and panel if the site is not blocked
    if (!isBlocked) {
        createFAB();
        createSummaryPanel(); // Create it once, keep it hidden
    } else {
        console.log("AI Article Summarizer: Site is in the blocked list. Extension not loaded.");
    }
}

// Ensure the extension is initialized after the page is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}
