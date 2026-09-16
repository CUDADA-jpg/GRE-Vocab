(() => {
  'use strict';
  const words = window.WORDS;
  const $ = id => document.getElementById(id);
  $('word-count').textContent = words.length;
  $('total-words').textContent = words.length;
  const storageKey = 'wordloom-memories-v1';
  let edits = {};
  let storageAvailable = true;
  try { const raw = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (raw && typeof raw === 'object' && !Array.isArray(raw)) edits = raw; } catch { storageAvailable = false; }
  const reviewKey = 'wordloom-reviews-v1';
  const Review = window.WordloomReview;
  let reviewStore = { version: 1, records: {}, events: [] };
  let reviewLoadError = false;
  let mode = 'study';
  let revealed = false;
  let usedHint = false;
  let sessionCount = 0;
  let reviewQueue = [];
  let ratingBusy = false;
  function loadReviews() {
    try {
      const saved = localStorage.getItem(reviewKey);
      reviewStore = saved ? Review.validateStore(JSON.parse(saved)) : { version: 1, records: {}, events: [] };
      reviewLoadError = false;
    } catch { reviewLoadError = true; }
  }
  loadReviews();
  let index = 0;
  const familiarityKey = 'wordloom-familiarity-v1';
  function readFamiliarity() {
    const raw = localStorage.getItem(familiarityKey);
    const data = raw ? JSON.parse(raw) : { records: {}, events: [] };
    if (!data || typeof data.records !== 'object' || !data.records || Array.isArray(data.records) || !Array.isArray(data.events)) throw new Error('Invalid familiarity data');
    for (const record of Object.values(data.records)) if (!record || !Number.isInteger(record.value) || record.value < 1 || record.value > 5) throw new Error('Invalid familiarity score');
    return data;
  }
  function renderFamiliarity() {
    let record;
    try { record = readFamiliarity().records[words[index].word]; }
    catch { $('familiarity-status').hidden = false; $('familiarity-status').textContent = '暂时无法读取熟悉度记录，请检查浏览器存储后重试。'; document.querySelectorAll('[data-familiarity]').forEach(button => button.setAttribute('aria-pressed', 'false')); return; }
    document.querySelectorAll('[data-familiarity]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.familiarity) === record?.value)));
    $('familiarity-status').textContent = ''; $('familiarity-status').hidden = true;
  }
  document.querySelectorAll('[data-familiarity]').forEach(button => button.addEventListener('click', () => {
    const value = Number(button.dataset.familiarity), word = words[index].word;
    try {
      const data = readFamiliarity();
      const firstRating = !data.records[word];
      if (data.records[word]?.value === value) return;
      const event = { word, value, recordedAt: Date.now(), source: 'self_report', mode, answerVisible: mode === 'study' || revealed, usedHint: mode === 'review' && usedHint };
      data.records[word] = event; data.events.push(event);
      localStorage.setItem(familiarityKey, JSON.stringify(data));
      renderFamiliarity();
      const rated = window.WordloomCheckpoint.summarize(words, data.records).rated;
      if (firstRating && rated % 10 === 0) showCheckpoint();
    } catch { $('familiarity-status').hidden = false; $('familiarity-status').textContent = '未能保存，原记录未修改。请检查浏览器存储后再试。'; }
  }));
  window.addEventListener('storage', e => { if (e.key === familiarityKey || e.key === null) renderFamiliarity(); });
  let editTarget = null;
  let toastTimer;
  const pad = n => String(n).padStart(2, '0');
  function localEdit(word) { const x = edits[word]; return x && typeof x.story === 'string' && typeof x.hook === 'string' ? x : null; }
  function chooseFromHash() { mode = 'study'; let word; try { word = decodeURIComponent(location.hash.slice(1)); } catch { word = ''; } const found = words.findIndex(w => w.word === word); index = found < 0 ? 0 : found; render(); }
  function select(i) { mode = 'study'; index = Math.max(0, Math.min(words.length - 1, i)); history.replaceState(null, '', '#' + words[index].word); render(); closeMenu(); }
  function renderList() {
    const query = $('search').value.trim().toLowerCase();
    $('word-list').replaceChildren();
    let count = 0;
    words.forEach((w, i) => {
      if (query && ![w.word,w.zh,w.en,w.hook,localEdit(w.word)?.hook || ''].join(' ').toLowerCase().includes(query)) return;
      count++;
      const button = document.createElement('button'); button.className = 'word-row' + (index === i ? ' active' : '');
      if (index === i) button.setAttribute('aria-current', 'true');
      const n = document.createElement('span'); n.className = 'row-num'; n.textContent = pad(i + 1);
      const text = document.createElement('span'); text.className = 'row-word'; text.textContent = w.word;
      const arrow = document.createElement('span'); arrow.className = 'row-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden','true');
      button.append(n,text,arrow); button.addEventListener('click',()=>select(i)); $('word-list').append(button);
    });
    $('empty').hidden = count > 0;
  }
  function render() {
    const w = words[index], edited = localEdit(w.word);
    $('word').textContent = w.word;
    $('number').textContent = 'WORD ' + String(index+1).padStart(3,'0');
    $('pos').textContent = w.pos; $('form').textContent = w.form; $('ipa').textContent = w.ipa;
    $('monogram').textContent = w.word.charAt(0) + '.';
    $('zh').textContent = w.zh; $('en').textContent = w.en;
    $('usage').textContent = w.usage; $('usage').hidden = !w.usage;
    $('memory-type').textContent = edited ? '我的联想 · 自创联想，非词源' : w.memoryType;
    $('story').textContent = edited ? edited.story : w.story;
    $('hook').textContent = edited ? edited.hook : w.hook;
    $('edited').hidden = !edited;
    const showArt = !!w.art && !edited;
    $('memory-figure').hidden = !showArt;
    if (showArt) { $('memory-image').src = w.art; $('memory-image').alt = w.artAlt; }
    else { $('memory-image').removeAttribute('src'); $('memory-image').alt = ''; }
    $('source').href = w.source;
    $('saved-note').textContent = edited ? '个人联想已保存在此浏览器' : '收录于我的单词本';
    $('position').textContent = pad(index+1) + ' / ' + pad(words.length);
    $('prev').disabled = index === 0; $('next').disabled = index === words.length-1;
    document.title = w.word + ' · 词间 Wordloom';
    renderList();
    renderFamiliarity();
    renderReview();
  }
  function notify(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4000);
  }
  function dueNow() { return Review.dueWords(words, reviewStore.records, Date.now()); }
  function showReviewError(message) { $('review-error').textContent = message; $('review-error').hidden = !message; }
  function updateDueCount() { $('due-count').textContent = reviewLoadError ? '—' : dueNow().length; }
  function startReview(resetSession = true) {
    loadReviews(); mode = 'review';
    if (resetSession) sessionCount = 0;
    reviewQueue = reviewLoadError ? [] : dueNow().map(w => w.word);
    // Start with the currently open card when it is due, without treating an early card as due.
    const current = words[index].word;
    if (reviewQueue.includes(current)) reviewQueue = [current, ...reviewQueue.filter(w => w !== current)];
    openReviewWord(); closeMenu();
  }
  function openReviewWord() {
    revealed = false; usedHint = false;
    if (reviewQueue.length) { index = words.findIndex(w => w.word === reviewQueue[0]); history.replaceState(null, '', '#' + words[index].word); }
    render();
  }
  function renderReview() {
    const reviewing = mode === 'review';
    const done = reviewing && reviewQueue.length === 0 && !reviewLoadError;
    $('study-mode').setAttribute('aria-pressed', String(!reviewing));
    $('review-mode').setAttribute('aria-pressed', String(reviewing));
    $('pager').hidden = reviewing;
    $('review-status').hidden = !reviewing;
    $('card').hidden = done || (reviewing && reviewLoadError);
    $('review-done').hidden = !done;
    $('card-answer').hidden = reviewing && !revealed;
    $('review-front').hidden = !reviewing || revealed;
    $('review-rating').hidden = !reviewing || !revealed || done;
    if (!reviewing) { $('schedule-info').hidden = true; $('schedule-info-button').setAttribute('aria-expanded','false'); }
    updateDueCount();
    if (reviewLoadError && reviewing) showReviewError('暂时无法读取本机复习记录。为保护原记录，已暂停写入；请检查浏览器存储设置后重新进入复习。');
    else showReviewError('');
    $('review-progress').textContent = '本轮已复习 ' + sessionCount + ' 个 · 待复习 ' + reviewQueue.length + ' 个';
    if (done) {
      $('done-title').textContent = sessionCount ? '这一轮，先到这里。' : '暂时没有到期的单词。';
      $('done-description').textContent = sessionCount ? '本轮已记录 ' + sessionCount + ' 次回忆，下次复习已安排。' : '可以继续看完整学习卡，或者到时间再回来。';
      const times = words.map(w => reviewStore.records[w.word]?.dueAt).filter(Number.isFinite);
      const soonest = times.length ? Math.min(...times) : null;
      $('next-due').textContent = soonest ? '最近一次复习：' + new Date(soonest).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
      return;
    }
    if (!reviewing || reviewLoadError) return;
    const w = words[index], edited = localEdit(w.word);
    $('hint-panel').hidden = !usedHint;
    $('show-hint').disabled = usedHint;
    $('show-hint').textContent = usedHint ? '已看过提示' : '给我一点提示';
    $('hint-text').textContent = edited ? '你的联想开头：' + edited.story.slice(0, 45) + (edited.story.length > 45 ? '…' : '') : w.cue;
    $('hint-image').hidden = !usedHint || !!edited || !w.art;
    if (usedHint && !edited && w.art) { $('hint-image').src = w.art; $('hint-image').alt = w.artAlt; }
    else { $('hint-image').removeAttribute('src'); $('hint-image').alt = ''; }
    $('rating-note').textContent = usedHint ? '这次已看过提示。请选“需要提示”，仍想不起来则选“忘了”。' : '按展开前的真实感觉选择。';
    for (const rating of ['recalled', 'hint', 'forgot']) {
      $('interval-' + rating).textContent = Review.intervalLabel(Review.plan(reviewStore.records[w.word], rating, Date.now(), usedHint).interval);
      $('rate-' + rating).disabled = ratingBusy || (rating === 'recalled' && usedHint);
    }
    if (usedHint) $('interval-recalled').textContent = '本次已用提示';
  }
  function rate(rating) {
    if (mode !== 'review' || !revealed || !reviewQueue.length || reviewLoadError || ratingBusy) return;
    ratingBusy = true;
    const w = words[index], now = Date.now();
    // Merge the latest stored records before writing, so another open tab's work is retained.
    loadReviews();
    if (reviewLoadError) { ratingBusy = false; renderReview(); return; }
    const before = reviewStore.records[w.word];
    const result = Review.plan(before, rating, now, usedHint);
    const event = { word: w.word, reviewedAt: now, selectedRating: rating, rating: result.rating, usedHint, nextDueAt: result.dueAt, previousDueAt: before?.dueAt ?? null };
    const nextStore = { version: 1, records: { ...reviewStore.records, [w.word]: result }, events: [...reviewStore.events, event] };
    try { localStorage.setItem(reviewKey, JSON.stringify(nextStore)); }
    catch { ratingBusy = false; showReviewError('复习记录未能保存，本词没有跳过。请检查浏览器存储后再试。'); return; }
    reviewStore = nextStore; sessionCount++; ratingBusy = false;
    reviewQueue = reviewQueue.filter(word => word !== w.word);
    notify(w.word + ' · ' + Review.intervalLabel(result.interval) + '再复习');
    openReviewWord(); $('main').focus();
    if (sessionCount % 10 === 0) showCheckpoint();
  }
  $('study-mode').addEventListener('click', () => { mode = 'study'; render(); });
  $('review-mode').addEventListener('click', () => startReview());
  $('back-to-study').addEventListener('click', () => { mode = 'study'; render(); });
  $('check-due').addEventListener('click', () => startReview(false));
  $('show-hint').addEventListener('click', () => { usedHint = true; renderReview(); });
  $('show-answer').addEventListener('click', () => { revealed = true; renderReview(); });
  document.querySelectorAll('[data-rating]').forEach(button => button.addEventListener('click', () => rate(button.dataset.rating)));
  $('schedule-info-button').addEventListener('click', () => { $('schedule-info').hidden = !$('schedule-info').hidden; $('schedule-info-button').setAttribute('aria-expanded', String(!$('schedule-info').hidden)); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadReviews(); updateDueCount(); } });
  setInterval(updateDueCount, 15000);
  $('memory-image').addEventListener('error', () => { $('memory-figure').hidden = true; });
  $('hint-image').addEventListener('error', () => { $('hint-image').hidden = true; });
  function closeMenu() { $('sidebar').classList.remove('open'); $('scrim').hidden = true; $('menu').setAttribute('aria-expanded','false'); }
  $('menu').addEventListener('click',()=>{ $('sidebar').classList.add('open');$('scrim').hidden=false;$('menu').setAttribute('aria-expanded','true');$('search').focus(); });
  $('scrim').addEventListener('click',closeMenu);document.querySelector('.close-menu').addEventListener('click',closeMenu);
  $('search').addEventListener('input',renderList);
  $('search').addEventListener('keydown',e=>{if(e.key==='Enter'){$('word-list').querySelector('button')?.click();}});
  $('prev').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));
  $('edit').addEventListener('click',()=>{const w=words[index],edited=localEdit(w.word);editTarget=w.word;$('editing-word').textContent=w.word;$('story-input').value=edited?edited.story:w.story;$('hook-input').value=edited?edited.hook:w.hook;$('save-error').hidden=true;$('editor').showModal();});
  const closeEditor=()=>{$('editor').close();editTarget=null;};
  $('cancel').addEventListener('click',closeEditor);$('cancel-x').addEventListener('click',closeEditor);
  $('edit-form').addEventListener('submit',e=>{
    e.preventDefault(); const story=$('story-input').value.trim(),hook=$('hook-input').value.trim();
    if(!story||!hook){$('save-error').textContent='请填写联想故事和记忆钩子。';$('save-error').hidden=false;return;}
    if(!editTarget)return;
    const nextEdits={...edits,[editTarget]:{story,hook}};
    try{localStorage.setItem(storageKey,JSON.stringify(nextEdits));storageAvailable=true;}catch{storageAvailable=false;$('save-error').textContent='浏览器暂时无法保存，请允许网站存储后再试。你的文字仍保留在这里。';$('save-error').hidden=false;return;}
    edits=nextEdits;closeEditor();render();clearTimeout(toastTimer);$('toast').textContent='联想已保存到当前浏览器';$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeMenu();return;}
    if(e.target.matches('input,textarea,select') || $('editor').open || $('checkpoint').open || e.ctrlKey || e.metaKey || e.altKey)return;
    if(e.key==='/'){e.preventDefault();if(matchMedia('(max-width:850px)').matches)$('menu').click();else $('search').focus();}
    if(mode === 'review')return;
    if(e.key==='ArrowLeft'){e.preventDefault();select(index-1);}if(e.key==='ArrowRight'){e.preventDefault();select(index+1);}
  });
  window.addEventListener('hashchange',chooseFromHash);
  window.addEventListener('storage',e=>{if(e.key===reviewKey || e.key===null){loadReviews();updateDueCount();}if(e.key!==storageKey)return;try{const x=JSON.parse(e.newValue||'{}');edits=x&&typeof x==='object'&&!Array.isArray(x)?x:{};render();}catch{}});
  function renderCheckpoint() {
    const colors = ['#586d88', '#ff9147', '#f4c94d', '#add158', '#35b9cb', '#a9a2ff'];
    const labels = ['未评分', '1 · 非常不熟悉', '2 · 不熟悉', '3 · 一般', '4 · 熟悉', '5 · 非常熟悉'];
    $('cp-legend').replaceChildren();
    try {
      const data = window.WordloomCheckpoint.summarize(words, readFamiliarity().records);
      let start = 0;
      const stops = [1, 2, 3, 4, 5, 0].map(level => {
        const end = start + (data.total ? data.counts[level] / data.total * 100 : 0);
        const stop = `${colors[level]} ${start}% ${end}%`; start = end; return stop;
      });
      $('cp-ring').style.background = data.total ? `conic-gradient(${stops.join(',')})` : colors[0];
      $('cp-percent').textContent = data.percent === null ? '—' : data.percent.toFixed(1) + '%';
      $('cp-fraction').textContent = data.rated ? `${data.familiar} / ${data.total} 个词` : '尚未评分';
      $('cp-accessible').textContent = data.rated ? `自评熟悉词 ${data.familiar} 个，占全部 ${data.total} 个词的 ${data.percent.toFixed(1)}%。` : '还没有熟悉度评分，学完一个词后选 1–5 即可开始记录。';
      $('cp-rated').textContent = `${data.rated} / ${data.total}`;
      for (let level = 0; level <= 5; level++) {
        const row = document.createElement('div'), dot = document.createElement('i'), label = document.createElement('span');
        dot.style.background = colors[level]; dot.setAttribute('aria-hidden', 'true');
        label.textContent = `${labels[level]} · ${data.counts[level]}`;
        row.append(dot, label); $('cp-legend').append(row);
      }
      const low = data.counts[1] + data.counts[2];
      $('cp-advice').textContent = low ? `有 ${low} 个词评分为 1–2，下一步可以优先回看它们的联想。` : data.counts[0] ? `还有 ${data.counts[0]} 个词未评分，继续按自己的感觉记录就好。` : '所有词都已评分。下次可以先看单词，在心里回忆后再展开。';
    } catch {
      $('cp-ring').style.background = colors[0]; $('cp-percent').textContent = '—';
      $('cp-fraction').textContent = '记录暂不可用'; $('cp-rated').textContent = '—';
      $('cp-accessible').textContent = '暂时无法读取熟悉度记录，请检查浏览器存储后重试。';
      $('cp-advice').textContent = '';
    }
    loadReviews();
    $('cp-due').textContent = reviewLoadError ? '—' : dueNow().length;
    const today = new Date().toDateString(), now = Date.now();
    const validWords = new Set(words.map(w => w.word));
    $('cp-reviewed').textContent = reviewLoadError ? '—' : reviewStore.events.filter(e => e && validWords.has(e.word) && Number.isFinite(e.reviewedAt) && e.reviewedAt <= now && new Date(e.reviewedAt).toDateString() === today).length;
    $('cp-review').disabled = reviewLoadError;
  }
  function showCheckpoint() { renderCheckpoint(); if (!$('checkpoint').open) $('checkpoint').showModal(); }
  $('open-checkpoint').addEventListener('click', showCheckpoint);
  $('close-checkpoint').addEventListener('click', () => $('checkpoint').close());
  $('cp-continue').addEventListener('click', () => $('checkpoint').close());
  $('cp-review').addEventListener('click', () => { $('checkpoint').close(); startReview(); });
  window.addEventListener('storage', e => { if ($('checkpoint').open && [familiarityKey, reviewKey, null].includes(e.key)) renderCheckpoint(); });
  chooseFromHash();
  if(!storageAvailable){$('toast').textContent='浏览器存储暂不可用；词卡仍可正常浏览。';$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
})();
