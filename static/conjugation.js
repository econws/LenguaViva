/**
 * conjugation.js — Spanish verb conjugation engine
 * Rule-based conjugation for -ar/-er/-ir verbs + 50 irregular verb tables.
 * Given a surface form + lemma, identifies tense, person, mood.
 */
(function () {
  'use strict';

  const PERSONS = ['1s','2s','3s','1p','2p','3p'];
  const PERSON_ZH = {
    '1s':'第一人称单数','2s':'第二人称单数','3s':'第三人称单数',
    '1p':'第一人称复数','2p':'第二人称复数','3p':'第三人称复数',
  };

  const TENSE_ZH = {
    pres:'现在时', pret:'简单过去时', imperf:'未完成过去时',
    fut:'将来时', cond:'条件式', presSub:'现在虚拟式',
    imperfSub:'过去虚拟式', imp:'命令式',
    gerund:'现在分词', pastPart:'过去分词',
  };

  const MOOD_ZH = {
    ind:'陈述式', sub:'虚拟式', imp:'命令式', nonfinite:'非限定',
  };

  // ── Regular endings ──
  const REG = {
    ar: {
      pres:     ['o','as','a','amos','áis','an'],
      pret:     ['é','aste','ó','amos','asteis','aron'],
      imperf:   ['aba','abas','aba','ábamos','abais','aban'],
      fut:      ['aré','arás','ará','aremos','aréis','arán'],
      cond:     ['aría','arías','aría','aríamos','aríais','arían'],
      presSub:  ['e','es','e','emos','éis','en'],
      imperfSub:['ara','aras','ara','áramos','arais','aran'],
      imp:      ['—','a','e','emos','ad','en'],
      gerund:   'ando', pastPart: 'ado',
    },
    er: {
      pres:     ['o','es','e','emos','éis','en'],
      pret:     ['í','iste','ió','imos','isteis','ieron'],
      imperf:   ['ía','ías','ía','íamos','íais','ían'],
      fut:      ['eré','erás','erá','eremos','eréis','erán'],
      cond:     ['ería','erías','ería','eríamos','eríais','erían'],
      presSub:  ['a','as','a','amos','áis','an'],
      imperfSub:['iera','ieras','iera','iéramos','ierais','ieran'],
      imp:      ['—','e','a','amos','ed','an'],
      gerund:   'iendo', pastPart: 'ido',
    },
    ir: {
      pres:     ['o','es','e','imos','ís','en'],
      pret:     ['í','iste','ió','imos','isteis','ieron'],
      imperf:   ['ía','ías','ía','íamos','íais','ían'],
      fut:      ['iré','irás','irá','iremos','iréis','irán'],
      cond:     ['iría','irías','iría','iríamos','iríais','irían'],
      presSub:  ['a','as','a','amos','áis','an'],
      imperfSub:['iera','ieras','iera','iéramos','ierais','ieran'],
      imp:      ['—','e','a','amos','id','an'],
      gerund:   'iendo', pastPart: 'ido',
    },
  };

  // ── Irregular verb tables (50 verbs) ──
  // Each entry maps tense -> [6 persons] or special forms.
  // Only tenses that differ from regular are listed.
  const IRREG = {
    ser: {
      pres:['soy','eres','es','somos','sois','son'],
      pret:['fui','fuiste','fue','fuimos','fuisteis','fueron'],
      imperf:['era','eras','era','éramos','erais','eran'],
      presSub:['sea','seas','sea','seamos','seáis','sean'],
      imperfSub:['fuera','fueras','fuera','fuéramos','fuerais','fueran'],
      imp:['—','sé','sea','seamos','sed','sean'],
      gerund:'siendo', pastPart:'sido',
    },
    estar: {
      pres:['estoy','estás','está','estamos','estáis','están'],
      pret:['estuve','estuviste','estuvo','estuvimos','estuvisteis','estuvieron'],
      presSub:['esté','estés','esté','estemos','estéis','estén'],
      imperfSub:['estuviera','estuvieras','estuviera','estuviéramos','estuvierais','estuvieran'],
      gerund:'estando', pastPart:'estado',
    },
    haber: {
      pres:['he','has','ha','hemos','habéis','han'],
      pret:['hube','hubiste','hubo','hubimos','hubisteis','hubieron'],
      fut:['habré','habrás','habrá','habremos','habréis','habrán'],
      cond:['habría','habrías','habría','habríamos','habríais','habrían'],
      presSub:['haya','hayas','haya','hayamos','hayáis','hayan'],
      gerund:'habiendo', pastPart:'habido',
    },
    tener: {
      pres:['tengo','tienes','tiene','tenemos','tenéis','tienen'],
      pret:['tuve','tuviste','tuvo','tuvimos','tuvisteis','tuvieron'],
      fut:['tendré','tendrás','tendrá','tendremos','tendréis','tendrán'],
      cond:['tendría','tendrías','tendría','tendríamos','tendríais','tendrían'],
      presSub:['tenga','tengas','tenga','tengamos','tengáis','tengan'],
      imp:['—','ten','tenga','tengamos','tened','tengan'],
      gerund:'teniendo', pastPart:'tenido',
    },
    hacer: {
      pres:['hago','haces','hace','hacemos','hacéis','hacen'],
      pret:['hice','hiciste','hizo','hicimos','hicisteis','hicieron'],
      fut:['haré','harás','hará','haremos','haréis','harán'],
      cond:['haría','harías','haría','haríamos','haríais','harían'],
      presSub:['haga','hagas','haga','hagamos','hagáis','hagan'],
      imp:['—','haz','haga','hagamos','haced','hagan'],
      pastPart:'hecho',
    },
    ir: {
      pres:['voy','vas','va','vamos','vais','van'],
      pret:['fui','fuiste','fue','fuimos','fuisteis','fueron'],
      imperf:['iba','ibas','iba','íbamos','ibais','iban'],
      presSub:['vaya','vayas','vaya','vayamos','vayáis','vayan'],
      imperfSub:['fuera','fueras','fuera','fuéramos','fuerais','fueran'],
      imp:['—','ve','vaya','vamos','id','vayan'],
      gerund:'yendo', pastPart:'ido',
    },
    poder: {
      pres:['puedo','puedes','puede','podemos','podéis','pueden'],
      pret:['pude','pudiste','pudo','pudimos','pudisteis','pudieron'],
      fut:['podré','podrás','podrá','podremos','podréis','podrán'],
      cond:['podría','podrías','podría','podríamos','podríais','podrían'],
      presSub:['pueda','puedas','pueda','podamos','podáis','puedan'],
      gerund:'pudiendo',
    },
    decir: {
      pres:['digo','dices','dice','decimos','decís','dicen'],
      pret:['dije','dijiste','dijo','dijimos','dijisteis','dijeron'],
      fut:['diré','dirás','dirá','diremos','diréis','dirán'],
      cond:['diría','dirías','diría','diríamos','diríais','dirían'],
      presSub:['diga','digas','diga','digamos','digáis','digan'],
      imp:['—','di','diga','digamos','decid','digan'],
      gerund:'diciendo', pastPart:'dicho',
    },
    venir: {
      pres:['vengo','vienes','viene','venimos','venís','vienen'],
      pret:['vine','viniste','vino','vinimos','vinisteis','vinieron'],
      fut:['vendré','vendrás','vendrá','vendremos','vendréis','vendrán'],
      cond:['vendría','vendrías','vendría','vendríamos','vendríais','vendrían'],
      presSub:['venga','vengas','venga','vengamos','vengáis','vengan'],
      imp:['—','ven','venga','vengamos','venid','vengan'],
      gerund:'viniendo',
    },
    poner: {
      pres:['pongo','pones','pone','ponemos','ponéis','ponen'],
      pret:['puse','pusiste','puso','pusimos','pusisteis','pusieron'],
      fut:['pondré','pondrás','pondrá','pondremos','pondréis','pondrán'],
      cond:['pondría','pondrías','pondría','pondríamos','pondríais','pondrían'],
      presSub:['ponga','pongas','ponga','pongamos','pongáis','pongan'],
      imp:['—','pon','ponga','pongamos','poned','pongan'],
      pastPart:'puesto',
    },
    salir: {
      pres:['salgo','sales','sale','salimos','salís','salen'],
      fut:['saldré','saldrás','saldrá','saldremos','saldréis','saldrán'],
      cond:['saldría','saldrías','saldría','saldríamos','saldríais','saldrían'],
      presSub:['salga','salgas','salga','salgamos','salgáis','salgan'],
      imp:['—','sal','salga','salgamos','salid','salgan'],
    },
    querer: {
      pres:['quiero','quieres','quiere','queremos','queréis','quieren'],
      pret:['quise','quisiste','quiso','quisimos','quisisteis','quisieron'],
      fut:['querré','querrás','querrá','querremos','querréis','querrán'],
      cond:['querría','querrías','querría','querríamos','querríais','querrían'],
      presSub:['quiera','quieras','quiera','queramos','queráis','quieran'],
    },
    saber: {
      pres:['sé','sabes','sabe','sabemos','sabéis','saben'],
      pret:['supe','supiste','supo','supimos','supisteis','supieron'],
      fut:['sabré','sabrás','sabrá','sabremos','sabréis','sabrán'],
      cond:['sabría','sabrías','sabría','sabríamos','sabríais','sabrían'],
      presSub:['sepa','sepas','sepa','sepamos','sepáis','sepan'],
    },
    dar: {
      pres:['doy','das','da','damos','dais','dan'],
      pret:['di','diste','dio','dimos','disteis','dieron'],
      presSub:['dé','des','dé','demos','deis','den'],
    },
    ver: {
      pres:['veo','ves','ve','vemos','veis','ven'],
      pret:['vi','viste','vio','vimos','visteis','vieron'],
      imperf:['veía','veías','veía','veíamos','veíais','veían'],
      presSub:['vea','veas','vea','veamos','veáis','vean'],
      pastPart:'visto',
    },
    conocer: {
      pres:['conozco','conoces','conoce','conocemos','conocéis','conocen'],
      presSub:['conozca','conozcas','conozca','conozcamos','conozcáis','conozcan'],
    },
    traer: {
      pres:['traigo','traes','trae','traemos','traéis','traen'],
      pret:['traje','trajiste','trajo','trajimos','trajisteis','trajeron'],
      presSub:['traiga','traigas','traiga','traigamos','traigáis','traigan'],
      gerund:'trayendo', pastPart:'traído',
    },
    caer: {
      pres:['caigo','caes','cae','caemos','caéis','caen'],
      pret:['caí','caíste','cayó','caímos','caísteis','cayeron'],
      presSub:['caiga','caigas','caiga','caigamos','caigáis','caigan'],
      gerund:'cayendo', pastPart:'caído',
    },
    oír: {
      pres:['oigo','oyes','oye','oímos','oís','oyen'],
      pret:['oí','oíste','oyó','oímos','oísteis','oyeron'],
      presSub:['oiga','oigas','oiga','oigamos','oigáis','oigan'],
      gerund:'oyendo', pastPart:'oído',
    },
    dormir: {
      pres:['duermo','duermes','duerme','dormimos','dormís','duermen'],
      pret:['dormí','dormiste','durmió','dormimos','dormisteis','durmieron'],
      presSub:['duerma','duermas','duerma','durmamos','durmáis','duerman'],
      gerund:'durmiendo',
    },
    pedir: {
      pres:['pido','pides','pide','pedimos','pedís','piden'],
      pret:['pedí','pediste','pidió','pedimos','pedisteis','pidieron'],
      presSub:['pida','pidas','pida','pidamos','pidáis','pidan'],
      gerund:'pidiendo',
    },
    sentir: {
      pres:['siento','sientes','siente','sentimos','sentís','sienten'],
      pret:['sentí','sentiste','sintió','sentimos','sentisteis','sintieron'],
      presSub:['sienta','sientas','sienta','sintamos','sintáis','sientan'],
      gerund:'sintiendo',
    },
    pensar: {
      pres:['pienso','piensas','piensa','pensamos','pensáis','piensan'],
      presSub:['piense','pienses','piense','pensemos','penséis','piensen'],
    },
    volver: {
      pres:['vuelvo','vuelves','vuelve','volvemos','volvéis','vuelven'],
      presSub:['vuelva','vuelvas','vuelva','volvamos','volváis','vuelvan'],
      pastPart:'vuelto',
    },
    morir: {
      pres:['muero','mueres','muere','morimos','morís','mueren'],
      pret:['morí','moriste','murió','morimos','moristeis','murieron'],
      presSub:['muera','mueras','muera','muramos','muráis','mueran'],
      gerund:'muriendo', pastPart:'muerto',
    },
    escribir: { pastPart:'escrito' },
    abrir: { pastPart:'abierto' },
    romper: { pastPart:'roto' },
    cubrir: { pastPart:'cubierto' },
    resolver: { pastPart:'resuelto' },
    imprimir: { pastPart:'impreso' },
    freír: { pastPart:'frito', gerund:'friendo' },
    seguir: {
      pres:['sigo','sigues','sigue','seguimos','seguís','siguen'],
      pret:['seguí','seguiste','siguió','seguimos','seguisteis','siguieron'],
      presSub:['siga','sigas','siga','sigamos','sigáis','sigan'],
      gerund:'siguiendo',
    },
    empezar: {
      pres:['empiezo','empiezas','empieza','empezamos','empezáis','empiezan'],
      pret:['empecé','empezaste','empezó','empezamos','empezasteis','empezaron'],
      presSub:['empiece','empieces','empiece','empecemos','empecéis','empiecen'],
    },
    encontrar: {
      pres:['encuentro','encuentras','encuentra','encontramos','encontráis','encuentran'],
      presSub:['encuentre','encuentres','encuentre','encontremos','encontréis','encuentren'],
    },
    contar: {
      pres:['cuento','cuentas','cuenta','contamos','contáis','cuentan'],
      presSub:['cuente','cuentes','cuente','contemos','contéis','cuenten'],
    },
    jugar: {
      pres:['juego','juegas','juega','jugamos','jugáis','juegan'],
      pret:['jugué','jugaste','jugó','jugamos','jugasteis','jugaron'],
      presSub:['juegue','juegues','juegue','juguemos','juguéis','jueguen'],
    },
    llegar: {
      pret:['llegué','llegaste','llegó','llegamos','llegasteis','llegaron'],
      presSub:['llegue','llegues','llegue','lleguemos','lleguéis','lleguen'],
    },
    buscar: {
      pret:['busqué','buscaste','buscó','buscamos','buscasteis','buscaron'],
      presSub:['busque','busques','busque','busquemos','busquéis','busquen'],
    },
    comenzar: {
      pres:['comienzo','comienzas','comienza','comenzamos','comenzáis','comienzan'],
      pret:['comencé','comenzaste','comenzó','comenzamos','comenzasteis','comenzaron'],
      presSub:['comience','comiences','comience','comencemos','comencéis','comiencen'],
    },
    producir: {
      pres:['produzco','produces','produce','producimos','producís','producen'],
      pret:['produje','produjiste','produjo','produjimos','produjisteis','produjeron'],
      presSub:['produzca','produzcas','produzca','produzcamos','produzcáis','produzcan'],
    },
    conducir: {
      pres:['conduzco','conduces','conduce','conducimos','conducís','conducen'],
      pret:['conduje','condujiste','condujo','condujimos','condujisteis','condujeron'],
      presSub:['conduzca','conduzcas','conduzca','conduzcamos','conduzcáis','conduzcan'],
    },
    construir: {
      pres:['construyo','construyes','construye','construimos','construís','construyen'],
      pret:['construí','construiste','construyó','construimos','construisteis','construyeron'],
      presSub:['construya','construyas','construya','construyamos','construyáis','construyan'],
      gerund:'construyendo',
    },
    leer: {
      pret:['leí','leíste','leyó','leímos','leísteis','leyeron'],
      gerund:'leyendo', pastPart:'leído',
    },
    creer: {
      pret:['creí','creíste','creyó','creímos','creísteis','creyeron'],
      gerund:'creyendo', pastPart:'creído',
    },
    incluir: {
      pres:['incluyo','incluyes','incluye','incluimos','incluís','incluyen'],
      pret:['incluí','incluiste','incluyó','incluimos','incluisteis','incluyeron'],
      presSub:['incluya','incluyas','incluya','incluyamos','incluyáis','incluyan'],
      gerund:'incluyendo',
    },
    elegir: {
      pres:['elijo','eliges','elige','elegimos','elegís','eligen'],
      pret:['elegí','elegiste','eligió','elegimos','elegisteis','eligieron'],
      presSub:['elija','elijas','elija','elijamos','elijáis','elijan'],
      gerund:'eligiendo',
    },
    reír: {
      pres:['río','ríes','ríe','reímos','reís','ríen'],
      pret:['reí','reíste','rió','reímos','reísteis','rieron'],
      presSub:['ría','rías','ría','riamos','riáis','rían'],
      gerund:'riendo', pastPart:'reído',
    },
    servir: {
      pres:['sirvo','sirves','sirve','servimos','servís','sirven'],
      pret:['serví','serviste','sirvió','servimos','servisteis','sirvieron'],
      presSub:['sirva','sirvas','sirva','sirvamos','sirváis','sirvan'],
      gerund:'sirviendo',
    },
    destruir: {
      pres:['destruyo','destruyes','destruye','destruimos','destruís','destruyen'],
      pret:['destruí','destruiste','destruyó','destruimos','destruisteis','destruyeron'],
      presSub:['destruya','destruyas','destruya','destruyamos','destruyáis','destruyan'],
      gerund:'destruyendo',
    },
    gustar: {},
    hablar: {},
    comer: {},
    vivir: {},
    estudiar: {},
    trabajar: {},
    llamar: {},
    necesitar: {},
    comprar: {},
  };

  function getVerbClass(lemma) {
    if (!lemma) return null;
    if (lemma.endsWith('ar') || lemma.endsWith('arse')) return 'ar';
    if (lemma.endsWith('er') || lemma.endsWith('erse')) return 'er';
    if (lemma.endsWith('ir') || lemma.endsWith('irse')) return 'ir';
    return null;
  }

  function getStem(lemma) {
    if (!lemma) return '';
    return lemma.replace(/(ar|er|ir|arse|erse|irse)$/, '');
  }

  function stripAccents(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Build full conjugation table for a verb.
   */
  function conjugate(lemma) {
    const vc = getVerbClass(lemma);
    if (!vc) return null;
    const stem = getStem(lemma);
    const reg = REG[vc];
    const irr = IRREG[lemma] || {};
    const table = {};

    for (const tense of ['pres','pret','imperf','fut','cond','presSub','imperfSub','imp']) {
      if (irr[tense]) {
        table[tense] = irr[tense];
      } else {
        if (tense === 'fut' || tense === 'cond') {
          table[tense] = reg[tense].map(end => lemma + end.slice(vc.length));
        } else {
          table[tense] = reg[tense].map(end => stem + end);
        }
      }
    }
    table.gerund = irr.gerund || (stem + reg.gerund);
    table.pastPart = irr.pastPart || (stem + reg.pastPart);
    return table;
  }

  /**
   * Identify the conjugation form of a surface word.
   * @returns {{ tense, person, personZh, tenseZh, moodZh, regular, lemma } | null}
   */
  function identify(surface, lemma) {
    if (!surface || !lemma) return null;
    const lower = surface.toLowerCase();
    const stripped = stripAccents(lower);
    const table = conjugate(lemma);
    if (!table) return null;

    // Check non-finite forms first
    if (stripAccents(table.gerund) === stripped || table.gerund === lower) {
      return { tense:'gerund', person:null, personZh:null, tenseZh:TENSE_ZH.gerund, moodZh:MOOD_ZH.nonfinite, regular: !IRREG[lemma]?.gerund, lemma };
    }
    if (stripAccents(table.pastPart) === stripped || table.pastPart === lower) {
      return { tense:'pastPart', person:null, personZh:null, tenseZh:TENSE_ZH.pastPart, moodZh:MOOD_ZH.nonfinite, regular: !IRREG[lemma]?.pastPart, lemma };
    }

    const tenseOrder = ['pres','pret','imperf','fut','cond','presSub','imperfSub','imp'];
    for (const tense of tenseOrder) {
      const forms = table[tense];
      if (!forms) continue;
      for (let pi = 0; pi < forms.length; pi++) {
        const f = forms[pi];
        if (f === '—') continue;
        if (stripAccents(f) === stripped || f === lower) {
          const mood = (tense === 'presSub' || tense === 'imperfSub') ? 'sub' :
                       (tense === 'imp') ? 'imp' : 'ind';
          return {
            tense, person: PERSONS[pi],
            personZh: PERSON_ZH[PERSONS[pi]],
            tenseZh: TENSE_ZH[tense],
            moodZh: MOOD_ZH[mood],
            regular: !IRREG[lemma]?.[tense],
            lemma,
          };
        }
      }
    }
    return null;
  }

  /**
   * Get a short Chinese label for a conjugation result.
   */
  function shortLabel(info) {
    if (!info) return '';
    if (!info.personZh) return info.tenseZh;
    return `${info.tenseZh}·${info.personZh.replace('第','').replace('人称','')}·${info.moodZh}`;
  }

  window.Conjugation = Object.freeze({
    identify,
    conjugate,
    shortLabel,
    TENSE_ZH,
    PERSON_ZH,
    MOOD_ZH,
    PERSONS,
  });
})();
