/**
 * syllable.js — Spanish syllable splitting & stress marking
 * Implements standard Spanish phonological rules.
 */
(function () {
  'use strict';

  const VOWELS = new Set('aeiouáéíóúüAEIOUÁÉÍÓÚÜ');
  const STRONG = new Set('aeoáéóAEOÁÉÓ');
  const ACCENTED = new Set('áéíóúÁÉÍÓÚ');

  function isVowel(ch) { return VOWELS.has(ch); }
  function isConsonant(ch) { return ch && /[a-záéíóúüñ]/i.test(ch) && !isVowel(ch); }
  function isStrong(ch) { return STRONG.has(ch); }
  function hasAccent(ch) { return ACCENTED.has(ch); }

  // Inseparable consonant pairs (onset clusters)
  const CLUSTERS = new Set([
    'bl','br','cl','cr','dr','fl','fr','gl','gr',
    'pl','pr','tr','tl','ch','ll','rr','ñ',
  ]);

  function isCluster(a, b) {
    return CLUSTERS.has((a + b).toLowerCase());
  }

  /**
   * Split a Spanish word into syllables.
   * @param {string} word
   * @returns {string[]} array of syllable strings
   */
  function syllabify(word) {
    if (!word || word.length === 0) return [word || ''];
    const chars = [...word];
    const n = chars.length;

    // Build a list of vowel/consonant info
    const syllables = [];
    let current = '';

    for (let i = 0; i < n; i++) {
      const ch = chars[i];
      current += ch;

      if (!isVowel(ch)) continue;

      // Absorb weak vowels forming diphthongs/triphthongs with next char
      while (i + 1 < n && isVowel(chars[i + 1])) {
        const next = chars[i + 1];
        // Two strong vowels = hiatus (separate syllables)
        if (isStrong(ch) && isStrong(next) && !hasAccent(next)) break;
        // Accented weak vowel breaks diphthong (hiatus)
        if (!isStrong(next) && hasAccent(next)) break;
        if (isStrong(ch) && !isStrong(next) && hasAccent(next)) break;
        current += next;
        i++;
      }

      // Determine how many consonants follow before next vowel
      let consCount = 0;
      let j = i + 1;
      while (j < n && isConsonant(chars[j])) { consCount++; j++; }

      if (j >= n) {
        // Remaining consonants belong to this syllable
        for (let k = i + 1; k < n; k++) current += chars[k];
        i = n;
        syllables.push(current);
        current = '';
        break;
      }

      // Distribute consonants between syllables
      if (consCount === 0) {
        syllables.push(current);
        current = '';
      } else if (consCount === 1) {
        // Single consonant goes to next syllable
        syllables.push(current);
        current = '';
      } else if (consCount === 2) {
        const c1 = chars[i + 1];
        const c2 = chars[i + 2];
        if (isCluster(c1, c2)) {
          // Inseparable cluster goes to next syllable
          syllables.push(current);
          current = '';
        } else {
          // Split: first consonant stays, second goes to next
          current += c1;
          syllables.push(current);
          current = '';
          i++;
        }
      } else if (consCount === 3) {
        const c1 = chars[i + 1];
        const c2 = chars[i + 2];
        const c3 = chars[i + 3];
        if (isCluster(c2, c3)) {
          current += c1;
          syllables.push(current);
          current = '';
          i++;
        } else {
          current += c1 + c2;
          syllables.push(current);
          current = '';
          i += 2;
        }
      } else {
        // 4+ consonants: keep first two, rest go to next
        current += chars[i + 1];
        const c3 = chars[i + 2];
        const c4 = chars[i + 3];
        if (isCluster(c3, c4)) {
          syllables.push(current);
          current = '';
          i++;
        } else {
          current += c3;
          syllables.push(current);
          current = '';
          i += 2;
        }
      }
    }
    if (current) syllables.push(current);
    return syllables.length > 0 ? syllables : [word];
  }

  /**
   * Find the stressed syllable index (0-based from start).
   * Returns { syllables, stressIndex, hasWrittenAccent, rule }
   */
  function analyzeStress(word) {
    const syls = syllabify(word);
    const n = syls.length;
    if (n === 0) return { syllables: [word], stressIndex: 0, hasWrittenAccent: false, rule: '' };
    if (n === 1) return { syllables: syls, stressIndex: 0, hasWrittenAccent: false, rule: '单音节词' };

    // Check for written accent mark
    for (let i = 0; i < n; i++) {
      for (const ch of syls[i]) {
        if (hasAccent(ch)) {
          return {
            syllables: syls,
            stressIndex: i,
            hasWrittenAccent: true,
            rule: '带重音符号，重音在标记音节',
          };
        }
      }
    }

    // Default rules
    const lower = word.toLowerCase();
    const lastChar = lower[lower.length - 1];
    if ('aeiouns'.includes(lastChar)) {
      return {
        syllables: syls,
        stressIndex: n - 2,
        hasWrittenAccent: false,
        rule: '以元音/n/s结尾 → 倒数第二音节重音（llana/grave词）',
      };
    }
    return {
      syllables: syls,
      stressIndex: n - 1,
      hasWrittenAccent: false,
      rule: '以辅音(非n/s)结尾 → 最后音节重音（aguda词）',
    };
  }

  /**
   * Format syllables with stress marking for display.
   * @returns {string} e.g. "es · pa · ÑOL"
   */
  function formatStress(word) {
    const { syllables, stressIndex } = analyzeStress(word);
    return syllables.map((s, i) =>
      i === stressIndex ? s.toUpperCase() : s
    ).join(' · ');
  }

  window.Syllable = Object.freeze({ syllabify, analyzeStress, formatStress });
})();
