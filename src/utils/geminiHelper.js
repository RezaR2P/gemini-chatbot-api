/**
 * Utility functions for working with the Gemini API
 */

/**
 * Extracts text content from a Gemini API response
 * Handles different response structures
 * 
 * @param {Object} resp - The response from Gemini API
 * @returns {string} - The extracted text content
 */
export function extractText(resp) {
  try {
    // Prefer convenience fields
    let text = resp?.response?.output_text ?? resp?.response?.text;
    
    // Try candidates -> content.parts array concatenation
    if (!text) {
      const parts = resp?.response?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        text = parts.map(p => p?.text ?? '').join('').trim();
      }
    }

    // Older/alternative shapes
    if (!text) {
      text = resp?.candidates?.[0]?.content?.parts?.[0]?.text
        ?? resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text
        ?? resp?.response?.candidates?.[0]?.content?.text;
    }

    return (typeof text === 'string' && text.length > 0)
      ? text
      : JSON.stringify(resp, null, 2);
  } catch (err) {
    console.error("Error extracting text:", err);
    return JSON.stringify(resp, null, 2);
  }
}
