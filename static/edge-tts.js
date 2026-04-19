/**
 * edge-tts.js — Microsoft Edge Neural TTS via WebSocket.
 * No API key required. Provides high-quality AI voices for 100+ locales.
 */
(function () {
  'use strict';

  const CONFIG = {
    TOKEN: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    WSS: 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1',
    VOICES_URL: 'https://api.msedgeservices.com/tts/cognitiveservices/voices/list',
    GEC_VERSION: '1-142.0.3595',
  };

  // Preferred Spanish voices (sorted by quality)
  const SPANISH_VOICES = [
    { short: 'es-ES-ElviraNeural',     label: 'Elvira（西班牙·女）', locale: 'es-ES', gender: 'Female' },
    { short: 'es-ES-AlvaroNeural',     label: 'Álvaro（西班牙·男）', locale: 'es-ES', gender: 'Male' },
    { short: 'es-MX-DaliaNeural',      label: 'Dalia（墨西哥·女）',  locale: 'es-MX', gender: 'Female' },
    { short: 'es-MX-JorgeNeural',      label: 'Jorge（墨西哥·男）',  locale: 'es-MX', gender: 'Male' },
    { short: 'es-AR-ElenaNeural',      label: 'Elena（阿根廷·女）',  locale: 'es-AR', gender: 'Female' },
    { short: 'es-AR-TomasNeural',      label: 'Tomás（阿根廷·男）',  locale: 'es-AR', gender: 'Male' },
    { short: 'es-CO-SalomeNeural',     label: 'Salomé（哥伦比亚·女）', locale: 'es-CO', gender: 'Female' },
    { short: 'es-CO-GonzaloNeural',    label: 'Gonzalo（哥伦比亚·男）', locale: 'es-CO', gender: 'Male' },
    { short: 'es-CL-CatalinaNeural',   label: 'Catalina（智利·女）', locale: 'es-CL', gender: 'Female' },
    { short: 'es-PE-CamilaNeural',     label: 'Camila（秘鲁·女）',   locale: 'es-PE', gender: 'Female' },
    { short: 'es-CU-BelkysNeural',     label: 'Belkys（古巴·女）',   locale: 'es-CU', gender: 'Female' },
    { short: 'es-VE-PaolaNeural',      label: 'Paola（委内瑞拉·女）', locale: 'es-VE', gender: 'Female' },
  ];

  function uuid() {
    return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function randomToken() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  async function secMsGec() {
    const ticks = Math.floor(Date.now() / 1000) + 11644473600;
    const rounded = ticks - (ticks % 300);
    const winTicks = rounded * 10_000_000;
    const data = new TextEncoder().encode(`${winTicks}${CONFIG.TOKEN}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function buildSSML(text, voice, rate = 0, pitch = 0) {
    const r = (rate >= 0 ? '+' : '') + rate + '%';
    const p = (pitch >= 0 ? '+' : '') + pitch + 'Hz';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-ES">` +
      `<voice name="${voice}">` +
      `<prosody rate="${r}" pitch="${p}">${escaped}</prosody>` +
      `</voice></speak>`;
  }

  function findPattern(arr, pattern) {
    for (let i = 0; i <= arr.length - pattern.length; i++) {
      let ok = true;
      for (let j = 0; j < pattern.length; j++) {
        if (arr[i + j] !== pattern[j]) { ok = false; break; }
      }
      if (ok) return i;
    }
    return -1;
  }

  /**
   * Synthesize text using Edge TTS.
   * @param {string} text
   * @param {string} voice  — ShortName, e.g. "es-ES-ElviraNeural"
   * @param {object} opts   — { rate: number, pitch: number, onProgress: fn }
   * @returns {Promise<{blob: Blob, url: string}>}
   */
  async function synthesize(text, voice, opts = {}) {
    const { rate = 0, pitch = 0, onProgress } = opts;
    const gec = await secMsGec();
    const reqId = uuid();
    const wsUrl = `${CONFIG.WSS}?Ocp-Apim-Subscription-Key=${CONFIG.TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${CONFIG.GEC_VERSION}&ConnectionId=${reqId}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const chunks = [];
      const timeout = setTimeout(() => { ws.close(); reject(new Error('TTS timeout')); }, 30000);

      ws.onopen = () => {
        if (onProgress) onProgress('connecting');
        const ts = new Date().toUTCString();
        ws.send(
          `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`
        );
        const ssml = buildSSML(text, voice, rate, pitch);
        ws.send(
          `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`
        );
        if (onProgress) onProgress('synthesizing');
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          if (ev.data.includes('Path:turn.end')) ws.close();
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            const u8 = new Uint8Array(reader.result);
            const needle = new TextEncoder().encode('Path:audio\r\n');
            const idx = findPattern(u8, needle);
            if (idx !== -1) chunks.push(u8.slice(idx + needle.length));
          };
          reader.readAsArrayBuffer(ev.data);
        }
      };

      ws.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket error')); };

      ws.onclose = () => {
        clearTimeout(timeout);
        const total = chunks.reduce((s, c) => s + c.length, 0);
        if (total === 0) { reject(new Error('No audio data')); return; }
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        const blob = new Blob([merged], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        if (onProgress) onProgress('done');
        resolve({ blob, url });
      };
    });
  }

  /**
   * Convenience: synthesize + play immediately.
   * Returns an HTMLAudioElement for control.
   */
  async function speak(text, voice, opts = {}) {
    const { url } = await synthesize(text, voice, opts);
    const audio = new Audio(url);
    audio.play();
    return audio;
  }

  // Expose
  window.EdgeTTS = Object.freeze({
    synthesize,
    speak,
    SPANISH_VOICES,
    getVoices: () => SPANISH_VOICES,
  });
})();
