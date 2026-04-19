/**
 * vocab-book.js — Vocabulary book with simplified SM-2 spaced repetition.
 * Stores saved words in localStorage, supports 3-tier review.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'lenguaviva-vocab';
  const STATUS = { NEW: 0, LEARNING: 1, MASTERED: 2 };
  const STATUS_ZH = { 0: '生疏', 1: '熟悉', 2: '掌握' };
  const STATUS_COLOR = { 0: '#ef4444', 1: '#f59e0b', 2: '#22c55e' };

  // SM-2 simplified intervals (in days)
  const INTERVALS = { 0: 0, 1: 1, 2: 4 };

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch { return {}; }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Add a word to the vocabulary book.
   * @param {string} word — surface form
   * @param {string} lemma
   * @param {string} pos
   * @param {string} zh — Chinese translation
   */
  function addWord(word, lemma, pos, zh) {
    const data = load();
    const key = (lemma || word).toLowerCase();
    if (data[key]) return false;
    data[key] = {
      word, lemma: lemma || word, pos, zh: zh || '',
      status: STATUS.NEW,
      addedAt: Date.now(),
      lastReview: null,
      nextReview: Date.now(),
      reviewCount: 0,
    };
    save(data);
    return true;
  }

  /**
   * Remove a word from the vocabulary book.
   */
  function removeWord(lemma) {
    const data = load();
    const key = (lemma || '').toLowerCase();
    if (!data[key]) return false;
    delete data[key];
    save(data);
    return true;
  }

  /**
   * Check if a word is in the vocabulary book.
   */
  function hasWord(lemma) {
    const data = load();
    return !!data[(lemma || '').toLowerCase()];
  }

  /**
   * Review a word: advance or demote based on response.
   * @param {string} lemma
   * @param {'easy'|'hard'|'forgot'} response
   */
  function review(lemma, response) {
    const data = load();
    const key = (lemma || '').toLowerCase();
    const entry = data[key];
    if (!entry) return;

    entry.lastReview = Date.now();
    entry.reviewCount++;

    if (response === 'easy') {
      entry.status = Math.min(entry.status + 1, STATUS.MASTERED);
    } else if (response === 'forgot') {
      entry.status = STATUS.NEW;
    }

    const intervalDays = INTERVALS[entry.status] || 0;
    entry.nextReview = Date.now() + intervalDays * 86400000;
    save(data);
  }

  /**
   * Get all words due for review.
   */
  function getDueWords() {
    const data = load();
    const now = Date.now();
    return Object.values(data)
      .filter(e => e.nextReview <= now && e.status < STATUS.MASTERED)
      .sort((a, b) => a.nextReview - b.nextReview);
  }

  /**
   * Get all saved words.
   */
  function getAll() {
    const data = load();
    return Object.values(data).sort((a, b) => b.addedAt - a.addedAt);
  }

  /**
   * Get stats.
   */
  function stats() {
    const all = getAll();
    const due = getDueWords();
    return {
      total: all.length,
      newCount: all.filter(e => e.status === STATUS.NEW).length,
      learningCount: all.filter(e => e.status === STATUS.LEARNING).length,
      masteredCount: all.filter(e => e.status === STATUS.MASTERED).length,
      dueCount: due.length,
    };
  }

  window.VocabBook = Object.freeze({
    addWord, removeWord, hasWord, review,
    getDueWords, getAll, stats,
    STATUS, STATUS_ZH, STATUS_COLOR,
  });
})();
