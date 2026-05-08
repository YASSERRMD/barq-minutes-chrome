export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','to','in','on','for','with','at','by','from','that','this','those',
  'is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','must','can','i','you','we','they','he','she','it','as','if','so','than','then',
]);

export function removeStopwords(text: string): string {
  return text
    .split(' ')
    .filter((w) => !STOPWORDS.has(w))
    .join(' ');
}

export function stemNaive(word: string): string {
  return word
    .replace(/(ing|ed|ly|s|es)$/u, '')
    .replace(/(tion|ment|ness)$/u, '')
    .toLowerCase();
}

export function tokenize(text: string): string[] {
  return text.split(/[^a-z0-9']+/i).filter(Boolean).map((w) => w.toLowerCase());
}
