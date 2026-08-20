const aiGateway = require("./aiGateway");

// In-memory cache for translations to avoid redundant API requests (Feature 13, 14)
const translationCache = new Map();

/**
 * Translates a piece of text to the target language (default 'en') using Gemini.
 * Respects cache and security firewall.
 */
async function translateText(text, targetLanguage = "en") {
  if (!text || !text.trim()) return "";
  
  const cacheKey = `${text.trim()}_${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // If the text is English and target is English, do not translate
  if (targetLanguage === "en" && /^[a-zA-Z0-9\s.,!?'"()-]*$/.test(text)) {
    translationCache.set(cacheKey, text);
    return text;
  }

  const systemPrompt = `You are a professional realtime translator. 
Translate the user input text directly into the target language code: "${targetLanguage}".
Do not add any explanations, preambles, notes, or wrapper text. Only return the direct translation.`;

  try {
    const translated = await aiGateway.callSecuredGemini(systemPrompt, text);
    const cleanedResult = translated.trim();
    translationCache.set(cacheKey, cleanedResult);
    return cleanedResult;
  } catch (err) {
    console.error(`[translationService] Failed to translate:`, err.message);
    return text;
  }
}

/**
 * Automatically detects the language of any given text.
 */
async function detectLanguage(text) {
  if (!text || !text.trim()) return "en";
  const systemPrompt = "Analyze the input text and return ONLY its ISO 639-1 language code (e.g. 'en', 'es', 'ta', 'hi', 'fr'). Do not return anything else.";
  try {
    const code = await aiGateway.callSecuredGemini(systemPrompt, text);
    return code.trim().toLowerCase();
  } catch (err) {
    console.error(`[translationService] Failed to detect language:`, err.message);
    return "en";
  }
}

module.exports = {
  translateText,
  detectLanguage,
  translationCache
};
