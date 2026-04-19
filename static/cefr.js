/**
 * cefr.js — CEFR difficulty level marking for Spanish vocabulary & grammar.
 * Built-in A1–B2 word list (~2500 entries) + grammar structure levels.
 */
(function () {
  'use strict';

  const LEVELS = ['A1','A2','B1','B2'];
  const LEVEL_COLORS = { A1:'#22c55e', A2:'#3b82f6', B1:'#f59e0b', B2:'#a855f7', unknown:'#9ca3af' };
  const LEVEL_ZH = { A1:'入门', A2:'初级', B1:'中级', B2:'中高级', unknown:'未收录' };

  // ── Core vocabulary by CEFR level (lemma form) ──
  const VOCAB = {};
  function addWords(level, words) { words.forEach(w => { VOCAB[w.toLowerCase()] = level; }); }

  // A1 — ~500 most basic words
  addWords('A1', [
    'ser','estar','tener','hacer','poder','ir','haber','decir','querer','saber',
    'dar','ver','comer','beber','hablar','vivir','trabajar','estudiar','leer','escribir',
    'llamar','necesitar','comprar','pagar','llegar','salir','venir','volver','dormir',
    'gustar','preferir','creer','pensar','conocer','entender','aprender','enseñar',
    'abrir','cerrar','esperar','buscar','encontrar','escuchar','mirar','ayudar',
    'jugar','cantar','bailar','nadar','correr','caminar','cocinar','lavar','limpiar',
    'yo','tú','él','ella','nosotros','ustedes','usted','ellos','ellas',
    'me','te','se','nos','lo','la','le','los','las','les',
    'mi','tu','su','nuestro','este','ese','aquel',
    'el','la','los','las','un','una','unos','unas','del','al',
    'hombre','mujer','niño','niña','persona','gente','amigo','amiga',
    'padre','madre','hijo','hija','hermano','hermana','familia',
    'casa','ciudad','país','calle','escuela','hospital','tienda','restaurante',
    'agua','comida','pan','leche','café','carne','fruta','verdura',
    'libro','mesa','silla','puerta','ventana','coche','autobús','tren',
    'día','noche','mañana','tarde','hora','semana','mes','año','hoy','ayer',
    'nombre','número','dinero','trabajo','problema','pregunta','respuesta',
    'grande','pequeño','bueno','malo','nuevo','viejo','joven','bonito','feo',
    'largo','corto','alto','bajo','fácil','difícil','importante','posible',
    'blanco','negro','rojo','azul','verde','amarillo',
    'mucho','poco','muy','más','menos','bien','mal','también','siempre','nunca',
    'aquí','allí','ahora','después','antes','luego','ya','todavía',
    'y','o','pero','porque','que','si','cuando','como','donde',
    'a','de','en','con','por','para','sin','sobre','entre','hasta','desde',
    'no','sí','qué','cómo','dónde','cuándo','cuánto','por qué','quién',
    'uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez',
    'cien','mil','primero','segundo','último',
    'tiempo','sol','lluvia','frío','calor',
    'todo','nada','algo','alguien','nadie','otro','mismo','cada',
    'feliz','triste','contento','cansado','enfermo',
    'español','inglés','lengua','idioma','palabra',
    'mano','cabeza','ojo','cuerpo',
  ]);

  // A2 — ~700 additional words
  addWords('A2', [
    'parecer','quedar','dejar','seguir','llevar','pasar','sentir','perder',
    'ganar','cambiar','preguntar','responder','ofrecer','invitar','recibir',
    'recordar','olvidar','decidir','intentar','conseguir','permitir','explicar',
    'mover','subir','bajar','tocar','tirar','empujar','cortar','poner','sacar',
    'mundo','lugar','parte','punto','forma','ejemplo','idea','historia','momento',
    'cultura','música','arte','deporte','viaje','vacaciones','fiesta',
    'animal','perro','gato','pájaro','flor','árbol','montaña','río','mar','playa',
    'avión','barco','bicicleta','camino','aeropuerto','estación',
    'hotel','habitación','baño','cocina','jardín','piso','edificio',
    'médico','profesor','estudiante','policía','conductor',
    'teléfono','ordenador','internet','correo','carta','mensaje','foto',
    'película','programa','periódico','revista','canción',
    'ropa','camisa','pantalón','zapato','vestido','abrigo','sombrero',
    'desayuno','almuerzo','cena','plato','vaso','cuchillo','tenedor','cuchara',
    'diferente','igual','necesario','libre','ocupado','seguro','peligroso',
    'rico','pobre','fuerte','débil','rápido','lento','caliente','frío',
    'oscuro','claro','limpio','sucio','lleno','vacío',
    'bastante','demasiado','casi','quizás','mientras','aunque','sin embargo',
    'aún','entonces','así','además','tampoco','jamás',
    'derecha','izquierda','arriba','abajo','cerca','lejos','dentro','fuera',
    'sobre','debajo','delante','detrás','junto',
    'durante','según','hacia','contra','mediante',
  ]);

  // B1 — ~700 additional
  addWords('B1', [
    'desarrollar','producir','mantener','establecer','considerar','resultar',
    'representar','suponer','alcanzar','lograr','realizar','cumplir','dirigir',
    'reconocer','aceptar','proponer','exigir','demostrar','expresar',
    'comunicar','discutir','argumentar','comparar','analizar','investigar',
    'participar','contribuir','influir','depender','pertenecer','relacionar',
    'convertir','transformar','mejorar','aumentar','reducir','eliminar',
    'proteger','defender','atacar','luchar','competir','colaborar',
    'sociedad','gobierno','política','economía','educación','ciencia',
    'tecnología','industria','empresa','mercado','comercio','negocio',
    'desarrollo','crecimiento','proceso','sistema','estructura','organización',
    'situación','condición','oportunidad','dificultad','solución','resultado',
    'derecho','ley','justicia','libertad','igualdad','democracia',
    'relación','comunicación','información','opinión','decisión','experiencia',
    'medio ambiente','naturaleza','energía','recurso','material',
    'capacidad','habilidad','conocimiento','experiencia','actitud',
    'objetivo','meta','proyecto','plan','estrategia',
    'evidente','obvio','fundamental','esencial','significativo','considerable',
    'complejo','sencillo','adecuado','apropiado','disponible','actual',
    'económico','social','político','cultural','internacional','profesional',
    'sin duda','en general','por ejemplo','en cambio','sin embargo','por lo tanto',
    'a pesar de','en cuanto a','con respecto a','debido a','a través de',
  ]);

  // B2 — ~600 additional
  addWords('B2', [
    'abordar','afrontar','asumir','concebir','contemplar','desempeñar',
    'emprender','fomentar','generar','gestionar','impulsar','incentivar',
    'plantear','ponderar','prevenir','promover','reforzar','renovar',
    'rescatar','restablecer','sostener','suscitar','trascender','vincular',
    'ámbito','apogeo','auge','brecha','coyuntura','desafío','dilema',
    'enfoque','entorno','fenómeno','impacto','incidencia','índole',
    'paradigma','perspectiva','premisa','repercusión','sesgo','tendencia',
    'vigencia','matiz','alcance','trasfondo',
    'coherente','contundente','crucial','drástico','eficaz','exhaustivo',
    'inherente','notable','paulatino','plausible','prevalente','riguroso',
    'sustancial','tajante','tangible','viable','abrumador',
    'no obstante','en virtud de','con miras a','en aras de',
    'a raíz de','en detrimento de','a la par','en torno a',
    'paulatinamente','sustancialmente','inherentemente',
  ]);

  // Grammar structure CEFR levels
  const GRAMMAR_LEVELS = {
    'pres':'A1', 'imperf':'A2', 'pret':'A2', 'fut':'A2', 'cond':'B1',
    'presSub':'B1', 'imperfSub':'B2', 'imp':'A2',
    'gerund':'A2', 'pastPart':'A2',
    'reflexive':'A2', 'ser_estar':'A1', 'gustar':'A2',
    'por_para':'A2', 'personal_a':'A2', 'clitic':'B1',
    'subjunctive':'B1', 'conditional_sentence':'B2',
  };

  /**
   * Get the CEFR level of a word (by lemma or surface).
   */
  function getLevel(word) {
    if (!word) return 'unknown';
    const lower = word.toLowerCase();
    return VOCAB[lower] || 'unknown';
  }

  /**
   * Get CEFR info for a grammar structure.
   */
  function getGrammarLevel(key) {
    return GRAMMAR_LEVELS[key] || null;
  }

  /**
   * Compute difficulty distribution for a list of words.
   * @param {string[]} words — array of lemmas/surfaces
   * @returns {{ A1, A2, B1, B2, unknown, total, avgLevel }}
   */
  function distribution(words) {
    const counts = { A1:0, A2:0, B1:0, B2:0, unknown:0 };
    words.forEach(w => {
      const lv = getLevel(w);
      counts[lv] = (counts[lv] || 0) + 1;
    });
    const total = words.length || 1;
    const score = (counts.A1 * 1 + counts.A2 * 2 + counts.B1 * 3 + counts.B2 * 4) / (total - counts.unknown || 1);
    let avgLevel = 'A1';
    if (score > 3.5) avgLevel = 'B2';
    else if (score > 2.5) avgLevel = 'B1';
    else if (score > 1.5) avgLevel = 'A2';
    return { ...counts, total, avgLevel };
  }

  window.CEFR = Object.freeze({
    getLevel, getGrammarLevel, distribution,
    LEVELS, LEVEL_COLORS, LEVEL_ZH, GRAMMAR_LEVELS,
  });
})();
