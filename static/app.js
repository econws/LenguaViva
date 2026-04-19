/**
 * LenguaViva — Main application logic (Chinese UI edition)
 * Full integration: segmentation, grammar, conjugation, morphology, syllables,
 * clause detection, sentence patterns, word order, CEFR, vocab book, translation, TTS.
 */
(function () {
  'use strict';

  const segmenter = new SpanishSegmenter();
  const { Role, ROLE_LABELS, analyzeSentence, CLAUSE_TYPE_ZH, CLAUSE_TYPE_COLORS } = window.SpanishGrammar;
  const { translateWord, translateSentence, translateComponents, getExamples } = window.Translator;
  const EdgeTTS = window.EdgeTTS;

  let isPlaying = false;
  let currentUtterance = null;
  let currentAudio = null;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const displayState = {
    showLemma: true, showPos: true, showUnderline: true, showRoles: true,
    showNotes: true, showTranslation: true, showConjugation: true,
    showSyllable: true, showClauses: true, showPatterns: true,
    showWordOrder: true, showCefr: true,
  };

  let ttsEngine = localStorage.getItem('lenguaviva-tts-engine') || 'browser';

  // ── Theme ──
  function initTheme() {
    const saved = localStorage.getItem('lenguaviva-theme');
    if (saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.setAttribute('data-theme', 'dark');
  }
  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('lenguaviva-theme', isDark ? 'light' : 'dark');
    updateThemeIcon();
  }
  function updateThemeIcon() {
    const btn = $('#themeToggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ── TTS (unchanged) ──
  function listSpanishVoices() { return (speechSynthesis.getVoices()||[]).filter(v=>(v.lang||'').toLowerCase().startsWith('es')).sort((a,b)=>(a.name||'').localeCompare(b.name||'')); }
  function populateBrowserVoices() { const sel=$('#browserVoiceSelect'); if(!sel)return; const voices=listSpanishVoices(); sel.innerHTML=''; if(!voices.length){const o=document.createElement('option');o.textContent='无可用西语语音';o.disabled=true;sel.appendChild(o);return;} voices.forEach((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${v.name} (${v.lang})`;sel.appendChild(o);}); const saved=localStorage.getItem('lenguaviva-voice'); if(saved){const idx=voices.findIndex(v=>v.voiceURI===saved);if(idx>=0)sel.value=idx;} }
  function getSelectedBrowserVoice(){const voices=listSpanishVoices();return voices[parseInt($('#browserVoiceSelect')?.value,10)]||voices[0]||null;}
  function populateEdgeVoices(){const sel=$('#edgeVoiceSelect');if(!sel)return;sel.innerHTML='';EdgeTTS.SPANISH_VOICES.forEach(v=>{const o=document.createElement('option');o.value=v.short;o.textContent=v.label;sel.appendChild(o);});const saved=localStorage.getItem('lenguaviva-edge-voice');if(saved)sel.value=saved;}
  function getSelectedEdgeVoice(){return $('#edgeVoiceSelect')?.value||EdgeTTS.SPANISH_VOICES[0].short;}
  function getRate(){return parseFloat($('#speedRange')?.value||'1');}
  function speakText(text){if(!text)return;stopSpeaking();ttsEngine==='edge'?speakEdge(text):speakBrowser(text);}
  function speakBrowser(text){if(!('speechSynthesis' in window))return;const utt=new SpeechSynthesisUtterance(text);const voice=getSelectedBrowserVoice();if(voice){utt.voice=voice;utt.lang=voice.lang;localStorage.setItem('lenguaviva-voice',voice.voiceURI);}else{utt.lang='es-ES';}utt.rate=getRate();utt.volume=1;utt.onstart=()=>{isPlaying=true;updatePlayBtn();};utt.onend=()=>{isPlaying=false;currentUtterance=null;updatePlayBtn();};utt.onerror=()=>{isPlaying=false;currentUtterance=null;updatePlayBtn();};currentUtterance=utt;speechSynthesis.speak(utt);}
  async function speakEdge(text){isPlaying=true;updatePlayBtn();const statusEl=$('#ttsStatus');try{if(statusEl){statusEl.textContent='合成中…';statusEl.style.display='inline';}const voice=getSelectedEdgeVoice();localStorage.setItem('lenguaviva-edge-voice',voice);const ratePercent=Math.round((getRate()-1)*100);const{url}=await EdgeTTS.synthesize(text,voice,{rate:ratePercent});if(statusEl)statusEl.style.display='none';currentAudio=new Audio(url);currentAudio.onended=()=>{isPlaying=false;currentAudio=null;updatePlayBtn();};currentAudio.onerror=()=>{isPlaying=false;currentAudio=null;updatePlayBtn();};currentAudio.play();}catch(e){console.warn('Edge TTS error:',e);if(statusEl){statusEl.textContent='AI语音需 Edge 浏览器，已切换浏览器语音';setTimeout(()=>statusEl.style.display='none',4000);}isPlaying=false;updatePlayBtn();speakBrowser(text);}}
  function stopSpeaking(){speechSynthesis.cancel();if(currentAudio){currentAudio.pause();currentAudio=null;}isPlaying=false;currentUtterance=null;updatePlayBtn();}
  function updatePlayBtn(){const btn=$('#playAllBtn');if(!btn)return;const svg=btn.querySelector('svg');if(!svg)return;svg.innerHTML=isPlaying?'<rect x="6" y="6" width="12" height="12" fill="currentColor"/>':'<path d="M8 5v14l11-7z" fill="currentColor"/>';}
  function initTTSEngineSwitch(){const tabs=$$('.tts-engine-tab');tabs.forEach(tab=>{tab.addEventListener('click',()=>{ttsEngine=tab.dataset.engine;localStorage.setItem('lenguaviva-tts-engine',ttsEngine);tabs.forEach(t=>t.classList.toggle('active',t.dataset.engine===ttsEngine));const bb=$('#browserVoiceBlock'),eb=$('#edgeVoiceBlock');if(bb)bb.style.display=ttsEngine==='browser'?'contents':'none';if(eb)eb.style.display=ttsEngine==='edge'?'contents':'none';});if(tab.dataset.engine===ttsEngine)tab.classList.add('active');});const bb=$('#browserVoiceBlock'),eb=$('#edgeVoiceBlock');if(bb)bb.style.display=ttsEngine==='browser'?'contents':'none';if(eb)eb.style.display=ttsEngine==='edge'?'contents':'none';}

  const POS_CSS = { Noun:'noun',Verb:'verb',Adjective:'adj',Adverb:'adv',Determiner:'det',Preposition:'prep',Conjunction:'conj',Pronoun:'pron',Number:'num',Punctuation:'punct',Other:'other' };

  /**
   * Analyze a sentence: use spaCy roles/clauses when available, else fall back to client rules.
   * Grammar notes and pattern matching always run on the client side.
   */
  function analyzeWithSpacyFallback(tokens, spacySentences, lineIdx) {
    // Always run client-side analysis for notes, patterns, and as fallback
    const clientAnalysis = analyzeSentence(tokens);

    if (!spacySentences || !spacySentences[lineIdx]) {
      return clientAnalysis;
    }

    const spacySent = spacySentences[lineIdx];
    const spacyTokens = spacySent.tokens;
    const spacyClauses = spacySent.clauses;

    // Override roles from spaCy
    for (let i = 0; i < clientAnalysis.tokens.length; i++) {
      const ct = clientAnalysis.tokens[i];
      const st = tokens[i]?._spacy;
      if (!st) continue;

      // Use spaCy role instead of client-side heuristic
      if (st.role) ct.role = st.role;
      if (st.dep) ct.dep = st.dep;
      if (st.cliticType) ct.cliticType = st.cliticType;
      if (st.morph) ct.morph = st.morph;
      if (st.clauseId !== undefined) ct.clauseId = st.clauseId;
      if (st.clauseType) ct.clauseType = st.clauseType;
      if (st.isClauseConnector) ct.isClauseConnector = true;
      if (st.posUD) ct.posUD = st.posUD;

      // Keep client-side notes (reflexive, clitic, etc.) — they're educational
    }

    // Use spaCy clause structure if available
    if (spacyClauses && spacyClauses.length > 0) {
      clientAnalysis.clauses = spacyClauses;
    }

    return clientAnalysis;
  }

  // ── Render ──
  function renderResults(data) {
    const content = $('#resultContent');
    if (!content) return;
    content.innerHTML = '';

    if (!data.lines.length) {
      content.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><p>在上方输入西班牙语文本，点击 <strong>分析</strong> 开始</p></div>`;
      return;
    }

    // Engine indicator
    const engineBadge = document.createElement('div');
    engineBadge.className = 'engine-badge';
    if (data._spacySentences) {
      engineBadge.innerHTML = '<span class="engine-ok">✓ spaCy 神经网络分析</span>';
    } else {
      engineBadge.innerHTML = '<span class="engine-fallback">⚠ 客户端规则分析（spaCy 服务未连接）</span>';
    }
    content.appendChild(engineBadge);

    // CEFR distribution for the whole text
    const allLemmas = data.lines.flat().filter(t=>t.pos!=='Punctuation').map(t=>(t.lemma||t.surface).toLowerCase());
    const dist = window.CEFR.distribution(allLemmas);
    renderCefrBar(content, dist);

    // Vocab book review reminder
    renderVocabReminder(content);

    data.lines.forEach((tokens, lineIdx) => {
      const analysis = analyzeWithSpacyFallback(tokens, data._spacySentences, lineIdx);
      const lineDiv = document.createElement('div');
      lineDiv.className = 'line-container';

      // Clause structure summary (shown above tokens)
      const subClauses = analysis.clauses.filter(c => c.type !== 'main');
      if (subClauses.length > 0) {
        const clauseStructure = document.createElement('div');
        clauseStructure.className = 'clause-structure';

        // Build a tree: main clause → sub clauses
        const treeHtml = buildClauseTree(analysis.clauses);
        clauseStructure.innerHTML = treeHtml;
        lineDiv.appendChild(clauseStructure);
      }

      // Token row — now with clause wrappers
      const tokenRow = document.createElement('div');
      tokenRow.className = 'line-tokens';
      const linePlayBtn = document.createElement('button');
      linePlayBtn.className = 'btn-icon line-play-btn';
      linePlayBtn.title = '朗读本行';
      linePlayBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
      linePlayBtn.addEventListener('click', () => speakText(tokens.map(t => t.surface).join(' ')));
      tokenRow.appendChild(linePlayBtn);

      // Group tokens by clause for wrapping
      let currentTarget = tokenRow;
      let activeClauseWrapper = null;
      let activeClauseId = 0;

      analysis.tokens.forEach((token, ti) => {
        // Handle clause wrapping
        if (token.clauseId !== activeClauseId) {
          if (token.clauseId > 0) {
            // Entering a sub-clause — create wrapper
            const clauseData = analysis.clauses.find(c => c.id === token.clauseId);
            if (clauseData) {
              const wrapper = document.createElement('span');
              wrapper.className = 'clause-wrapper';
              const color = CLAUSE_TYPE_COLORS[clauseData.type] || 'var(--text-muted)';
              wrapper.style.setProperty('--clause-color', color);
              wrapper.dataset.clauseId = token.clauseId;
              wrapper.dataset.clauseType = clauseData.type;

              // Connector label at top of wrapper
              if (token.isClauseConnector) {
                const tag = document.createElement('span');
                tag.className = 'clause-inline-tag';
                tag.style.color = color;
                tag.style.borderColor = color;
                tag.textContent = `${CLAUSE_TYPE_ZH[clauseData.type] || clauseData.type}`;
                wrapper.appendChild(tag);
              }

              tokenRow.appendChild(wrapper);
              currentTarget = wrapper;
              activeClauseWrapper = wrapper;
              activeClauseId = token.clauseId;
            }
          } else {
            // Returning to main clause
            currentTarget = tokenRow;
            activeClauseWrapper = null;
            activeClauseId = 0;
          }
        }

        // Add connector label if entering a new clause at this token and it wasn't added yet
        if (token.isClauseConnector && activeClauseWrapper && !activeClauseWrapper.querySelector('.clause-inline-tag')) {
          const clauseData = analysis.clauses.find(c => c.id === token.clauseId);
          if (clauseData) {
            const color = CLAUSE_TYPE_COLORS[clauseData.type] || 'var(--text-muted)';
            const tag = document.createElement('span');
            tag.className = 'clause-inline-tag';
            tag.style.color = color;
            tag.style.borderColor = color;
            tag.textContent = `${CLAUSE_TYPE_ZH[clauseData.type] || clauseData.type}`;
            activeClauseWrapper.insertBefore(tag, activeClauseWrapper.firstChild);
          }
        }

        if (token.pos === 'Punctuation') {
          const span = document.createElement('span');
          span.className = 'token-pill';
          span.dataset.pos = 'Punctuation';
          span.innerHTML = `<span class="token-surface">${esc(token.surface)}</span>`;
          currentTarget.appendChild(span);
          return;
        }
        const pill = document.createElement('div');
        pill.className = 'token-pill';
        pill.dataset.pos = token.pos;

        if (token.isClauseConnector) pill.classList.add('clause-connector');

        let html = `<span class="token-surface">${esc(token.surface)}</span>`;

        // CEFR dot
        const cefrLevel = window.CEFR.getLevel((token.lemma || token.surface).toLowerCase());
        const cefrColor = window.CEFR.LEVEL_COLORS[cefrLevel];
        html += `<span class="cefr-dot" style="background:${cefrColor}" title="${cefrLevel === 'unknown' ? '未收录' : cefrLevel}"></span>`;

        // Word translation
        const wordZh = translateWord(token.surface);
        if (wordZh) html += `<span class="token-zh">${esc(wordZh)}</span>`;

        // Conjugation info for verbs
        if (token.pos === 'Verb' && window.Conjugation) {
          const conjInfo = window.Conjugation.identify(token.surface, token.lemma || token.surface);
          if (conjInfo) {
            const label = window.Conjugation.shortLabel(conjInfo);
            html += `<span class="token-conj">${esc(label)}</span>`;
          }
        }

        // Syllable stress
        if (window.Syllable && token.surface.length > 2) {
          const stressInfo = window.Syllable.formatStress(token.surface);
          html += `<span class="token-syllable">${esc(stressInfo)}</span>`;
        }

        if (token.lemma && token.lemma !== token.surface.toLowerCase()) {
          html += `<span class="token-lemma">${esc(token.lemma)}</span>`;
        }
        const css = POS_CSS[token.pos] || 'other';
        html += `<span class="token-pos-tag pos-bg-${css}">${SpanishSegmenter.posLabel(token.pos)}</span>`;
        pill.innerHTML = html;
        pill.addEventListener('click', () => showTokenDetail(pill, token));
        pill.addEventListener('dblclick', () => speakText(token.surface));
        currentTarget.appendChild(pill);
      });
      lineDiv.appendChild(tokenRow);

      // Role bar
      const roleBar = document.createElement('div');
      roleBar.className = 'role-bar';
      renderRoleBar(roleBar, analysis.tokens);
      lineDiv.appendChild(roleBar);

      // Sentence translation
      const transRow = document.createElement('div');
      transRow.className = 'sentence-translation';
      transRow.innerHTML = '<span class="trans-loading">翻译中…</span>';
      lineDiv.appendChild(transRow);
      const sentText = tokens.map(t => t.surface).join(' ');
      loadSentenceTranslation(transRow, sentText, roleBar);

      // Clitic pronoun analysis + SVO annotation
      if (window.WordOrder) {
        const clitics = window.WordOrder.analyzeClitics(analysis.tokens);
        if (clitics.length > 0) {
          const cliticDiv = document.createElement('div');
          cliticDiv.className = 'clitic-section';
          let cHtml = '<div class="clitic-title">代词结构解析</div>';
          clitics.forEach(c => {
            const typeLabels = { direct:'直宾代词', indirect:'间宾代词', reflexive:'反身代词', unknown:'代词' };
            const typeColors = { direct:'var(--role-obj)', indirect:'var(--role-iobj)', reflexive:'var(--role-refl)', unknown:'var(--text-muted)' };
            const typeLabel = typeLabels[c.cliticType] || '代词';
            const typeColor = typeColors[c.cliticType] || 'var(--text-muted)';
            cHtml += `<div class="clitic-card">`;
            cHtml += `<div class="clitic-header"><span class="clitic-type-badge" style="background:${typeColor}">${esc(typeLabel)}</span><span class="clitic-pronoun">${esc(c.pronoun)}</span><span class="clitic-func">${esc(c.functionZh)}</span></div>`;
            cHtml += `<div class="clitic-compare">`;
            cHtml += `<div class="clitic-row"><span class="clitic-lang">西</span><span class="clitic-structure">${esc(c.esStructure)}</span></div>`;
            cHtml += `<div class="clitic-arrow">↕</div>`;
            cHtml += `<div class="clitic-row"><span class="clitic-lang">中</span><span class="clitic-structure">${esc(c.zhStructure)}</span></div>`;
            cHtml += `</div>`;
            cHtml += `<div class="clitic-rule">${esc(c.rule)}</div>`;
            cHtml += `</div>`;
          });
          cliticDiv.innerHTML = cHtml;
          lineDiv.appendChild(cliticDiv);
        }

        // SVO order annotation
        const svoParts = window.WordOrder.buildSvoAnnotation(analysis.tokens);
        if (svoParts.length > 0) {
          const svoDiv = document.createElement('div');
          svoDiv.className = 'svo-section';
          let sHtml = '<div class="svo-label">语序</div><div class="svo-chips">';
          svoParts.forEach(p => {
            const rl = ROLE_LABELS[p.role];
            const color = rl ? `var(--role-${p.role === 'prep_ph' ? 'prep' : p.role})` : 'var(--text-muted)';
            sHtml += `<span class="svo-chip" style="--sc:${color}"><span class="svo-num">${p.num}</span><span class="svo-abbr">${esc(p.abbr)}</span><span class="svo-text">${esc(p.text)}</span></span>`;
          });
          sHtml += '</div>';
          svoDiv.innerHTML = sHtml;
          lineDiv.appendChild(svoDiv);
        }
      }

      // Sentence patterns
      if (analysis.matchedPatterns.length > 0) {
        const patDiv = document.createElement('div');
        patDiv.className = 'patterns-section';
        analysis.matchedPatterns.forEach(p => {
          const card = document.createElement('div');
          card.className = 'pattern-card';
          card.innerHTML = `<span class="pattern-name">${esc(p.name)}</span><span class="pattern-skeleton">${esc(p.skeleton)}</span><span class="pattern-zh">${esc(p.zh)}</span>`;
          patDiv.appendChild(card);
        });
        lineDiv.appendChild(patDiv);
      }

      // Grammar notes
      if (analysis.sentenceNotes.length > 0) {
        const notesDiv = document.createElement('div');
        notesDiv.className = 'grammar-notes';
        const seen = new Set();
        analysis.sentenceNotes.forEach(sn => {
          if (seen.has(sn.type + sn.context)) return;
          seen.add(sn.type + sn.context);
          const note = document.createElement('div');
          note.className = 'grammar-note';
          const explain = sn.note.explain(sn.context);
          note.innerHTML = `<span class="grammar-note-icon">${sn.note.icon}</span><div class="grammar-note-body"><div class="grammar-note-title">${esc(sn.note.title)}</div><div class="grammar-note-text">${esc(explain)}</div></div>`;
          notesDiv.appendChild(note);
        });
        lineDiv.appendChild(notesDiv);
      }

      content.appendChild(lineDiv);
    });
    applyDisplayToggles();
  }

  // ── Clause tree builder ──
  function buildClauseTree(clauses) {
    const main = clauses.find(c => c.type === 'main');
    const subs = clauses.filter(c => c.type !== 'main');
    if (subs.length === 0) return '';

    let html = '<div class="clause-tree">';
    html += '<div class="clause-tree-title">从句结构</div>';
    html += '<div class="clause-tree-nodes">';

    // Main clause node
    const mainColor = CLAUSE_TYPE_COLORS['main'] || 'var(--role-pred)';
    html += `<span class="clause-node" style="--nc:${mainColor}">`;
    html += `<span class="clause-node-label">主句</span>`;

    // Sub-clause children
    subs.forEach(c => {
      const color = CLAUSE_TYPE_COLORS[c.type] || 'var(--text-muted)';
      const typeZh = CLAUSE_TYPE_ZH[c.type] || c.type;
      html += `<span class="clause-branch">`;
      html += `<span class="clause-branch-line" style="background:${color}"></span>`;
      html += `<span class="clause-node clause-node-sub" style="--nc:${color}">`;
      html += `<span class="clause-node-connector">${esc(c.connector)}</span>`;
      html += `<span class="clause-node-label">${esc(typeZh)}</span>`;
      html += `</span></span>`;
    });

    html += '</span></div></div>';
    return html;
  }

  // ── CEFR distribution bar ──
  function renderCefrBar(container, dist) {
    const bar = document.createElement('div');
    bar.className = 'cefr-bar';
    const total = dist.total || 1;
    ['A1','A2','B1','B2','unknown'].forEach(lv => {
      const count = dist[lv] || 0;
      if (count === 0) return;
      const pct = Math.round(count / total * 100);
      const seg = document.createElement('span');
      seg.className = 'cefr-seg';
      seg.style.background = window.CEFR.LEVEL_COLORS[lv];
      seg.style.width = `${pct}%`;
      seg.title = `${lv === 'unknown' ? '未收录' : lv}: ${count}词 (${pct}%)`;
      seg.textContent = pct > 8 ? `${lv === 'unknown' ? '?' : lv} ${pct}%` : '';
      bar.appendChild(seg);
    });
    const label = document.createElement('div');
    label.className = 'cefr-label';
    label.textContent = `整体难度: ${dist.avgLevel} (${window.CEFR.LEVEL_ZH[dist.avgLevel]})`;
    const wrapper = document.createElement('div');
    wrapper.className = 'cefr-section';
    wrapper.appendChild(label);
    wrapper.appendChild(bar);
    container.appendChild(wrapper);
  }

  // ── Vocab book review reminder ──
  function renderVocabReminder(container) {
    const st = window.VocabBook.stats();
    if (st.total === 0) return;
    const reminder = document.createElement('div');
    reminder.className = 'vocab-reminder';
    reminder.innerHTML = `<span>生词本: ${st.total}词 (${st.dueCount}词待复习)</span><button class="btn-ghost btn-sm" id="openVocabBtn">打开生词本</button>`;
    container.appendChild(reminder);
    setTimeout(() => {
      $('#openVocabBtn')?.addEventListener('click', openVocabPanel);
    }, 0);
  }

  // ── Vocab book panel ──
  function openVocabPanel() {
    let panel = $('#vocabPanel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.id = 'vocabPanel';
    panel.className = 'vocab-panel';
    renderVocabContent(panel);
    document.body.appendChild(panel);
  }

  function renderVocabContent(panel) {
    const all = window.VocabBook.getAll();
    const due = window.VocabBook.getDueWords();
    let html = '<div class="vocab-header"><h3>生词本</h3><button class="btn-icon" onclick="document.getElementById(\'vocabPanel\').remove()">✕</button></div>';
    if (due.length > 0) {
      html += '<div class="vocab-due-title">待复习</div>';
      due.forEach(e => {
        html += `<div class="vocab-card" data-lemma="${esc(e.lemma)}">
          <div class="vocab-word">${esc(e.word)} <span class="vocab-pos">${esc(e.pos||'')}</span></div>
          <div class="vocab-zh">${esc(e.zh)}</div>
          <div class="vocab-actions">
            <button class="btn-sm" onclick="VocabBook.review('${esc(e.lemma)}','forgot');document.getElementById('vocabPanel')&&renderVocabContent(document.getElementById('vocabPanel'))">忘了</button>
            <button class="btn-sm" onclick="VocabBook.review('${esc(e.lemma)}','hard');document.getElementById('vocabPanel')&&renderVocabContent(document.getElementById('vocabPanel'))">模糊</button>
            <button class="btn-sm" onclick="VocabBook.review('${esc(e.lemma)}','easy');document.getElementById('vocabPanel')&&renderVocabContent(document.getElementById('vocabPanel'))">记住了</button>
          </div>
        </div>`;
      });
    }
    html += '<div class="vocab-all-title">全部词汇</div>';
    all.forEach(e => {
      const statusColor = window.VocabBook.STATUS_COLOR[e.status];
      const statusZh = window.VocabBook.STATUS_ZH[e.status];
      html += `<div class="vocab-item"><span class="vocab-status" style="color:${statusColor}">${statusZh}</span> <strong>${esc(e.word)}</strong> ${esc(e.zh)} <button class="btn-sm btn-danger" onclick="VocabBook.removeWord('${esc(e.lemma)}');document.getElementById('vocabPanel')&&renderVocabContent(document.getElementById('vocabPanel'))">删除</button></div>`;
    });
    if (all.length === 0) html += '<div class="vocab-empty">暂无生词</div>';
    panel.innerHTML = html;
  }

  // ── Sentence translation (unchanged) ──
  async function loadSentenceTranslation(container, sentText, roleBar) {
    try {
      const result = await translateSentence(sentText);
      if (!result || !result.text) { container.innerHTML = '<span class="trans-fail">翻译暂不可用</span>'; return; }
      const groups = [];
      roleBar.querySelectorAll('.role-group').forEach(g => { groups.push({ role: g.dataset.role, words: g.querySelector('.role-word')?.textContent || '' }); });
      let html = `<div class="trans-full"><span class="trans-label">整句</span><span class="trans-text">${esc(result.text)}</span></div>`;
      if (groups.length > 0) {
        const aligned = await translateComponents(groups);
        html += '<div class="trans-aligned">';
        aligned.forEach(g => {
          if (!g.words) return;
          const rl = ROLE_LABELS[g.role];
          const color = rl ? `var(--role-${g.role === 'prep_ph' ? 'prep' : g.role})` : 'var(--text-muted)';
          const label = rl ? rl.abbr : '';
          html += `<span class="trans-comp" style="border-color:${color}"><span class="trans-comp-es">${esc(g.words)}</span><span class="trans-comp-arrow">→</span><span class="trans-comp-zh">${esc(g.zh||'…')}</span>`;
          if (label) html += `<span class="trans-comp-role" style="color:${color}">${label}</span>`;
          html += `</span>`;
        });
        html += '</div>';
      }
      container.innerHTML = html;
    } catch (e) { console.warn('Translation error:', e); container.innerHTML = '<span class="trans-fail">翻译出错</span>'; }
  }

  function renderRoleBar(container, tokens) {
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.role === Role.PUNCT || !t.role) { i++; continue; }
      const role = t.role;
      const rl = ROLE_LABELS[role];
      if (!rl) { i++; continue; }
      const words = [t.surface];
      let j = i + 1;
      while (j < tokens.length) {
        const next = tokens[j];
        if (next.role === Role.PUNCT) { j++; continue; }
        if (next.role === role) { words.push(next.surface); j++; }
        else if ([Role.SUBJ,Role.OBJ,Role.COMP].includes(role) && [Role.DET,Role.MOD].includes(next.role)) { words.push(next.surface); j++; }
        else if (role === Role.PRED && next.role === Role.AUX) { words.push(next.surface); j++; }
        else if (role === Role.AUX && next.role === Role.PRED) { words.push(next.surface); j++; }
        else break;
      }
      if (role === Role.DET && j < tokens.length) {
        const next = tokens[j];
        if (next && [Role.SUBJ,Role.OBJ,Role.COMP].includes(next.role)) { i = j; continue; }
      }
      const group = document.createElement('span');
      group.className = 'role-group'; group.dataset.role = role;
      const label = document.createElement('span');
      label.className = 'role-label'; label.dataset.role = role; label.textContent = rl.abbr;
      group.appendChild(label);
      const wordSpan = document.createElement('span');
      wordSpan.className = 'role-word'; wordSpan.textContent = words.join(' ');
      group.appendChild(wordSpan);
      container.appendChild(group);
      i = j;
    }
  }

  // ── Token detail popup (enhanced with all new data) ──
  function showTokenDetail(pillEl, token) {
    closePopup();
    const rect = pillEl.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'token-detail-popup';
    popup.id = 'tokenPopup';
    const roleLbl = token.role ? (ROLE_LABELS[token.role]?.zh || '') : '';
    const wordZh = translateWord(token.surface);
    const cefrLv = window.CEFR.getLevel((token.lemma||token.surface).toLowerCase());
    const cefrStr = cefrLv === 'unknown' ? '未收录' : `${cefrLv} (${window.CEFR.LEVEL_ZH[cefrLv]})`;

    const rows = [
      ['原词', token.surface],
      wordZh ? ['中文', wordZh] : null,
      token.lemma !== token.surface.toLowerCase() ? ['词元', token.lemma] : null,
      ['词性', SpanishSegmenter.posLabel(token.pos) + ' / ' + SpanishSegmenter.posLabelEs(token.pos)],
      ['CEFR', cefrStr],
      roleLbl ? ['句法成分', roleLbl] : null,
    ].filter(Boolean);

    // Conjugation
    if (token.pos === 'Verb' && window.Conjugation) {
      const ci = window.Conjugation.identify(token.surface, token.lemma || token.surface);
      if (ci) rows.push(['变位', `${ci.tenseZh} · ${ci.personZh || ''} · ${ci.moodZh}${ci.regular ? '' : ' (不规则)'}`]);
    }

    // Morphology
    if (window.Morphology) {
      const morph = window.Morphology.analyze(token.surface, token.lemma, token.pos);
      if (morph) {
        const parts = morph.parts.map(p => `[${p.form}]${p.zh ? '('+p.zh+')' : ''}`).join(' + ');
        rows.push(['构词', parts]);
      }
      const gn = window.Morphology.genderNumber(token.surface, token.pos);
      if (gn && gn.gender !== '—') rows.push(['性数', `${gn.gender} · ${gn.number}`]);
    }

    // Syllable & stress
    if (window.Syllable && token.surface.length > 2) {
      const si = window.Syllable.analyzeStress(token.surface);
      rows.push(['音节', si.syllables.join(' · ')]);
      rows.push(['重音', si.rule]);
    }

    // Clitic pronoun detail
    const cliticLower = token.surface.toLowerCase();
    if (window.WordOrder && window.WordOrder.CLITIC_INFO && window.WordOrder.CLITIC_INFO[cliticLower]) {
      const ci = window.WordOrder.CLITIC_INFO[cliticLower];
      const possibleFunctions = Object.entries(ci.forms).filter(([,v]) => v).map(([,v]) => v);
      if (possibleFunctions.length) rows.push(['代词功能', possibleFunctions.join(' / ')]);
    }

    // Clause
    if (token.clauseType && token.clauseType !== 'main') {
      rows.push(['从句', CLAUSE_TYPE_ZH[token.clauseType] || token.clauseType]);
    }

    if (token.rawTags?.length) rows.push(['标签', token.rawTags.join(', ')]);

    popup.innerHTML = rows.map(([l, v]) => `<div class="detail-row"><span class="detail-label">${l}</span><span class="detail-value">${esc(v)}</span></div>`).join('');

    // Examples & collocations
    const examples = getExamples(token.lemma || token.surface);
    if (examples) {
      let exHtml = '';
      if (examples.ex?.length) {
        exHtml += '<div class="detail-section-title">例句</div>';
        examples.ex.forEach(e => { exHtml += `<div class="detail-example">${esc(e)}</div>`; });
      }
      if (examples.col?.length) {
        exHtml += '<div class="detail-section-title">常见搭配</div>';
        examples.col.forEach(c => { exHtml += `<div class="detail-collocation">${esc(c)}</div>`; });
      }
      popup.innerHTML += exHtml;
    }

    // Vocab book button
    const lemmaKey = (token.lemma || token.surface).toLowerCase();
    const isSaved = window.VocabBook.hasWord(lemmaKey);
    const vocabBtn = document.createElement('button');
    vocabBtn.className = `btn-sm vocab-save-btn ${isSaved ? 'saved' : ''}`;
    vocabBtn.textContent = isSaved ? '已收藏' : '收藏到生词本';
    vocabBtn.addEventListener('click', () => {
      if (isSaved) {
        window.VocabBook.removeWord(lemmaKey);
        vocabBtn.textContent = '收藏到生词本';
        vocabBtn.classList.remove('saved');
      } else {
        window.VocabBook.addWord(token.surface, token.lemma || token.surface, token.pos, wordZh || '');
        vocabBtn.textContent = '已收藏';
        vocabBtn.classList.add('saved');
      }
    });
    popup.appendChild(vocabBtn);

    document.body.appendChild(popup);
    const pr = popup.getBoundingClientRect();
    let top = rect.bottom + 8, left = rect.left;
    if (top + pr.height > innerHeight) top = rect.top - pr.height - 8;
    if (left + pr.width > innerWidth) left = innerWidth - pr.width - 12;
    popup.style.top = `${Math.max(4, top)}px`;
    popup.style.left = `${Math.max(4, left)}px`;
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(e) { const p = $('#tokenPopup'); if (p && !p.contains(e.target)) closePopup(); }
  function closePopup() { const p = $('#tokenPopup'); if (p) p.remove(); document.removeEventListener('click', onDocClick); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function applyDisplayToggles() {
    const c = $('#resultContent');
    if (!c) return;
    c.classList.toggle('hide-lemma', !displayState.showLemma);
    c.classList.toggle('hide-pos', !displayState.showPos);
    c.classList.toggle('hide-underline', !displayState.showUnderline);
    c.classList.toggle('hide-roles', !displayState.showRoles);
    c.classList.toggle('hide-notes', !displayState.showNotes);
    c.classList.toggle('hide-translation', !displayState.showTranslation);
    c.classList.toggle('hide-conjugation', !displayState.showConjugation);
    c.classList.toggle('hide-syllable', !displayState.showSyllable);
    c.classList.toggle('hide-clauses', !displayState.showClauses);
    c.classList.toggle('hide-patterns', !displayState.showPatterns);
    c.classList.toggle('hide-wordorder', !displayState.showWordOrder);
    c.classList.toggle('hide-cefr', !displayState.showCefr);
  }
  function initToggles() {
    $$('.toggle-chip').forEach(chip => {
      const key = chip.dataset.toggle;
      if (key && displayState[key] !== undefined) {
        if (displayState[key]) chip.classList.add('active');
        chip.addEventListener('click', () => { displayState[key] = !displayState[key]; chip.classList.toggle('active'); applyDisplayToggles(); });
      }
    });
  }

  const SPACY_API = 'http://localhost:5001/api/parse';

  async function callSpacyApi(text) {
    const resp = await fetch(SPACY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) throw new Error(`spaCy API ${resp.status}`);
    return resp.json();
  }

  async function analyzeText() {
    const textarea = $('#textInput');
    const text = textarea?.value?.trim();
    if (!text) return;
    const btn = $('#analyzeBtn');
    if (btn) { btn.disabled = true; btn.textContent = '分析中…'; }
    try {
      // Try spaCy backend first
      let spacyData = null;
      try {
        spacyData = await callSpacyApi(text);
      } catch (e) {
        console.warn('spaCy API unavailable, falling back to client-side:', e.message);
      }

      const clientResult = await segmenter.segment(text);

      if (spacyData && spacyData.sentences) {
        // Merge spaCy analysis into client result
        const merged = mergeSpacyData(clientResult, spacyData);
        renderResults(merged);
      } else {
        renderResults(clientResult);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      const c = $('#resultContent');
      if (c) c.innerHTML = `<div class="empty-state"><p style="color:var(--pos-prep)">错误: ${esc(err.message)}</p></div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '分析'; }
    }
  }

  /**
   * Merge spaCy backend results into the client-side segmenter output.
   * spaCy provides: role (dep-based), clauseId, clauseType, cliticType, dep, morph
   * Client provides: surface, lemma, pos, rawTags (from es-compromise)
   */
  function mergeSpacyData(clientResult, spacyData) {
    const merged = { lines: [] };
    const spacySents = spacyData.sentences;

    for (let si = 0; si < spacySents.length; si++) {
      const spacySent = spacySents[si];
      const clientTokens = clientResult.lines[si];

      if (!clientTokens) {
        // spaCy found more sentences than client; create tokens from spaCy data
        merged.lines.push(spacySent.tokens.map(st => ({
          surface: st.surface,
          lemma: st.lemma,
          pos: st.pos,
          rawTags: [],
          _spacy: st,
        })));
        continue;
      }

      // Align by matching surfaces
      const aligned = alignTokens(clientTokens, spacySent.tokens);
      merged.lines.push(aligned);
    }

    // If client has more lines, keep them as-is
    for (let si = spacySents.length; si < clientResult.lines.length; si++) {
      merged.lines.push(clientResult.lines[si]);
    }

    // Attach spaCy sentence-level data (clauses)
    merged._spacySentences = spacySents;

    return merged;
  }

  function alignTokens(clientTokens, spacyTokens) {
    const result = [];
    let ci = 0, si = 0;

    while (ci < clientTokens.length && si < spacyTokens.length) {
      const ct = clientTokens[ci];
      const st = spacyTokens[si];

      if (ct.surface === st.surface) {
        result.push({ ...ct, _spacy: st });
        ci++; si++;
      } else if (ct.surface.length < st.surface.length) {
        // Client token is shorter — might be part of a spaCy multi-token
        result.push({ ...ct, _spacy: st });
        ci++;
      } else {
        // spaCy token is shorter — skip forward in spaCy
        result.push({ ...ct, _spacy: st });
        ci++; si++;
      }
    }

    while (ci < clientTokens.length) {
      result.push(clientTokens[ci++]);
    }

    return result;
  }

  function updateCharCount() {
    const el = $('#charCount'), ta = $('#textInput');
    if (el && ta) el.textContent = `${ta.value.length} 字`;
  }

  async function init() {
    initTheme(); updateThemeIcon();
    try { await segmenter.init(); } catch (e) { console.error('Segmenter init failed:', e); }
    populateBrowserVoices();
    speechSynthesis.onvoiceschanged = populateBrowserVoices;
    populateEdgeVoices();
    initTTSEngineSwitch();
    const sr = $('#speedRange'), sv = $('#speedValue');
    if (sr && sv) sr.addEventListener('input', () => { sv.textContent = `${parseFloat(sr.value).toFixed(1)}x`; });
    $('#analyzeBtn')?.addEventListener('click', analyzeText);
    $('#textInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); analyzeText(); } });
    $('#textInput')?.addEventListener('input', updateCharCount);
    updateCharCount();
    $('#themeToggle')?.addEventListener('click', toggleTheme);
    $('#playAllBtn')?.addEventListener('click', () => { if (isPlaying) { stopSpeaking(); return; } const ta = $('#textInput'); if (ta?.value?.trim()) speakText(ta.value.trim()); });
    initToggles();
    const ta = $('#textInput');
    if (ta && !ta.value) {
      ta.value = 'El español es una lengua románica que se habla en muchos países.\nMaría se lava las manos con agua fría.\nA mí me gusta mucho el café por la mañana.\nEstoy estudiando para el examen de gramática.';
      updateCharCount();
    }
    // Expose renderVocabContent globally for inline onclick handlers
    window.renderVocabContent = renderVocabContent;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
