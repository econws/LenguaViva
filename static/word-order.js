/**
 * word-order.js — Clitic pronoun analysis + SVO order annotation
 * Focuses on pronoun+verb structures that differ most from Chinese.
 */
(function () {
  'use strict';

  const { Role, ROLE_LABELS } = window.SpanishGrammar;
  const { translateWord } = window.Translator;

  // ── Pronoun knowledge base ──
  const CLITIC_INFO = {
    me:  { person:'1s', zh:'我',     forms:{ direct:'我（直宾）', indirect:'给我（间宾）', reflexive:'自己（反身）' } },
    te:  { person:'2s', zh:'你',     forms:{ direct:'你（直宾）', indirect:'给你（间宾）', reflexive:'自己（反身）' } },
    lo:  { person:'3sm',zh:'他/它',  forms:{ direct:'他/它（直宾·阳）', indirect:null, reflexive:null } },
    la:  { person:'3sf',zh:'她/它',  forms:{ direct:'她/它（直宾·阴）', indirect:null, reflexive:null } },
    le:  { person:'3s', zh:'他/她',  forms:{ direct:null, indirect:'给他/给她（间宾）', reflexive:null } },
    nos: { person:'1p', zh:'我们',   forms:{ direct:'我们（直宾）', indirect:'给我们（间宾）', reflexive:'我们自己（反身）' } },
    os:  { person:'2p', zh:'你们',   forms:{ direct:'你们（直宾）', indirect:'给你们（间宾）', reflexive:'你们自己（反身）' } },
    los: { person:'3pm',zh:'他们/它们', forms:{ direct:'他们/它们（直宾·阳）', indirect:null, reflexive:null } },
    las: { person:'3pf',zh:'她们/它们', forms:{ direct:'她们/它们（直宾·阴）', indirect:null, reflexive:null } },
    les: { person:'3p', zh:'他们/她们', forms:{ direct:null, indirect:'给他们/她们（间宾）', reflexive:null } },
    se:  { person:'3',  zh:'自己/互相', forms:{ direct:null, indirect:null, reflexive:'自己/互相（反身/被动）' } },
  };

  const ALL_CLITICS = new Set(Object.keys(CLITIC_INFO));
  const DIRECT_ONLY = new Set(['lo','la','los','las']);
  const INDIRECT_ONLY = new Set(['le','les']);
  const REFLEXIVE_ONLY = new Set(['se']);
  const AMBIGUOUS = new Set(['me','te','nos','os']);

  /**
   * Check if token at idx is acting as a clitic pronoun (not a determiner/article).
   * lo/la/los/las before a noun are articles, not clitics.
   */
  function isActualClitic(tokens, idx) {
    const lower = (tokens[idx].surface || '').toLowerCase();
    // Only lo/la/los/las are ambiguous between article and clitic
    if (!DIRECT_ONLY.has(lower)) return true;
    // If grammar engine already tagged it as determiner, skip
    if (tokens[idx].pos === 'Determiner') return false;
    // Check if next non-punct token is a noun or adjective → article
    for (let j = idx + 1; j < tokens.length; j++) {
      if (tokens[j].pos === 'Punctuation') continue;
      if (tokens[j].pos === 'Noun' || tokens[j].pos === 'Adjective') return false;
      break;
    }
    return true;
  }

  /**
   * Collect indices of true clitic pronouns in the sentence.
   */
  function collectCliticIndices(tokens) {
    const indices = new Set();
    for (let i = 0; i < tokens.length; i++) {
      const lower = (tokens[i].surface || '').toLowerCase();
      if (ALL_CLITICS.has(lower) && isActualClitic(tokens, i)) {
        if (findNearbyVerb(tokens, i)) indices.add(i);
      }
    }
    return indices;
  }

  /**
   * Analyze clitic pronoun structures in a token list.
   * Returns array of clitic groups: { pronoun, verb, type, explanation, zhOrder }
   */
  function analyzeClitics(tokens) {
    const results = [];
    const cliticIndices = collectCliticIndices(tokens);

    for (const i of cliticIndices) {
      const lower = (tokens[i].surface || '').toLowerCase();
      const info = CLITIC_INFO[lower];
      const verb = findNearbyVerb(tokens, i);
      if (!verb) continue;

      let cliticType = 'unknown';
      let functionZh = '';

      if (DIRECT_ONLY.has(lower)) {
        cliticType = 'direct';
        functionZh = info.forms.direct;
      } else if (INDIRECT_ONLY.has(lower)) {
        cliticType = 'indirect';
        functionZh = info.forms.indirect;
      } else if (REFLEXIVE_ONLY.has(lower)) {
        // "se" — check if another true clitic exists in the same sentence
        const hasOtherClitic = [...cliticIndices].some(j => j !== i);
        if (hasOtherClitic) {
          cliticType = 'indirect';
          functionZh = '给他/给她（间宾·se替代le）';
        } else {
          cliticType = 'reflexive';
          functionZh = info.forms.reflexive;
        }
      } else if (AMBIGUOUS.has(lower)) {
        // me/te/nos/os — multiple heuristics for disambiguation
        const hasOtherClitic = [...cliticIndices].some(j => j !== i);
        const verbIdx = tokens.indexOf(verb);
        const hasNounObj = tokens.some((tok, j) =>
          j !== i && j > verbIdx && tok.pos === 'Noun'
        );
        if (hasOtherClitic || hasNounObj) {
          cliticType = 'indirect';
          functionZh = info.forms.indirect;
        } else if (verb.lemma && isReflexiveVerb(verb.lemma, tokens, i)) {
          cliticType = 'reflexive';
          functionZh = info.forms.reflexive;
        } else {
          cliticType = 'direct';
          functionZh = info.forms.direct;
        }
      }

      // Build explanation
      const verbSurface = verb.surface || '';
      const verbLemma = (verb.lemma || verbSurface).toLowerCase();
      const verbZh = translateWord(verbSurface) || translateWord(verbLemma) || verbSurface;

      let esStructure, zhStructure, rule;

      if (cliticType === 'direct') {
        esStructure = `${lower} + ${verbSurface}`;
        zhStructure = `${verbZh} + ${info.zh}`;
        rule = `西语直宾代词放在变位动词前 → 中文放在动词后: "${lower} ${verbSurface}" = "${verbZh}${info.zh}"`;
      } else if (cliticType === 'indirect') {
        esStructure = `${lower} + ${verbSurface}`;
        zhStructure = `给${info.zh} + ${verbZh}`;
        rule = `西语间宾代词放在变位动词前 → 中文"给某人"在动词前: "${lower} ${verbSurface}" = "给${info.zh}${verbZh}"`;
      } else if (cliticType === 'reflexive') {
        esStructure = `${lower} + ${verbSurface}`;
        zhStructure = `${verbZh} + 自己`;
        rule = `反身代词表示动作施于自身: "${lower} ${verbSurface}" = "${verbZh}自己"，如 lavarse = 洗自己`;
      }

      // Check for compound structures: lo + he/has/ha + past participle
      const nextToken = findNextNonPunct(tokens, tokens.indexOf(verb));
      let isCompound = false;
      if (nextToken && /^(ado|ido|to|cho|so|erto)$/i.test(lastSyllable(nextToken.surface))) {
        const haberForms = new Set(['he','has','ha','hemos','habéis','han']);
        if (haberForms.has(verbSurface.toLowerCase())) {
          isCompound = true;
          const partZh = translateWord(nextToken.surface) || translateWord((nextToken.lemma || '').toLowerCase()) || nextToken.surface;
          esStructure = `${lower} + ${verbSurface} + ${nextToken.surface}`;
          zhStructure = `已经 + ${partZh} + ${info.zh}`;
          rule = `完成时结构: 代词放在 haber 前 → "${lower} ${verbSurface} ${nextToken.surface}" = "已经${partZh}了${info.zh}"`;
        }
      }

      results.push({
        pronounIdx: i,
        pronoun: lower,
        pronounInfo: info,
        verb: verb,
        cliticType,
        functionZh,
        esStructure,
        zhStructure,
        rule,
        isCompound,
      });
    }

    return results;
  }

  /**
   * Build SVO order annotation for the sentence.
   */
  function buildSvoAnnotation(tokens) {
    const parts = [];
    let num = 1;
    const seen = new Set();

    const order = [Role.SUBJ, Role.PRED, Role.OBJ, Role.IOBJ, Role.COMP, Role.MOD, Role.PREP, Role.REFL, Role.AUX];
    for (const role of order) {
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].role === role && !seen.has(i) && tokens[i].pos !== 'Punctuation') {
          const rl = ROLE_LABELS[role];
          if (!rl || !rl.abbr) continue;
          // Collect consecutive tokens with same role
          const words = [tokens[i].surface];
          seen.add(i);
          let j = i + 1;
          while (j < tokens.length && tokens[j].role === role && !seen.has(j)) {
            words.push(tokens[j].surface);
            seen.add(j);
            j++;
          }
          parts.push({ num: num++, role, abbr: rl.abbr, zh: rl.zh, text: words.join(' ') });
        }
      }
    }
    return parts;
  }

  // ── Helpers ──
  function findNearbyVerb(tokens, pronIdx) {
    // Look forward first (pronoun before verb is most common)
    for (let j = pronIdx + 1; j < Math.min(pronIdx + 4, tokens.length); j++) {
      if (tokens[j].pos === 'Verb') return tokens[j];
    }
    // Look backward (pronoun attached after verb in some constructions)
    for (let j = pronIdx - 1; j >= Math.max(0, pronIdx - 2); j--) {
      if (tokens[j].pos === 'Verb') return tokens[j];
    }
    return null;
  }

  function findNextNonPunct(tokens, idx) {
    for (let j = idx + 1; j < tokens.length; j++) {
      if (tokens[j].pos !== 'Punctuation') return tokens[j];
    }
    return null;
  }

  function isReflexiveVerb(lemma, tokens, pronIdx) {
    if (!lemma) return false;
    if (/(ar|er|ir)se$/i.test(lemma)) return true;
    const reflexiveVerbs = new Set(['lavar','vestir','sentar','levantar','acostar','despertar','duchar','peinar','llamar','quejar']);
    return reflexiveVerbs.has(lemma.replace(/se$/, ''));
  }

  function lastSyllable(word) {
    if (!word || word.length < 3) return word || '';
    return word.slice(-3);
  }

  window.WordOrder = Object.freeze({ analyzeClitics, buildSvoAnnotation, CLITIC_INFO });
})();
