/**
 * morphology.js — Spanish word formation analysis
 * Decomposes words into prefix + root + suffix + gender/number ending.
 */
(function () {
  'use strict';

  // ── Prefixes (sorted longest-first for greedy matching) ──
  const PREFIXES = [
    { form:'contra', zh:'反/对' },
    { form:'sobre', zh:'超/过' },
    { form:'entre', zh:'之间' },
    { form:'trans', zh:'跨/越' },
    { form:'super', zh:'超级' },
    { form:'inter', zh:'之间' },
    { form:'extra', zh:'额外' },
    { form:'multi', zh:'多' },
    { form:'ante', zh:'前/先' },
    { form:'anti', zh:'反' },
    { form:'auto', zh:'自' },
    { form:'semi', zh:'半' },
    { form:'vice', zh:'副' },
    { form:'mini', zh:'小' },
    { form:'mega', zh:'大' },
    { form:'pre',  zh:'前/预' },
    { form:'des',  zh:'去/解/反' },
    { form:'dis',  zh:'否/分' },
    { form:'sub',  zh:'下/次' },
    { form:'pos',  zh:'后' },
    { form:'mis',  zh:'坏/错' },
    { form:'mal',  zh:'坏/恶' },
    { form:'ben',  zh:'好/善' },
    { form:'con',  zh:'共/一起' },
    { form:'com',  zh:'共/一起' },
    { form:'co',   zh:'共/协' },
    { form:'re',   zh:'再/重' },
    { form:'in',   zh:'不/入' },
    { form:'im',   zh:'不/入' },
    { form:'ex',   zh:'出/前' },
    { form:'en',   zh:'使…' },
    { form:'em',   zh:'使…' },
    { form:'bi',   zh:'双' },
    { form:'a',    zh:'向/无' },
  ];

  // ── Suffixes (sorted longest-first) ──
  const SUFFIXES = [
    { form:'amiento', zh:'…的过程/结果', pos:'Noun' },
    { form:'imiento', zh:'…的过程/结果', pos:'Noun' },
    { form:'ización', zh:'…化', pos:'Noun' },
    { form:'mente', zh:'…地（副词后缀）', pos:'Adverb' },
    { form:'ción',  zh:'…的动作/状态', pos:'Noun' },
    { form:'sión',  zh:'…的动作/状态', pos:'Noun' },
    { form:'idad',  zh:'…性/度', pos:'Noun' },
    { form:'edad',  zh:'…性/度', pos:'Noun' },
    { form:'ismo',  zh:'…主义', pos:'Noun' },
    { form:'ista',  zh:'…者/主义者', pos:'Noun' },
    { form:'anza',  zh:'…的状态', pos:'Noun' },
    { form:'ería',  zh:'…店/行为', pos:'Noun' },
    { form:'ador',  zh:'…者（阳）', pos:'Noun' },
    { form:'adora', zh:'…者（阴）', pos:'Noun' },
    { form:'dor',   zh:'…者（阳）', pos:'Noun' },
    { form:'dora',  zh:'…者（阴）', pos:'Noun' },
    { form:'ero',   zh:'…者/商（阳）', pos:'Noun' },
    { form:'era',   zh:'…者/商（阴）', pos:'Noun' },
    { form:'miento',zh:'…的过程', pos:'Noun' },
    { form:'oso',   zh:'充满…的', pos:'Adjective' },
    { form:'osa',   zh:'充满…的（阴）', pos:'Adjective' },
    { form:'able',  zh:'可…的', pos:'Adjective' },
    { form:'ible',  zh:'可…的', pos:'Adjective' },
    { form:'ante',  zh:'正在…的', pos:'Adjective' },
    { form:'ente',  zh:'正在…的', pos:'Adjective' },
    { form:'ivo',   zh:'有…性质的', pos:'Adjective' },
    { form:'iva',   zh:'有…性质的（阴）', pos:'Adjective' },
    { form:'ico',   zh:'…的', pos:'Adjective' },
    { form:'ica',   zh:'…的（阴）', pos:'Adjective' },
    { form:'tico',  zh:'…的', pos:'Adjective' },
    { form:'tica',  zh:'…的（阴）', pos:'Adjective' },
    { form:'ado',   zh:'过去分词/状态（阳）', pos:'Adjective' },
    { form:'ada',   zh:'过去分词/状态（阴）', pos:'Adjective' },
    { form:'ido',   zh:'过去分词/状态（阳）', pos:'Adjective' },
    { form:'ida',   zh:'过去分词/状态（阴）', pos:'Adjective' },
    { form:'al',    zh:'…的', pos:'Adjective' },
    { form:'ar',    zh:'不定式(-ar)', pos:'Verb' },
    { form:'er',    zh:'不定式(-er)', pos:'Verb' },
    { form:'ir',    zh:'不定式(-ir)', pos:'Verb' },
    { form:'ando',  zh:'现在分词(-ar)', pos:'Verb' },
    { form:'iendo', zh:'现在分词(-er/-ir)', pos:'Verb' },
  ];

  // Gender/number endings
  const GN_ENDINGS = [
    { form:'os', gender:'阳性', number:'复数', zh:'阳复' },
    { form:'as', gender:'阴性', number:'复数', zh:'阴复' },
    { form:'es', gender:'—',    number:'复数', zh:'复数' },
    { form:'o',  gender:'阳性', number:'单数', zh:'阳单' },
    { form:'a',  gender:'阴性', number:'单数', zh:'阴单' },
  ];

  /**
   * Analyze the morphological structure of a word.
   * @param {string} word — surface form
   * @param {string} lemma — dictionary form
   * @param {string} pos — part of speech
   * @returns {{ prefix, root, suffix, ending, parts[] } | null}
   */
  function analyze(word, lemma, pos) {
    if (!word || word.length < 3) return null;
    const lower = word.toLowerCase();

    let prefix = null;
    let remaining = lower;

    // Try to match prefix
    for (const p of PREFIXES) {
      if (remaining.startsWith(p.form) && remaining.length > p.form.length + 2) {
        prefix = { form: p.form, zh: p.zh };
        remaining = remaining.slice(p.form.length);
        break;
      }
    }

    // Try to match suffix
    let suffix = null;
    for (const s of SUFFIXES) {
      if (remaining.endsWith(s.form) && remaining.length > s.form.length + 1) {
        suffix = { form: s.form, zh: s.zh, pos: s.pos };
        remaining = remaining.slice(0, remaining.length - s.form.length);
        break;
      }
    }

    // Gender/number ending (only for nouns/adjectives without a suffix match)
    let ending = null;
    if (!suffix && (pos === 'Noun' || pos === 'Adjective' || pos === 'Determiner')) {
      for (const gn of GN_ENDINGS) {
        if (lower.endsWith(gn.form) && lower.length > gn.form.length + 1) {
          ending = { form: gn.form, gender: gn.gender, number: gn.number, zh: gn.zh };
          remaining = remaining.slice(0, remaining.length - gn.form.length);
          break;
        }
      }
    }

    // Root is whatever remains
    const root = remaining;
    if (root.length < 1) return null;
    if (!prefix && !suffix && !ending) return null;

    // Build displayable parts
    const parts = [];
    if (prefix) parts.push({ type:'prefix', form:prefix.form, zh:prefix.zh });
    parts.push({ type:'root', form:root, zh:'' });
    if (suffix) parts.push({ type:'suffix', form:suffix.form, zh:suffix.zh });
    if (ending) parts.push({ type:'ending', form:ending.form, zh:ending.zh });

    return { prefix, root, suffix, ending, parts };
  }

  /**
   * Get gender/number info for a word based on its ending.
   */
  function genderNumber(word, pos) {
    if (!word || (pos !== 'Noun' && pos !== 'Adjective')) return null;
    const lower = word.toLowerCase();
    for (const gn of GN_ENDINGS) {
      if (lower.endsWith(gn.form)) {
        return { gender: gn.gender, number: gn.number, zh: gn.zh };
      }
    }
    if (lower.endsWith('s')) return { gender:'—', number:'复数', zh:'复数' };
    return { gender:'—', number:'单数', zh:'—' };
  }

  window.Morphology = Object.freeze({ analyze, genderNumber });
})();
