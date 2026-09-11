(() => {
  'use strict';
  const words = window.WORDS;
  const $ = id => document.getElementById(id);
  const storageKey = 'wordloom-memories-v1';
  let edits = {};
  let storageAvailable = true;
  try { const raw = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (raw && typeof raw === 'object' && !Array.isArray(raw)) edits = raw; } catch { storageAvailable = false; }
  let index = 0;
  let editTarget = null;
  let toastTimer;
  const pad = n => String(n).padStart(2, '0');
  function localEdit(word) { const x = edits[word]; return x && typeof x.story === 'string' && typeof x.hook === 'string' ? x : null; }
  function chooseFromHash() { let word; try { word = decodeURIComponent(location.hash.slice(1)); } catch { word = ''; } const found = words.findIndex(w => w.word === word); index = found < 0 ? 0 : found; render(); }
  function select(i) { index = Math.max(0, Math.min(words.length - 1, i)); history.replaceState(null, '', '#' + words[index].word); render(); closeMenu(); }
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
    $('example').textContent = w.example; $('translation').textContent = w.translation;
    $('phrases').replaceChildren();
    w.phrases.forEach(p => { const wrap = document.createElement('div');wrap.className='phrase';const en=document.createElement('p');en.className='phrase-en';en.lang='en';en.textContent=p.en;const zh=document.createElement('p');zh.className='phrase-zh';zh.textContent=p.zh;wrap.append(en,zh);$('phrases').append(wrap); });
    $('source').href = w.source;
    $('saved-note').textContent = edited ? '个人联想已保存在此浏览器' : '收录于我的单词本';
    $('position').textContent = pad(index+1) + ' / ' + pad(words.length);
    $('prev').disabled = index === 0; $('next').disabled = index === words.length-1;
    document.title = w.word + ' · 词间 Wordloom';
    renderList();
  }
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
    if(e.target.matches('input,textarea,select') || $('editor').open || e.ctrlKey || e.metaKey || e.altKey)return;
    if(e.key==='/'){e.preventDefault();if(matchMedia('(max-width:850px)').matches)$('menu').click();else $('search').focus();}
    if(e.key==='ArrowLeft'){e.preventDefault();select(index-1);}if(e.key==='ArrowRight'){e.preventDefault();select(index+1);}
  });
  window.addEventListener('hashchange',chooseFromHash);
  window.addEventListener('storage',e=>{if(e.key!==storageKey)return;try{const x=JSON.parse(e.newValue||'{}');edits=x&&typeof x==='object'&&!Array.isArray(x)?x:{};render();}catch{}});
  chooseFromHash();
  if(!storageAvailable){$('toast').textContent='浏览器存储暂不可用；词卡仍可正常浏览。';$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
})();
