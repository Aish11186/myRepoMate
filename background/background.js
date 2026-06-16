importScripts('../config.js');

// Listen for installation and open options page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateOnboarding") {
    handleOnboardingGeneration(request.repoInfo)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  } else if (request.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Fetch Gemini API using saved credentials or hardcoded fallback
async function handleOnboardingGeneration(repoInfo) {
  const settings = await chrome.storage.local.get(["skillLevel", "knownTech", "learnTech"]);

  const skillLevel = settings.skillLevel || "Beginner";
  const knownTech = settings.knownTech || [];
  const learnTech = settings.learnTech || "";

  // Construct prompt tailored to the user's profile
  const prompt = `You are a helpful software engineering mentor. A user is visiting a GitHub repository. Your goal is to analyze the repository's files and details, and provide a personalized codebase walkthrough and onboarding guide to help them contribute.

USER PROFILE:
- Skill Level: ${skillLevel}
- Comfortable Technologies: ${knownTech.join(", ") || "None specified"}
- Technologies they want to learn: ${learnTech || "None specified"}

REPOSITORY DETAILS:
- Name: ${repoInfo.repoName}
- Languages: ${JSON.stringify(repoInfo.languages)}
- Visible Files & Folder Structure:
${repoInfo.fileList.map(f => `  - ${f}`).join("\n")}

README Content:
"""
${repoInfo.readmeText || "No README content found."}
"""

Please generate a personalized, in-depth onboarding guide in markdown. To ensure it loads quickly, keep descriptions concise. Structure your response EXACTLY under these two H2 headings:

## Codebase Walkthrough & Entry Points
Provide a clear, structured walkthrough of the repository. Go file-by-file through the provided visible file list, explaining what each key file does and its role in the codebase using exactly one brief sentence per file. Keep it highly focused and clear for a ${skillLevel}, using inline code formatting. Do not elaborate on GitHub files like contributors or commit or readme. Only relevant codebased information. 

## Stack Match & Learning Guide
Provide a personalized analysis of the repository's stack. Compare it to the user's comfortable tools (${knownTech.join(", ") || "None specified"}) and learning goals (${learnTech || "None specified"}). Provide concrete learning advice, key concepts to focus on, and a step-by-step learning roadmap tailored to a ${skillLevel}. Keep this entire section brief, with a strict maximum of 8-9 sentences overall.`;

  const keys = self.GEMINI_API_KEYS || [];
  if (keys.length === 0) {
    throw new Error("No Gemini API Keys configured in config.js.");
  }

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key || key.includes("YOUR_SECOND_API_KEY_HERE")) continue;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Invalid response format from Gemini API.");
      }

      return text;
    } catch (err) {
      console.warn(`Gemini API Key index ${i} failed: ${err.message}`);
      lastError = err;
      // Continue to next key
    }
  }

  throw new Error(`All Gemini API Keys failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}
