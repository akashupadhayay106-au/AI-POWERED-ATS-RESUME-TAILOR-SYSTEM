const STOP_WORDS = new Set([
  "the", "and", "a", "an", "or", "but", "if", "in", "on", "at", "to", "for", "of", "as", 
  "is", "was", "are", "were", "be", "been", "being", "it", "this", "that", "these", "those", 
  "with", "by", "from", "into", "through", "during", "before", "after", "above", "below", 
  "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", 
  "why", "how", "all", "each", "both", "few", "more", "most", "other", "some", "such", 
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", 
  "just", "should", "now", "about", "over", "out", "up", "down", "off", "also", "any", 
  "your", "our", "their", "my", "her", "his", "its", "we", "you", "he", "she", "they", 
  "what", "which", "who", "whom"
]);

export function basicKeywordExtraction(jdText, resumeText) {
  // 2. Regex split the JD into words, filter stop words, count frequencies.
  const jdWords = jdText.toLowerCase().split(/[^\w]+/);
  
  const frequency = {};
  jdWords.forEach(word => {
    if (word.length > 1 && !STOP_WORDS.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  // Sort by frequency
  const sortedKeywords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // 3. Check if the top 10 JD keywords exist in the uploaded resume string.
  const top10 = sortedKeywords.slice(0, 10);
  const resumeLower = resumeText.toLowerCase();
  
  let matchedCount = 0;
  const missing = [];
  
  top10.forEach(keyword => {
    // Basic substring or regex check
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(resumeLower)) {
      matchedCount++;
    } else {
      missing.push(keyword);
    }
  });

  const score = top10.length > 0 ? Math.round((matchedCount / top10.length) * 100) : 0;
  
  const result = { score, missing };
  // 4. Output a raw JSON object to the console
  console.log(JSON.stringify(result));
  
  return result;
}
