(function (root) {
  'use strict';
  const DAY = 24 * 60 * 60 * 1000;
  const MINUTE = 60 * 1000;
  const DAYS = [1, 3, 7, 14, 30, 60];
  function stageOf(record) { return Math.max(0, Math.min(DAYS.length, Number.isInteger(record?.stage) ? record.stage : 0)); }
  function plan(record, rating, now, usedHint = false) {
    if (!['recalled', 'hint', 'forgot'].includes(rating) || !Number.isFinite(now)) throw new Error('Invalid review');
    const effectiveRating = usedHint && rating === 'recalled' ? 'hint' : rating;
    const stage = stageOf(record);
    let interval, nextStage;
    if (effectiveRating === 'recalled') { interval = DAYS[Math.min(stage, DAYS.length - 1)] * DAY; nextStage = Math.min(stage + 1, DAYS.length); }
    else if (effectiveRating === 'hint') { interval = 10 * MINUTE; nextStage = Math.max(0, stage - 1); }
    else { interval = MINUTE; nextStage = 0; }
    return { stage: nextStage, dueAt: now + interval, lastReviewedAt: now, interval, rating: effectiveRating, reviews: (Number.isInteger(record?.reviews) ? record.reviews : 0) + 1 };
  }
  function dueWords(words, records, now) {
    return words.filter(w => !records[w.word] || records[w.word].dueAt <= now)
      .sort((a, b) => (records[a.word]?.dueAt || 0) - (records[b.word]?.dueAt || 0));
  }
  function intervalLabel(ms) { return ms < DAY ? Math.round(ms / MINUTE) + ' 分钟后' : Math.round(ms / DAY) + ' 天后'; }
  function validateStore(value) {
    if (!value || typeof value !== 'object' || value.version !== 1 || !value.records || Array.isArray(value.records) || !Array.isArray(value.events)) throw new Error('Invalid review data');
    for (const r of Object.values(value.records)) if (!r || !Number.isFinite(r.dueAt) || !Number.isInteger(r.stage) || r.stage < 0 || r.stage > DAYS.length) throw new Error('Invalid review record');
    return value;
  }
  const api = { plan, dueWords, intervalLabel, validateStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WordloomReview = api;
})(typeof window !== 'undefined' ? window : globalThis);
