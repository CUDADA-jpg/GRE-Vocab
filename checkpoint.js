(function (root) {
  'use strict';
  function summarize(words, records) {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const word of words) {
      const value = records[word.word]?.value;
      counts[Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0]++;
    }
    const total = words.length, rated = total - counts[0], familiar = counts[4] + counts[5];
    return { counts, total, rated, familiar, percent: rated && total ? familiar / total * 100 : null };
  }
  const api = { summarize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WordloomCheckpoint = api;
})(typeof window !== 'undefined' ? window : globalThis);
