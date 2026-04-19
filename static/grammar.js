/**
 * grammar.js — Sentence component analysis, clause detection,
 * sentence pattern recognition & grammar annotation engine.
 */
(function () {
  'use strict';

  // ── Sentence role constants ──
  const Role = Object.freeze({
    SUBJ: 'subj', PRED: 'pred', OBJ: 'obj', IOBJ: 'iobj',
    COMP: 'comp', MOD: 'mod', PREP: 'prep_ph', REFL: 'refl',
    DET: 'det', CONJ: 'conj', PUNCT: 'punct', AUX: 'aux',
  });

  const ROLE_LABELS = {
    [Role.SUBJ]: { zh:'主语', color:'#22c55e', abbr:'主' },
    [Role.PRED]: { zh:'谓语', color:'#3b82f6', abbr:'谓' },
    [Role.OBJ]:  { zh:'宾语', color:'#f59e0b', abbr:'宾' },
    [Role.IOBJ]: { zh:'间接宾语', color:'#f97316', abbr:'间宾' },
    [Role.COMP]: { zh:'补语', color:'#a855f7', abbr:'补' },
    [Role.MOD]:  { zh:'修饰语', color:'#6366f1', abbr:'修' },
    [Role.PREP]: { zh:'介词短语', color:'#ef4444', abbr:'介' },
    [Role.REFL]: { zh:'反身', color:'#ec4899', abbr:'反身' },
    [Role.DET]:  { zh:'限定词', color:'#94a3b8', abbr:'限' },
    [Role.CONJ]: { zh:'连词', color:'#78716c', abbr:'连' },
    [Role.PUNCT]:{ zh:'标点', color:'#9ca3af', abbr:'' },
    [Role.AUX]:  { zh:'助动词', color:'#60a5fa', abbr:'助' },
  };

  const REFLEXIVE_PRONOUNS = new Set(['me','te','se','nos','os']);
  const INDIRECT_OBJ_PRONOUNS = new Set(['me','te','le','nos','os','les']);
  const DIRECT_OBJ_PRONOUNS = new Set(['me','te','lo','la','nos','os','los','las']);

  const AUX_VERBS = new Set([
    'ser','estar','haber','ir','poder','deber','soler','querer',
    'tener','acabar','empezar','comenzar','volver','seguir','dejar','llevar',
  ]);

  const KNOWN_REFLEXIVE_VERBS = new Set([
    'lavar','vestir','sentar','levantar','acostar','despertar','duchar','peinar',
    'llamar','quejar','ir','quedar','caer','dar','dormir','morir','reír','poner',
    'hacer','sentir','arrepentir','atrever','negar','acordar','olvidar','preguntar',
    'imaginar','preocupar','dedicar','convertir','referir','equivocar',
  ]);

  const TEMPORAL_NOUNS = new Set([
    'mañana','tarde','noche','día','días','semana','semanas','mes','meses',
    'año','años','hora','horas','minuto','minutos','segundo','segundos',
    'vez','veces','momento','rato','tiempo','época','siglo',
    'lunes','martes','miércoles','jueves','viernes','sábado','domingo',
    'enero','febrero','marzo','abril','mayo','junio','julio','agosto',
    'septiembre','octubre','noviembre','diciembre',
    'hoy','ayer','anteayer','anoche',
  ]);

  const TEMPORAL_MARKERS = new Set([
    'esta','este','ese','esa','cada','todo','toda','todos','todas',
    'próximo','próxima','pasado','pasada','último','última',
  ]);

  const PREPOSITIONS = new Set([
    'a','ante','bajo','cabe','con','contra','de','del',
    'desde','durante','en','entre','hacia','hasta',
    'mediante','para','por','según','sin','sobre','tras',
  ]);

  const CONJUNCTIONS = new Set([
    'y','e','o','u','ni','pero','sino','mas',
    'que','porque','aunque','cuando','si','como',
    'donde','mientras','pues','ya',
  ]);

  // ── Subordinating conjunctions for clause detection ──
  // Multi-word subordinators listed first (longest match wins)
  const MULTI_SUBORDINATORS = [
    { words:['a','pesar','de','que'],    zh:'让步从句（尽管）',   type:'concessive' },
    { words:['antes','de','que'],        zh:'时间从句（…之前）',  type:'time' },
    { words:['después','de','que'],      zh:'时间从句（…之后）',  type:'time' },
    { words:['a','fin','de','que'],      zh:'目的从句',          type:'purpose' },
    { words:['con','tal','de','que'],    zh:'条件从句（只要）',   type:'conditional' },
    { words:['a','menos','que'],         zh:'条件从句（除非）',   type:'conditional' },
    { words:['siempre','que'],           zh:'条件从句（只要）',   type:'conditional' },
    { words:['dado','que'],              zh:'原因从句（鉴于）',   type:'causal' },
    { words:['ya','que'],                zh:'原因从句（既然）',   type:'causal' },
    { words:['puesto','que'],            zh:'原因从句（既然）',   type:'causal' },
    { words:['para','que'],              zh:'目的从句（为了）',   type:'purpose' },
    { words:['sin','que'],               zh:'方式从句（没有…）',  type:'manner' },
    { words:['en','cuanto'],             zh:'时间从句（一…就）',  type:'time' },
    { words:['cada','vez','que'],        zh:'时间从句（每当）',   type:'time' },
    { words:['hasta','que'],             zh:'时间从句（直到）',   type:'time' },
    { words:['desde','que'],             zh:'时间从句（自从）',   type:'time' },
    { words:['así','que'],               zh:'结果从句（所以）',   type:'result' },
    { words:['de','modo','que'],         zh:'结果从句（以至于）', type:'result' },
    { words:['de','manera','que'],       zh:'结果从句（以至于）', type:'result' },
  ];

  const SINGLE_SUBORDINATORS = {
    'que':      { type:'complement' },
    'quien':    { zh:'关系从句（指人）',  type:'relative' },
    'quienes':  { zh:'关系从句（指人复）',type:'relative' },
    'cual':     { zh:'关系从句',          type:'relative' },
    'cuyo':     { zh:'关系从句（其…的）', type:'relative' },
    'cuya':     { zh:'关系从句（其…的）', type:'relative' },
    'donde':    { zh:'地点从句（在…处）', type:'place' },
    'adonde':   { zh:'地点从句（到…处）', type:'place' },
    'cuando':   { zh:'时间从句（当…时）', type:'time' },
    'mientras': { zh:'时间从句（同时）',  type:'time' },
    'si':       { zh:'条件从句（如果）',  type:'conditional' },
    'aunque':   { zh:'让步从句（虽然）',  type:'concessive' },
    'porque':   { zh:'原因从句（因为）',  type:'causal' },
    'como':     { zh:'方式/原因从句',     type:'manner' },
    'pues':     { zh:'原因从句（因为）',  type:'causal' },
  };

  // Verbs / expressions that take "que" as complement (not relative)
  const COMPLEMENT_TRIGGERS = new Set([
    'creer','pensar','decir','saber','querer','esperar','necesitar',
    'parecer','suponer','imaginar','opinar','considerar','sentir',
    'pedir','mandar','ordenar','permitir','prohibir','recomendar',
    'es','era','fue','será','sea','posible','probable','necesario',
    'importante','mejor','obvio','claro','cierto','verdad','seguro',
  ]);

  const CLAUSE_TYPE_ZH = {
    main:'主句', relative:'关系从句', complement:'补语从句',
    time:'时间从句', conditional:'条件从句', concessive:'让步从句',
    causal:'原因从句', manner:'方式从句', purpose:'目的从句',
    place:'地点从句', result:'结果从句',
  };

  const CLAUSE_TYPE_COLORS = {
    main:'var(--role-pred)', relative:'#8b5cf6', complement:'#0ea5e9',
    time:'#f59e0b', conditional:'#ef4444', concessive:'#ec4899',
    causal:'#f97316', manner:'#6366f1', purpose:'#22c55e',
    place:'#14b8a6', result:'#78716c',
  };

  // ── Sentence pattern templates ──
  const PATTERNS = [
    {
      id:'gustar_inv',
      name:'gustar 型倒装',
      skeleton:'A + IO + REFL + gustar型 + S',
      zh:'[A + 间宾代词 + gustar型动词 + 真正主语] ≈ [某人喜欢某物]',
      test(tokens) {
        return tokens.some(t => t.pos === 'Verb' && GUSTAR_VERBS.has((t.lemma||'').toLowerCase()));
      },
    },
    {
      id:'se_impersonal',
      name:'无人称 se',
      skeleton:'Se + V + ...',
      zh:'[se + 动词] ≈ [人们…/有人…] — 不指明施动者',
      test(tokens) {
        for (let i = 0; i < tokens.length - 1; i++) {
          if ((tokens[i].surface||'').toLowerCase() === 'se') {
            const next = findNextWord(tokens, i);
            if (next && next.pos === 'Verb' && next.role === Role.PRED) return true;
          }
        }
        return false;
      },
    },
    {
      id:'estar_gerund',
      name:'进行体',
      skeleton:'Estar + gerundio',
      zh:'[estar变位 + -ando/-iendo] ≈ [正在做…]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 1; i++) {
          if (ESTAR_FORMS.has((tokens[i].surface||'').toLowerCase())) {
            const next = findNextWord(tokens, i);
            if (next && /(?:ando|iendo)$/i.test(next.surface)) return true;
          }
        }
        return false;
      },
    },
    {
      id:'haber_part',
      name:'完成体',
      skeleton:'Haber + participio',
      zh:'[haber变位 + 过去分词(-ado/-ido)] ≈ [已经做了…]',
      test(tokens) {
        const haberForms = new Set(['he','has','ha','hemos','habéis','han','había','habías','habíamos','habíais','habían']);
        for (let i = 0; i < tokens.length - 1; i++) {
          if (haberForms.has((tokens[i].surface||'').toLowerCase())) {
            const next = findNextWord(tokens, i);
            if (next && /(?:ado|ido|to|cho|so|erto)$/i.test(next.surface)) return true;
          }
        }
        return false;
      },
    },
    {
      id:'tener_que',
      name:'义务表达',
      skeleton:'Tener que + infinitivo',
      zh:'[tener变位 + que + 不定式] ≈ [必须/不得不做…]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 2; i++) {
          if ((tokens[i].lemma||'').toLowerCase() === 'tener' && tokens[i].pos === 'Verb') {
            const n1 = findNextWord(tokens, i);
            if (n1 && (n1.surface||'').toLowerCase() === 'que') {
              const n2 = findNextWord(tokens, tokens.indexOf(n1));
              if (n2 && isInfinitive(n2.surface)) return true;
            }
          }
        }
        return false;
      },
    },
    {
      id:'ir_a_inf',
      name:'近将来',
      skeleton:'Ir a + infinitivo',
      zh:'[ir变位 + a + 不定式] ≈ [将要/打算做…]',
      test(tokens) {
        const irForms = new Set(['voy','vas','va','vamos','vais','van']);
        for (let i = 0; i < tokens.length - 2; i++) {
          if (irForms.has((tokens[i].surface||'').toLowerCase())) {
            const n1 = findNextWord(tokens, i);
            if (n1 && (n1.surface||'').toLowerCase() === 'a') {
              const n2 = findNextWord(tokens, tokens.indexOf(n1));
              if (n2 && isInfinitive(n2.surface)) return true;
            }
          }
        }
        return false;
      },
    },
    {
      id:'acabar_de',
      name:'刚刚',
      skeleton:'Acabar de + infinitivo',
      zh:'[acabar变位 + de + 不定式] ≈ [刚刚做了…]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 2; i++) {
          if ((tokens[i].lemma||'').toLowerCase() === 'acabar' && tokens[i].pos === 'Verb') {
            const n1 = findNextWord(tokens, i);
            if (n1 && (n1.surface||'').toLowerCase() === 'de') {
              const n2 = findNextWord(tokens, tokens.indexOf(n1));
              if (n2 && isInfinitive(n2.surface)) return true;
            }
          }
        }
        return false;
      },
    },
    {
      id:'hay_que',
      name:'无人称义务',
      skeleton:'Hay que + infinitivo',
      zh:'[hay que + 不定式] ≈ [有必要…/应该…] — 不指明主语',
      test(tokens) {
        for (let i = 0; i < tokens.length - 2; i++) {
          if ((tokens[i].surface||'').toLowerCase() === 'hay') {
            const n1 = findNextWord(tokens, i);
            if (n1 && (n1.surface||'').toLowerCase() === 'que') {
              const n2 = findNextWord(tokens, tokens.indexOf(n1));
              if (n2 && isInfinitive(n2.surface)) return true;
            }
          }
        }
        return false;
      },
    },
    {
      id:'poder_inf',
      name:'能力/许可',
      skeleton:'Poder + infinitivo',
      zh:'[poder变位 + 不定式] ≈ [能够/可以做…]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 1; i++) {
          if ((tokens[i].lemma||'').toLowerCase() === 'poder' && tokens[i].pos === 'Verb') {
            const next = findNextWord(tokens, i);
            if (next && isInfinitive(next.surface)) return true;
          }
        }
        return false;
      },
    },
    {
      id:'deber_inf',
      name:'应该',
      skeleton:'Deber + infinitivo',
      zh:'[deber变位 + 不定式] ≈ [应该做…]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 1; i++) {
          if ((tokens[i].lemma||'').toLowerCase() === 'deber' && tokens[i].pos === 'Verb') {
            const next = findNextWord(tokens, i);
            if (next && isInfinitive(next.surface)) return true;
          }
        }
        return false;
      },
    },
    {
      id:'ser_passive',
      name:'被动语态',
      skeleton:'Ser + participio',
      zh:'[ser变位 + 过去分词] ≈ [被…] — 被动结构',
      test(tokens) {
        for (let i = 0; i < tokens.length - 1; i++) {
          if (SER_FORMS.has((tokens[i].surface||'').toLowerCase())) {
            const next = findNextWord(tokens, i);
            if (next && /(?:ado|ido|to|cho|so|erto)$/i.test(next.surface) && next.pos !== 'Verb') return true;
          }
        }
        return false;
      },
    },
    {
      id:'comparative',
      name:'比较结构',
      skeleton:'más/menos + adj + que',
      zh:'[más/menos + 形容词 + que] ≈ [比…更/不如…]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 2; i++) {
          const s = (tokens[i].surface||'').toLowerCase();
          if (s === 'más' || s === 'menos') {
            const n1 = findNextWord(tokens, i);
            if (n1 && n1.pos === 'Adjective') return true;
          }
        }
        return false;
      },
    },
    {
      id:'superlative',
      name:'最高级',
      skeleton:'el/la más + adj',
      zh:'[el/la + más + 形容词] ≈ [最…的]',
      test(tokens) {
        for (let i = 0; i < tokens.length - 2; i++) {
          const s = (tokens[i].surface||'').toLowerCase();
          if ((s === 'el' || s === 'la' || s === 'los' || s === 'las') && tokens[i].pos === 'Determiner') {
            const n1 = findNextWord(tokens, i);
            if (n1 && (n1.surface||'').toLowerCase() === 'más') {
              const n2 = findNextWord(tokens, tokens.indexOf(n1));
              if (n2 && n2.pos === 'Adjective') return true;
            }
          }
        }
        return false;
      },
    },
    {
      id:'svo',
      name:'标准 SVO',
      skeleton:'主语 + 谓语 + 宾语',
      zh:'[主语 + 动词 + 宾语] — 西语基本语序',
      test(tokens) {
        const roles = tokens.filter(t => t.role && t.role !== Role.PUNCT).map(t => t.role);
        const hasS = roles.includes(Role.SUBJ);
        const hasV = roles.includes(Role.PRED);
        const hasO = roles.includes(Role.OBJ);
        if (hasS && hasV && hasO) {
          const si = roles.indexOf(Role.SUBJ);
          const vi = roles.indexOf(Role.PRED);
          const oi = roles.indexOf(Role.OBJ);
          return si < vi && vi < oi;
        }
        return false;
      },
    },
  ];

  // ── Grammar note templates ──
  const GRAMMAR_NOTES = {
    reflexive:   { title:'反身动词 (Verbo reflexivo)', icon:'🔄',
      explain:(v)=>`"${v}" 这里是反身用法。西班牙语反身动词表示动作施加于主语自身，如 lavarse（洗自己）、llamarse（叫做）。反身代词（me/te/se/nos/os）必须与主语人称一致。` },
    ser_estar:   { title:'ser 与 estar 的区别', icon:'⚖️',
      explain:(v)=>{
        if (['ser','es','son','somos','soy','eres','era','eran','fue','fueron'].includes(v))
          return `"${v}" 来自 ser，用于表达本质属性、身份、时间、材料等恒久特征。如：Ella es profesora（她是老师）。`;
        return `"${v}" 来自 estar，用于表达状态、位置、情绪等暂时特征。如：Estoy cansado（我累了）。`;
      }},
    personal_a:  { title:'人称介词 a (a personal)', icon:'👤',
      explain:()=>'当直接宾语是特定的人时，西班牙语需要在宾语前加介词 "a"。如：Veo a María（我看见玛丽亚）。这是西班牙语特有的语法规则。' },
    por_para:    { title:'por 与 para 的区别', icon:'↔️',
      explain:(w)=>w==='por'?'"por" 表示原因、交换、途经、代替、持续时间。如：Gracias por tu ayuda（感谢你的帮助）。':'"para" 表示目的、方向、期限、对象。如：Estudio para aprender（我学习是为了学会）。' },
    subjunctive: { title:'虚拟式 (Subjuntivo)', icon:'💭',
      explain:()=>'虚拟式用于表达愿望、怀疑、情感、假设等非确定情况。常见触发词：querer que, esperar que, es posible que, ojalá。' },
    gustar:      { title:'gustar 型动词', icon:'💡',
      explain:(v)=>`"${v}" 属于 gustar 型动词，主语和宾语与中文相反：字面意思是"某事使某人喜欢"，而非"某人喜欢某事"。结构：A mí me gusta el café = 咖啡使我喜欢 = 我喜欢咖啡。` },
    clitic:      { title:'宾语代词前置 (Clítico)', icon:'📎',
      explain:(p)=>`"${p}" 是宾语代词，在西班牙语中通常放在动词前面（而非后面）。如：Lo veo = 我看到它/他。当有不定式或命令式时，可附在动词后面。` },
    gerund:      { title:'进行体 (Gerundio)', icon:'🔃',
      explain:()=>'西班牙语用 estar + 现在分词（-ando/-iendo）构成进行体，类似英语 be doing。如：Estoy comiendo = 我正在吃。' },
    agreement:   { title:'性数一致 (Concordancia)', icon:'🔗',
      explain:()=>'西班牙语的形容词、冠词必须与名词在性（阳/阴）和数（单/复）上保持一致。如：las casas blancas（阴性复数）。' },
  };

  const GUSTAR_VERBS = new Set([
    'gustar','encantar','importar','interesar','molestar',
    'parecer','quedar','faltar','doler','apetecer',
  ]);

  const SER_FORMS = new Set([
    'soy','eres','es','somos','sois','son',
    'era','eras','éramos','erais','eran',
    'fui','fuiste','fue','fuimos','fuisteis','fueron',
    'ser','sido','siendo',
  ]);

  const ESTAR_FORMS = new Set([
    'estoy','estás','está','estamos','estáis','están',
    'estaba','estabas','estábamos','estabais','estaban',
    'estuve','estuviste','estuvo','estuvimos','estuvisteis','estuvieron',
    'estar','estado','estando',
  ]);

  /**
   * Main analysis entry point.
   */
  function analyzeSentence(tokens) {
    const result = tokens.map(t => ({ ...t, role: null, notes: [], clauseId: 0, clauseType: 'main' }));
    const sentenceNotes = [];

    // ── Pass 0: Clause boundary detection (improved) ──
    let clauseId = 0;
    const clauses = [{ id: 0, type: 'main', startIdx: 0, endIdx: result.length - 1, depth: 0, connector: '', zh: '主句' }];
    const clauseStack = [0]; // stack of active clauseIds
    const consumed = new Set(); // indices consumed by multi-word subordinators

    function wordsAt(start, count) {
      const out = [];
      let idx = start;
      while (out.length < count && idx < result.length) {
        out.push((result[idx].surface || '').toLowerCase());
        idx++;
      }
      return out;
    }

    for (let i = 0; i < result.length; i++) {
      if (consumed.has(i)) continue;
      const lower = (result[i].surface || '').toLowerCase();

      // Try multi-word subordinators first (greedy longest match)
      let matched = null;
      for (const ms of MULTI_SUBORDINATORS) {
        const words = wordsAt(i, ms.words.length);
        if (words.length === ms.words.length && words.every((w, k) => w === ms.words[k])) {
          matched = { ...ms, wordCount: ms.words.length, connectorText: ms.words.join(' ') };
          break;
        }
      }

      // Try single-word subordinators
      if (!matched && SINGLE_SUBORDINATORS[lower]) {
        const info = SINGLE_SUBORDINATORS[lower];
        let resolvedType = info.type;
        let resolvedZh = info.zh;

        // Disambiguate "que"
        if (lower === 'que') {
          const prev = findPrevNonPunct(result, i);
          if (prev) {
            const prevLower = (prev.surface || '').toLowerCase();
            const prevLemma = (prev.lemma || '').toLowerCase();
            if (prev.pos === 'Noun' || prev.pos === 'Pronoun') {
              resolvedType = 'relative';
              resolvedZh = '关系从句（修饰前面的名词）';
            } else if (prev.pos === 'Verb' || COMPLEMENT_TRIGGERS.has(prevLower) || COMPLEMENT_TRIGGERS.has(prevLemma)) {
              resolvedType = 'complement';
              resolvedZh = '补语从句（动词的宾语）';
            } else if (prev.pos === 'Adjective' || COMPLEMENT_TRIGGERS.has(prevLower)) {
              resolvedType = 'complement';
              resolvedZh = '补语从句';
            } else {
              resolvedType = 'complement';
              resolvedZh = '补语从句';
            }
          }
        }

        // "si" at sentence start is usually conditional
        if (lower === 'si' && i === 0) {
          resolvedType = 'conditional';
          resolvedZh = '条件从句（如果）';
        }

        // "como" at sentence start can be causal ("since")
        if (lower === 'como' && i === 0) {
          resolvedType = 'causal';
          resolvedZh = '原因从句（由于）';
        }

        matched = { type: resolvedType, zh: resolvedZh, wordCount: 1, connectorText: lower };
      }

      if (matched) {
        clauseId++;
        const parentId = clauseStack[clauseStack.length - 1];
        const parentDepth = clauses[parentId]?.depth || 0;
        const clauseInfo = {
          id: clauseId, type: matched.type,
          startIdx: i, endIdx: -1,
          depth: parentDepth + 1,
          parentId,
          connector: matched.connectorText,
          zh: matched.zh || CLAUSE_TYPE_ZH[matched.type] || matched.type,
        };
        clauses.push(clauseInfo);
        clauseStack.push(clauseId);

        // Mark connector tokens
        for (let k = 0; k < matched.wordCount; k++) {
          result[i + k].clauseId = clauseId;
          result[i + k].clauseType = matched.type;
          result[i + k].isClauseConnector = true;
          consumed.add(i + k);
        }
        i += matched.wordCount - 1;
        continue;
      }

      // Closing: comma or semicolon may close the deepest subordinate clause
      if (result[i].pos === 'Punctuation' && [',', ';'].includes(result[i].surface)) {
        if (clauseStack.length > 1) {
          const topId = clauseStack[clauseStack.length - 1];
          const topClause = clauses[topId];
          // Close subordinate clause at punctuation if it has at least a verb in it
          let hasVerb = false;
          for (let k = topClause.startIdx; k <= i; k++) {
            if (result[k].pos === 'Verb') { hasVerb = true; break; }
          }
          if (hasVerb) {
            topClause.endIdx = i;
            clauseStack.pop();
          }
        }
      }

      // Assign current token to deepest active clause
      const currentClauseId = clauseStack[clauseStack.length - 1];
      if (currentClauseId > 0 && !consumed.has(i)) {
        result[i].clauseId = currentClauseId;
        result[i].clauseType = clauses[currentClauseId].type;
      }
    }

    // Close any remaining open clauses
    for (const cid of clauseStack) {
      if (clauses[cid].endIdx === -1) clauses[cid].endIdx = result.length - 1;
    }

    // Set endIdx for main clause
    clauses[0].endIdx = result.length - 1;

    // ── Pass 1: Assign basic roles ──
    let foundVerb = false;
    let foundSubject = false;

    for (let i = 0; i < result.length; i++) {
      const t = result[i];
      const lower = (t.surface || '').toLowerCase();
      const lemma = (t.lemma || '').toLowerCase();

      if (t.pos === 'Punctuation') { t.role = Role.PUNCT; continue; }
      if (t.pos === 'Conjunction' || CONJUNCTIONS.has(lower)) { t.role = Role.CONJ; continue; }
      if (t.pos === 'Preposition' || PREPOSITIONS.has(lower)) { t.role = Role.PREP; continue; }
      if (t.pos === 'Determiner') { t.role = Role.DET; continue; }

      if (!foundVerb && (DIRECT_OBJ_PRONOUNS.has(lower) || INDIRECT_OBJ_PRONOUNS.has(lower) || REFLEXIVE_PRONOUNS.has(lower))) {
        const nw = findNextWord(result, i);
        if (nw && nw.pos === 'Verb') {
          const verbLemma = (nw.lemma || nw.surface).toLowerCase().replace(/se$/, '');
          const isRefl = lower === 'se' || (REFLEXIVE_PRONOUNS.has(lower) && KNOWN_REFLEXIVE_VERBS.has(verbLemma));

          if (isRefl) {
            t.role = Role.REFL; t.cliticType = 'reflexive'; t.notes.push('reflexive');
          } else if (lower === 'le' || lower === 'les') {
            t.role = Role.IOBJ; t.cliticType = 'indirect'; t.notes.push('clitic');
          } else if (lower === 'lo' || lower === 'la' || lower === 'los' || lower === 'las') {
            t.role = Role.OBJ; t.cliticType = 'direct'; t.notes.push('clitic');
          } else {
            // me/te/nos/os: indirect if there's a separate direct object, else direct
            const hasNounObj = result.some((tok, j) => j !== i && j > i && tok.pos === 'Noun' && tok.role !== Role.SUBJ);
            if (hasNounObj) {
              t.role = Role.IOBJ; t.cliticType = 'indirect'; t.notes.push('clitic');
            } else {
              t.role = Role.OBJ; t.cliticType = 'direct'; t.notes.push('clitic');
            }
          }
          continue;
        }
      }

      if (t.pos === 'Verb') {
        if (!foundVerb) {
          if (AUX_VERBS.has(lemma)) {
            const nw = findNextWord(result, i);
            t.role = (nw && (nw.pos === 'Verb' || isInfinitive(nw.surface))) ? Role.AUX : Role.PRED;
          } else { t.role = Role.PRED; }
          if (t.role === Role.PRED) { foundVerb = true; }
        } else { t.role = Role.PRED; }
        continue;
      }

      if (!foundVerb) {
        if (TEMPORAL_NOUNS.has(lower)) { t.role = Role.MOD; }
        else if (t.pos === 'Noun' || t.pos === 'Pronoun') { t.role = Role.SUBJ; foundSubject = true; }
        else if (t.pos === 'Adjective' || t.pos === 'Adverb' || t.pos === 'Number') { t.role = Role.MOD; }
        else { t.role = Role.SUBJ; }
        continue;
      }

      if (t.pos === 'Noun' || t.pos === 'Pronoun') {
        const prev = findPrevWord(result, i);
        const isTemporal = TEMPORAL_NOUNS.has(lower) ||
          (prev && TEMPORAL_MARKERS.has((prev.surface || '').toLowerCase()) && TEMPORAL_NOUNS.has(lower));
        if (isTemporal) {
          t.role = Role.MOD;
          if (prev && prev.role === Role.DET && TEMPORAL_MARKERS.has((prev.surface || '').toLowerCase())) {
            prev.role = Role.MOD;
          }
        } else if (prev && (prev.role === Role.PREP || prev.role === Role.OBJ || prev.role === Role.COMP)) {
          t.role = Role.COMP;
        } else {
          t.role = Role.OBJ;
        }
      } else if (t.pos === 'Adjective') {
        const prev = findPrevWord(result, i);
        t.role = (prev && (prev.pos === 'Verb' || SER_FORMS.has((prev.surface||'').toLowerCase()) || ESTAR_FORMS.has((prev.surface||'').toLowerCase()))) ? Role.COMP : Role.MOD;
      } else if (t.pos === 'Adverb' || t.pos === 'Number') { t.role = Role.MOD; }
      else { t.role = Role.COMP; }
    }

    // ── Pass 2: Grammar notes ──
    for (let i = 0; i < result.length; i++) {
      const t = result[i];
      const lower = (t.surface || '').toLowerCase();
      const lemma = (t.lemma || '').toLowerCase();

      if (t.role === Role.REFL) {
        const verb = findNextWord(result, i);
        if (verb) sentenceNotes.push({ type:'reflexive', indices:[i], note:GRAMMAR_NOTES.reflexive, context:verb.surface });
      }
      if (t.pos === 'Verb' && (SER_FORMS.has(lower) || ESTAR_FORMS.has(lower))) {
        sentenceNotes.push({ type:'ser_estar', indices:[i], note:GRAMMAR_NOTES.ser_estar, context:lower });
      }
      if (lower === 'por' || lower === 'para') {
        sentenceNotes.push({ type:'por_para', indices:[i], note:GRAMMAR_NOTES.por_para, context:lower });
      }
      if (lower === 'a' && t.role === Role.PREP) {
        const next = findNextWord(result, i);
        if (next && (next.pos === 'Noun' || next.pos === 'Pronoun') && isLikelyPerson(next))
          sentenceNotes.push({ type:'personal_a', indices:[i], note:GRAMMAR_NOTES.personal_a, context:next.surface });
      }
      if (t.pos === 'Verb' && GUSTAR_VERBS.has(lemma)) {
        sentenceNotes.push({ type:'gustar', indices:[i], note:GRAMMAR_NOTES.gustar, context:t.surface });
      }
      if (t.notes.includes('clitic')) {
        sentenceNotes.push({ type:'clitic', indices:[i], note:GRAMMAR_NOTES.clitic, context:t.surface });
      }
      if (t.pos === 'Verb' && ESTAR_FORMS.has(lower)) {
        const next = findNextWord(result, i);
        if (next && next.pos === 'Verb' && /(?:ando|iendo)$/i.test(next.surface))
          sentenceNotes.push({ type:'gerund', indices:[i], note:GRAMMAR_NOTES.gerund, context:`${t.surface} ${next.surface}` });
      }
    }

    // ── Pass 3: Sentence pattern recognition ──
    const matchedPatterns = [];
    for (const pat of PATTERNS) {
      if (pat.test(result)) {
        matchedPatterns.push({ id: pat.id, name: pat.name, skeleton: pat.skeleton, zh: pat.zh });
      }
    }

    return { tokens: result, sentenceNotes, clauses, matchedPatterns };
  }

  // ── Helpers ──
  function findNextWord(tokens, fromIndex) {
    for (let j = fromIndex + 1; j < tokens.length; j++) { if (tokens[j].pos !== 'Punctuation') return tokens[j]; }
    return null;
  }
  function findPrevWord(tokens, fromIndex) {
    for (let j = fromIndex - 1; j >= 0; j--) { if (tokens[j].pos !== 'Punctuation') return tokens[j]; }
    return null;
  }
  function findPrevNonPunct(tokens, fromIndex) {
    for (let j = fromIndex - 1; j >= 0; j--) { if (tokens[j].pos !== 'Punctuation') return tokens[j]; }
    return null;
  }
  function isInfinitive(word) { return /(?:ar|er|ir|arse|erse|irse)$/i.test(word || ''); }
  function isLikelyPerson(token) {
    const tags = token.rawTags || [];
    if (tags.some(t => ['Person','ProperNoun','FirstName','LastName'].includes(t))) return true;
    const s = (token.surface || '');
    return s[0] === s[0]?.toUpperCase() && s.length > 1 && !/^[¿¡]/.test(s);
  }

  window.SpanishGrammar = Object.freeze({
    Role, ROLE_LABELS, GRAMMAR_NOTES, analyzeSentence,
    PREPOSITIONS, CONJUNCTIONS, SER_FORMS, ESTAR_FORMS, REFLEXIVE_PRONOUNS,
    CLAUSE_TYPE_ZH, CLAUSE_TYPE_COLORS, PATTERNS,
  });
})();
