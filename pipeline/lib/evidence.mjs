// Checks that a quotation really occurs in the block it cites.

/** Lowercase, strip accents, turn everything that is not a letter or digit into a single space. */
export function normalise(s) {
  return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * @returns {"exact"|"approximate"|"weak"|"failed"|"bad-ref"}
 *  exact        the quote occurs word for word (ignoring case, punctuation and spacing)
 *  approximate  nearly all of its words occur in the block in the same order, but not as one unbroken run
 *  weak         it occurs, but is too short to support anything
 *  failed       it does not occur
 *  bad-ref      the cited block does not exist in the packet
 */
export function checkQuote(quote, blockText, { minWords = 3, overlap = 0.85 } = {}) {
  if (blockText === undefined || blockText === null) return "bad-ref";
  const q = normalise(quote), b = normalise(blockText);
  if (!q) return "failed";
  const words = q.split(" ");
  if ((" " + b + " ").includes(" " + q + " ")) return words.length >= minWords ? "exact" : "weak";
  if (words.length < 4) return "failed";
  // Not one unbroken run: accept as "approximate" only when nearly all the words occur in the same order
  // (OCR line breaks and dropped characters), never for a reworded paraphrase.
  const bw = b.split(" ");
  let prev = new Uint16Array(bw.length + 1), cur = new Uint16Array(bw.length + 1);
  for (const w of words) {
    for (let j = 1; j <= bw.length; j++) cur[j] = w === bw[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[bw.length] / words.length >= overlap ? "approximate" : "failed";
}

/** True when the phrase occurs in the text as whole words. */
export function mentions(text, phrase) {
  const p = normalise(phrase);
  return p.length > 1 && (" " + normalise(text) + " ").includes(" " + p + " ");
}
