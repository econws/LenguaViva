/**
 * SpanishSegmenter — es-compromise wrapper for POS tagging & tokenization
 * Includes custom lexicon patches to improve accuracy for common words.
 */
class SpanishSegmenter {
  constructor() {
    this.nlp = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    const lib = window.esCompromise || window.nlp;
    if (typeof lib === 'undefined') {
      throw new Error('es-compromise not loaded — include the script tag before segmenter.js');
    }
    this.nlp = lib;
    this._patchLexicon();
    this.initialized = true;
    console.log('SpanishSegmenter: es-compromise loaded + lexicon patched');
  }

  /**
   * Patch es-compromise lexicon to fix known mis-tags.
   */
  _patchLexicon() {
    try {
      this.nlp.addWords({
        'una':       'Determiner',
        'un':        'Determiner',
        'unos':      'Determiner',
        'unas':      'Determiner',
        'se':        'Pronoun',
        'me':        'Pronoun',
        'te':        'Pronoun',
        'nos':       'Pronoun',
        'os':        'Pronoun',
        'le':        'Pronoun',
        'les':       'Pronoun',
        'lo':        'Pronoun',
        'la':        'Pronoun',
        'los':       'Pronoun',
        'las':       'Pronoun',
        'estudiante':  'Noun',
        'estudiantes': 'Noun',
        'vocabulario': 'Noun',
        'gramática':   'Noun',
        'mundo':       'Noun',
        'país':        'Noun',
        'países':      'Noun',
        'día':         'Noun',
        'días':        'Noun',
        'casa':        'Noun',
        'hombre':      'Noun',
        'mujer':       'Noun',
        'niño':        'Noun',
        'niña':        'Noun',
        'amigo':       'Noun',
        'amiga':       'Noun',
        'libro':       'Noun',
        'lengua':      'Noun',
        'persona':     'Noun',
        'personas':    'Noun',
        'tiempo':      'Noun',
        'lugar':       'Noun',
        'vida':        'Noun',
        'agua':        'Noun',
        'comida':      'Noun',
        'trabajo':     'Noun',
        'ciudad':      'Noun',
        'dinero':      'Noun',
        'problema':    'Noun',
        'ejemplo':     'Noun',
        'idioma':      'Noun',
        'español':     'Noun',
        'que':         'Conjunction',
        'porque':      'Conjunction',
        'aunque':      'Conjunction',
        'mientras':    'Conjunction',
        'cuando':      'Conjunction',
        'donde':       'Adverb',
        'aquí':        'Adverb',
        'allí':        'Adverb',
        'ahora':       'Adverb',
        'siempre':     'Adverb',
        'nunca':       'Adverb',
        'también':     'Adverb',
        'muy':         'Adverb',
        'más':         'Adverb',
        'menos':       'Adverb',
        'bien':        'Adverb',
        'mal':         'Adverb',
        'yo':          'Pronoun',
        'tú':          'Pronoun',
        'él':          'Pronoun',
        'ella':        'Pronoun',
        'nosotros':    'Pronoun',
        'ellos':       'Pronoun',
        'ellas':       'Pronoun',
        'usted':       'Pronoun',
        'ustedes':     'Pronoun',
      });
    } catch (e) {
      console.warn('Lexicon patch failed (non-critical):', e.message);
    }
  }

  /**
   * Map es-compromise tags to a simplified POS label.
   */
  static mapTag(tags) {
    if (!tags) return 'Other';
    if (tags.Verb) return 'Verb';
    if (tags.Noun) return 'Noun';
    if (tags.Adjective) return 'Adjective';
    if (tags.Adverb) return 'Adverb';
    if (tags.Determiner || tags.Article) return 'Determiner';
    if (tags.Preposition) return 'Preposition';
    if (tags.Conjunction) return 'Conjunction';
    if (tags.Pronoun) return 'Pronoun';
    if (tags.Punctuation) return 'Punctuation';
    if (tags.Value || tags.Cardinal || tags.Ordinal) return 'Number';
    return 'Other';
  }

  static posLabel(pos) {
    const map = {
      Noun:        '名词',
      Verb:        '动词',
      Adjective:   '形容词',
      Adverb:      '副词',
      Determiner:  '限定词',
      Preposition: '介词',
      Conjunction: '连词',
      Pronoun:     '代词',
      Number:      '数词',
      Punctuation: '标点',
      Other:       '其他',
    };
    return map[pos] || pos;
  }

  static posLabelEs(pos) {
    const map = {
      Noun: 'Sust.', Verb: 'Verb.', Adjective: 'Adj.', Adverb: 'Adv.',
      Determiner: 'Det.', Preposition: 'Prep.', Conjunction: 'Conj.',
      Pronoun: 'Pron.', Number: 'Num.', Punctuation: '', Other: 'Otro',
    };
    return map[pos] || pos;
  }

  /**
   * Segment text and return structured token data.
   */
  async segment(text) {
    if (!this.initialized) await this.init();
    if (!text || !text.trim()) return { lines: [] };

    const raw = text.replace(/\r/g, '');
    const lineTexts = raw.split('\n').filter(l => l.trim());
    const result = [];

    for (const line of lineTexts) {
      const doc = this.nlp(line);
      try { doc.compute('root'); } catch (_) {}

      const jsonData = doc.json();
      const tokens = [];

      for (const sentence of jsonData) {
        const terms = sentence.terms || [];
        for (const term of terms) {
          const surface = term.text || '';
          const pre = (term.pre || '').trim();
          const post = (term.post || '').replace(/\s+$/, '');
          const tagArr = term.tags || [];
          const tagObj = {};
          tagArr.forEach(t => { tagObj[t] = true; });
          const pos = SpanishSegmenter.mapTag(tagObj);

          if (pre) {
            tokens.push({ surface: pre, lemma: pre, pos: 'Punctuation', rawTags: ['Punctuation'] });
          }

          tokens.push({
            surface,
            lemma: term.root || surface.toLowerCase(),
            pos,
            rawTags: tagArr,
          });

          if (post) {
            tokens.push({ surface: post, lemma: post, pos: 'Punctuation', rawTags: ['Punctuation'] });
          }
        }
      }

      result.push(tokens);
    }

    return { lines: result };
  }
}

window.SpanishSegmenter = SpanishSegmenter;
