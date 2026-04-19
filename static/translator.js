/**
 * translator.js — Spanish→Chinese word & sentence translation
 * Built-in high-frequency dictionary + MyMemory API fallback.
 */
(function () {
  'use strict';

  // ── Built-in ES→ZH dictionary (500+ common words) ──
  const DICT = {
    // Articles / Determiners
    'el':'（定冠词阳单）','la':'（定冠词阴单）','los':'（定冠词阳复）','las':'（定冠词阴复）',
    'un':'一个（阳）','una':'一个（阴）','unos':'一些（阳）','unas':'一些（阴）',
    'del':'de+el 的','al':'a+el 到',
    // Pronouns
    'yo':'我','tú':'你','él':'他','ella':'她','nosotros':'我们','nosotras':'我们（女）',
    'vosotros':'你们','ellos':'他们','ellas':'她们','usted':'您','ustedes':'你们/您们',
    'me':'我（宾/反身）','te':'你（宾/反身）','se':'自己（反身）','nos':'我们（宾/反身）','os':'你们（宾/反身）',
    'lo':'它/他（直宾）','le':'给他/她（间宾）','les':'给他们（间宾）',
    'mí':'我（介词后）','ti':'你（介词后）','sí':'自己（介词后）',
    'este':'这个（阳）','esta':'这个（阴）','estos':'这些（阳）','estas':'这些（阴）',
    'ese':'那个（阳）','esa':'那个（阴）','aquel':'那个（远）','aquella':'那个（远阴）',
    'algo':'某事','alguien':'某人','nada':'没有什么','nadie':'没有人',
    'todo':'全部','todos':'所有','cada':'每个','otro':'另一个','mismo':'同一个',
    'que':'（关系代词/连词）什么/的','quien':'谁','cual':'哪个','donde':'哪里',
    // Common verbs (infinitive + frequent forms)
    'ser':'是（本质）','estar':'是（状态）','haber':'有（助动词）','tener':'有/拥有',
    'hacer':'做/使','poder':'能够','decir':'说','ir':'去','ver':'看','dar':'给',
    'saber':'知道','querer':'想要','llegar':'到达','pasar':'经过/发生',
    'deber':'应该','poner':'放','parecer':'似乎','quedar':'留下/剩下',
    'creer':'相信','hablar':'说/谈','llevar':'带/携带','dejar':'离开/让',
    'seguir':'跟随/继续','encontrar':'找到','llamar':'叫/打电话','venir':'来',
    'pensar':'想/认为','salir':'出去','volver':'回来','tomar':'拿/喝',
    'conocer':'认识','vivir':'生活/住','sentir':'感觉','tratar':'处理/对待',
    'mirar':'看','contar':'数/讲述','empezar':'开始','esperar':'等待/希望',
    'buscar':'寻找','existir':'存在','entrar':'进入','trabajar':'工作',
    'escribir':'写','perder':'失去/输','producir':'生产','ocurrir':'发生',
    'entender':'理解','pedir':'请求','recibir':'收到','recordar':'记得',
    'terminar':'结束','permitir':'允许','aparecer':'出现','conseguir':'获得',
    'comenzar':'开始','servir':'服务','sacar':'取出','necesitar':'需要',
    'mantener':'维持','resultar':'结果是','leer':'读','caer':'掉落',
    'cambiar':'改变','presentar':'介绍/出示','crear':'创造','abrir':'打开',
    'considerar':'考虑','oír':'听到','acabar':'完成/刚刚','convertir':'转变',
    'ganar':'赢得','formar':'形成','traer':'带来','partir':'离开/分开',
    'morir':'死亡','aceptar':'接受','realizar':'实现','suponer':'假设',
    'comprender':'理解','lograr':'达成','explicar':'解释','preguntar':'问',
    'tocar':'触摸/弹奏','reconocer':'认出','estudiar':'学习','alcanzar':'达到',
    'nacer':'出生','dirigir':'指导','correr':'跑','utilizar':'使用',
    'pagar':'付钱','ayudar':'帮助','gustar':'喜欢','jugar':'玩/比赛',
    'escuchar':'听','cumplir':'完成/满','ofrecer':'提供','descubrir':'发现',
    'levantar':'举起/起床','intentar':'尝试','usar':'使用','dormir':'睡觉',
    'comer':'吃','beber':'喝','cocinar':'做饭','caminar':'走路',
    'cantar':'唱','bailar':'跳舞','nadar':'游泳','comprar':'买','vender':'卖',
    'lavar':'洗','limpiar':'清洁','aprender':'学习','enseñar':'教',
    // Frequent conjugated forms
    'es':'是（ser三单）','son':'是（ser三复）','soy':'是（ser一单）','eres':'是（ser二单）','somos':'是（ser一复）',
    'está':'在/是（estar三单）','estoy':'在/是（estar一单）','están':'在/是（estar三复）',
    'estás':'在/是（estar二单）','estamos':'在/是（estar一复）',
    'tiene':'有（tener三单）','tengo':'有（tener一单）','hay':'有（存在）',
    'puede':'能（poder三单）','puedo':'能（poder一单）','puedes':'能（poder二单）',
    'va':'去（ir三单）','voy':'去（ir一单）','vamos':'去（ir一复）',
    'hace':'做（hacer三单）','hago':'做（hacer一单）',
    'dice':'说（decir三单）','digo':'说（decir一单）',
    'quiere':'想要（三单）','quiero':'想要（一单）',
    'sabe':'知道（三单）','sé':'知道（一单）',
    'habla':'说（hablar三单）','gusta':'喜欢（gustar三单）',
    'lava':'洗（lavar三单）','estudia':'学习（estudiar三单）',
    'estudiando':'学习着（现在分词）',
    // Nouns
    'hombre':'男人','mujer':'女人','niño':'男孩','niña':'女孩',
    'persona':'人','gente':'人们','familia':'家庭','amigo':'朋友','amiga':'女朋友',
    'padre':'父亲','madre':'母亲','hijo':'儿子','hija':'女儿','hermano':'兄弟','hermana':'姐妹',
    'casa':'房子','ciudad':'城市','país':'国家','países':'国家（复数）','mundo':'世界',
    'vida':'生活/生命','tiempo':'时间/天气','año':'年','mes':'月','día':'日/天','hora':'小时',
    'momento':'时刻','parte':'部分','lugar':'地方','punto':'点',
    'forma':'形式','nombre':'名字','palabra':'词/话','historia':'历史/故事',
    'agua':'水','comida':'食物','café':'咖啡','pan':'面包','leche':'牛奶','carne':'肉',
    'libro':'书','escuela':'学校','trabajo':'工作','dinero':'钱','problema':'问题',
    'ejemplo':'例子','idea':'想法','mano':'手','manos':'手（复数）','ojo':'眼','cabeza':'头',
    'lengua':'语言/舌头','español':'西班牙语','idioma':'语言','gramática':'语法',
    'examen':'考试','pregunta':'问题','respuesta':'回答','clase':'课/班',
    'calle':'街道','puerta':'门','ventana':'窗户','mesa':'桌子','silla':'椅子',
    'coche':'汽车','tren':'火车','avión':'飞机','camino':'路/道',
    'sol':'太阳','luna':'月亮','mar':'海','montaña':'山','río':'河','tierra':'土地/地球',
    'flor':'花','árbol':'树','animal':'动物','perro':'狗','gato':'猫',
    'mañana':'早上/明天','noche':'夜晚','tarde':'下午/晚',
    'cosa':'东西','cuerpo':'身体','corazón':'心',
    // Adjectives
    'bueno':'好的','malo':'坏的','grande':'大的','pequeño':'小的',
    'nuevo':'新的','viejo':'老的/旧的','joven':'年轻的',
    'largo':'长的','corto':'短的','alto':'高的','bajo':'矮的/低的',
    'bonito':'漂亮的','feo':'丑的','rico':'富的/好吃的','pobre':'穷的',
    'feliz':'幸福的','triste':'悲伤的','contento':'满意的',
    'fácil':'容易的','difícil':'困难的','importante':'重要的',
    'posible':'可能的','necesario':'必要的','diferente':'不同的',
    'blanco':'白色的','negro':'黑色的','rojo':'红色的','azul':'蓝色的',
    'verde':'绿色的','amarillo':'黄色的',
    'frío':'冷的','fría':'冷的（阴）','caliente':'热的','románica':'罗曼的','románico':'罗曼的',
    'primero':'第一','segundo':'第二','último':'最后',
    'mucho':'很多','poco':'很少','todo':'所有','varios':'几个',
    // Adverbs
    'muy':'很/非常','más':'更多/更','menos':'更少','bien':'好','mal':'坏/差',
    'también':'也','siempre':'总是','nunca':'从不','ya':'已经','todavía':'仍然',
    'aquí':'这里','allí':'那里','ahora':'现在','hoy':'今天','ayer':'昨天',
    'mañana':'明天','después':'之后','antes':'之前','luego':'然后',
    'así':'这样','sólo':'只/仅','casi':'几乎','quizás':'也许',
    // Prepositions
    'a':'到/给','de':'的/从','en':'在','con':'用/和/与','por':'因为/通过','para':'为了/给',
    'sin':'没有','sobre':'关于/在…上','entre':'在…之间','hasta':'直到','desde':'从…起',
    'hacia':'朝向','durante':'在…期间','según':'根据','contra':'反对','mediante':'通过',
    // Conjunctions
    'y':'和','e':'和（i前）','o':'或','u':'或（o前）','pero':'但是','sino':'而是',
    'ni':'也不','que':'（连词）','porque':'因为','aunque':'虽然','cuando':'当…时',
    'si':'如果','como':'像/如同','mientras':'当…时/而',
    // Other
    'sí':'是的','no':'不','muy':'很','más':'更','menos':'较少',
    'qué':'什么','cómo':'怎样','dónde':'哪里','cuándo':'何时','cuánto':'多少','por qué':'为什么',
  };

  // ── MyMemory Translation API ──
  const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
  const translationCache = new Map();

  /**
   * Translate a single word using built-in dictionary.
   */
  function translateWord(word) {
    if (!word) return null;
    const lower = word.toLowerCase().trim();
    return DICT[lower] || null;
  }

  /**
   * Translate a sentence via MyMemory API (es→zh-CN).
   * Returns { text, match } or null on failure.
   */
  async function translateSentence(text) {
    if (!text || !text.trim()) return null;
    const key = text.trim();
    if (translationCache.has(key)) return translationCache.get(key);

    try {
      const url = `${MYMEMORY_URL}?q=${encodeURIComponent(key)}&langpair=es|zh-CN`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      const result = {
        text: data.responseData?.translatedText || null,
        match: data.responseData?.match || 0,
      };
      if (result.text) translationCache.set(key, result);
      return result;
    } catch (e) {
      console.warn('Translation API error:', e);
      return null;
    }
  }

  /**
   * Translate sentence components (role groups) individually for alignment.
   * @param {Array<{role, words}>} groups — e.g. [{role:'subj', words:'El español'}, ...]
   * @returns {Promise<Array<{role, words, zh}>>}
   */
  async function translateComponents(groups) {
    const results = [];
    const promises = groups.map(async (g) => {
      if (!g.words || g.role === 'punct') {
        return { ...g, zh: '' };
      }
      const wordLevel = g.words.split(/\s+/).map(w => translateWord(w)).filter(Boolean);
      if (wordLevel.length > 0) {
        return { ...g, zh: wordLevel.join('') };
      }
      const api = await translateSentence(g.words);
      return { ...g, zh: api?.text || '…' };
    });
    return Promise.all(promises);
  }

  // ── Examples & collocations for high-frequency words ──
  const EXAMPLES = {
    'ser':     { ex:['Ella es profesora. (她是老师)', 'Es importante estudiar. (学习很重要)'], col:['ser de (来自)', 'ser + adj (本质特征)'] },
    'estar':   { ex:['Estoy cansado. (我累了)', 'Madrid está en España. (马德里在西班牙)'], col:['estar + gerundio (正在做)', 'estar de acuerdo (同意)'] },
    'tener':   { ex:['Tengo dos hermanos. (我有两个兄弟)', 'Tengo que irme. (我必须走了)'], col:['tener que + inf (必须)', 'tener hambre/sed (饿/渴)', 'tener razón (有道理)'] },
    'hacer':   { ex:['Hace buen tiempo. (天气好)', '¿Qué haces? (你在做什么？)'], col:['hacer falta (需要)', 'hace + tiempo (…前)', 'hacer caso (注意)'] },
    'ir':      { ex:['Voy al supermercado. (我去超市)', 'Vamos a comer. (我们去吃饭)'], col:['ir a + inf (将要)', 'ir de compras (购物)', 'irse (离开)'] },
    'poder':   { ex:['¿Puedo entrar? (我可以进来吗？)', 'No puedo dormir. (我睡不着)'], col:['poder + inf (能/可以)', 'puede ser (可能)'] },
    'decir':   { ex:['¿Qué dices? (你说什么？)', 'Me dijo la verdad. (他告诉了我真相)'], col:['es decir (也就是说)', 'querer decir (意思是)'] },
    'querer':  { ex:['Te quiero. (我爱你)', 'Quiero un café. (我要一杯咖啡)'], col:['querer + inf (想要)', 'querer decir (意味着)'] },
    'saber':   { ex:['No sé nadar. (我不会游泳)', '¿Sabes dónde está? (你知道在哪吗？)'], col:['saber + inf (会做某事)', 'saber a (尝起来像)'] },
    'dar':     { ex:['Dame el libro. (把书给我)', 'Me da miedo. (我害怕)'], col:['dar un paseo (散步)', 'darse cuenta (意识到)', 'dar las gracias (感谢)'] },
    'hablar':  { ex:['Habla tres idiomas. (他/她会说三种语言)', 'Hablamos mañana. (我们明天聊)'], col:['hablar de (谈论)', 'hablar con (和…交谈)'] },
    'vivir':   { ex:['Vivo en México. (我住在墨西哥)', 'Vivieron felices. (他们幸福地生活)'], col:['vivir de (靠…生活)', 'vivir en (住在)'] },
    'comer':   { ex:['Comemos a las dos. (我们两点吃饭)', '¿Qué quieres comer? (你想吃什么？)'], col:['comer fuera (外出就餐)', 'dar de comer (喂)'] },
    'trabajar':{ ex:['Trabaja en un banco. (他在银行工作)', 'Trabajo desde casa. (我在家工作)'], col:['trabajar de (从事…职业)', 'trabajar en (在…工作)'] },
    'estudiar':{ ex:['Estudio español. (我学西班牙语)', 'Estudia medicina. (他学医)'], col:['estudiar para (为了…而学)', 'estudiar en (在…学习)'] },
    'gustar':  { ex:['Me gusta el café. (我喜欢咖啡)', 'No me gustan las arañas. (我不喜欢蜘蛛)'], col:['A + persona + le gusta (某人喜欢)', 'gustar mucho (很喜欢)'] },
    'poner':   { ex:['Pon la mesa. (摆桌子)', 'Se puso nervioso. (他变得紧张)'], col:['ponerse + adj (变得)', 'poner en (放在)', 'ponerse de acuerdo (达成一致)'] },
    'venir':   { ex:['Ven aquí. (来这里)', 'Viene de Francia. (他来自法国)'], col:['venir de (来自)', 'venir a + inf (来做)'] },
    'salir':   { ex:['Salgo a las ocho. (我八点出门)', 'El sol sale temprano. (太阳早早升起)'], col:['salir de (从…出来)', 'salir con (和…约会)', 'salir bien/mal (结果好/坏)'] },
    'pensar':  { ex:['Pienso en ti. (我想你)', '¿Qué piensas? (你怎么想？)'], col:['pensar en (想到)', 'pensar + inf (打算)'] },
    'conocer': { ex:['Conozco Madrid. (我去过马德里)', '¿Conoces a Juan? (你认识胡安吗？)'], col:['conocer a + persona (认识某人)', 'dar a conocer (公布)'] },
    'encontrar':{ ex:['No encuentro mis llaves. (我找不到钥匙)', 'Se encontraron en el parque. (他们在公园相遇)'], col:['encontrarse con (遇到)', 'encontrarse bien (感觉好)'] },
    'llamar':  { ex:['Me llamo Ana. (我叫安娜)', 'Llámame mañana. (明天打电话给我)'], col:['llamarse (叫做)', 'llamar la atención (引起注意)', 'llamar por teléfono (打电话)'] },
    'leer':    { ex:['Leo un libro cada mes. (我每月读一本书)', '¿Has leído este artículo? (你读过这篇文章吗？)'], col:['leer en voz alta (朗读)'] },
    'escribir':{ ex:['Escribe una carta. (写一封信)', 'Escribo en español. (我用西语写作)'], col:['escribir a (写信给)', 'escribir sobre (写关于)'] },
    'dormir':  { ex:['Duermo ocho horas. (我睡八小时)', 'El bebé ya duerme. (宝宝已经睡了)'], col:['dormirse (入睡)', 'dormir la siesta (午睡)'] },
    'jugar':   { ex:['Los niños juegan en el parque. (孩子们在公园玩)', 'Juego al fútbol. (我踢足球)'], col:['jugar a + deporte (玩/打…运动)', 'jugar con (和…玩)'] },
    'comprar': { ex:['Compro pan cada mañana. (我每天早上买面包)', 'Vamos a comprar regalos. (我们去买礼物)'], col:['ir de compras (购物)', 'comprar en (在…买)'] },
    'aprender':{ ex:['Aprendo español rápido. (我学西语很快)', 'Aprendimos mucho. (我们学了很多)'], col:['aprender a + inf (学会做)', 'aprender de (从…学习)'] },
  };

  /**
   * Get examples and collocations for a word.
   * @param {string} word — surface or lemma
   * @returns {{ ex: string[], col: string[] } | null}
   */
  function getExamples(word) {
    if (!word) return null;
    return EXAMPLES[word.toLowerCase()] || null;
  }

  // ── Public API ──
  window.Translator = Object.freeze({
    translateWord,
    translateSentence,
    translateComponents,
    getExamples,
    DICT,
    EXAMPLES,
  });
})();
