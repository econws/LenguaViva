"""
LenguaViva spaCy backend — lightweight REST API for Spanish dependency parsing.
Run: python server.py
Serves both the static frontend (port 8080) and the /api/parse endpoint.
"""
import json, os, sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import spacy

app = Flask(__name__, static_folder='static')
CORS(app)

print("Loading spaCy model es_core_news_md …", flush=True)
nlp = spacy.load("es_core_news_md")
print("✓ Model loaded.", flush=True)

# ── Universal Dependencies → our role mapping ──
DEP_TO_ROLE = {
    'nsubj':      'subj',
    'nsubj:pass': 'subj',
    'csubj':      'subj',
    'obj':        'obj',
    'iobj':       'iobj',
    'obl':        'prep_ph',
    'obl:agent':  'prep_ph',
    'obl:arg':    'prep_ph',
    'obl:tmod':   'mod',       # temporal modifier
    'advmod':     'mod',
    'amod':       'mod',
    'nummod':     'mod',
    'nmod':       'comp',
    'acl':        'mod',
    'acl:relcl':  'mod',
    'advcl':      'mod',
    'xcomp':      'comp',
    'ccomp':      'comp',
    'ROOT':       'pred',
    'aux':        'aux',
    'aux:pass':   'aux',
    'cop':        'pred',
    'det':        'det',
    'case':       'prep_ph',
    'mark':       'conj',
    'cc':         'conj',
    'conj':       None,        # inherits from head
    'expl:pv':    'refl',      # reflexive "se"
    'flat':       None,        # part of multi-word expression
    'fixed':      None,
    'compound':   None,
    'appos':      'comp',
    'vocative':   'mod',
    'discourse':  'mod',
    'punct':      'punct',
    'dep':        'comp',
    'parataxis':  'pred',
}

CLITIC_SURFACES = {'me','te','se','lo','la','le','nos','os','los','las','les'}


KNOWN_REFLEXIVE_VERBS = {
    'lavar','vestir','sentar','levantar','acostar','despertar','duchar','peinar',
    'llamar','quejar','ir','quedar','caer','dar','dormir','morir','reír','poner',
    'hacer','sentir','arrepentir','atrever','negar','acordar','olvidar','preguntar',
    'imaginar','preocupar','dedicar','convertir','referir','equivocar','marchar',
}


def classify_token(token):
    """Map a spaCy token to our frontend role system."""
    dep = token.dep_
    lower = token.text.lower()

    # Skip whitespace tokens
    if token.pos_ == 'SPACE':
        return 'punct'

    # Clitic pronouns — fine-grained classification
    if lower in CLITIC_SURFACES and token.head.pos_ in ('VERB', 'AUX'):
        # Explicit reflexive marking
        if dep in ('expl:pv', 'expl:pass'):
            return 'refl'

        # "se" → reflexive if the verb is a known reflexive verb or
        # if "se" agrees with the subject
        if lower == 'se':
            verb_lemma = token.head.lemma_.lower()
            if verb_lemma in KNOWN_REFLEXIVE_VERBS or dep == 'expl:pv':
                return 'refl'
            # Check if there's a subject — if subject is 3rd person and se is present, likely reflexive
            siblings = list(token.head.children)
            has_subj = any(c.dep_ in ('nsubj','nsubj:pass') for c in siblings)
            has_obj = any(c.dep_ == 'obj' and c.i != token.i for c in siblings)
            if has_subj and has_obj:
                return 'refl'  # "Ella se lava las manos" — se is reflexive dative
            if has_subj and not has_obj:
                return 'refl'
            return 'refl'  # Default "se" to reflexive

        # "le/les" → always indirect object
        if lower in ('le', 'les'):
            return 'iobj'

        if dep == 'iobj':
            return 'iobj'
        if dep == 'obj':
            return 'obj'
        if dep in ('nsubj', 'nsubj:pass'):
            return 'subj'

    # "se" as impersonal or passive marker (expl:impers, expl:pass)
    if lower == 'se' and dep in ('expl:impers', 'expl:pass'):
        return 'refl'

    # Relative pronouns (que/quien/cual as nsubj/obj of acl) → connector for learners
    if dep in ('nsubj', 'obj', 'obl') and token.pos_ == 'PRON' and \
       lower in ('que', 'quien', 'quienes', 'cual', 'cuales', 'donde', 'cuyo', 'cuya') and \
       token.head.dep_ in ('acl', 'acl:relcl'):
        return 'conj'

    # Copular constructions: "es" = pred, "lengua" (ROOT noun with cop child) = comp
    if dep == 'ROOT' and token.pos_ in ('NOUN', 'ADJ', 'PROPN'):
        has_cop = any(c.dep_ == 'cop' for c in token.children)
        if has_cop:
            return 'comp'

    # Relative/adverbial clause verbs are predicates (of their clause)
    if token.pos_ == 'VERB' and dep in ('acl', 'acl:relcl', 'advcl'):
        return 'pred'

    # Temporal oblique → modifier
    if dep.startswith('obl') and token.pos_ == 'NOUN':
        temporal_words = {'mañana','tarde','noche','día','semana','mes','año',
                         'hora','lunes','martes','miércoles','jueves','viernes',
                         'sábado','domingo','momento','rato','vez'}
        if lower in temporal_words:
            return 'mod'
        if any(c.text.lower() in ('ayer','hoy','mañana','anoche','antes','después',
               'siempre','nunca','ya','todavía','aún')
               for c in token.subtree) or \
           any(c.dep_ == 'case' and c.text.lower() in ('durante','desde','hasta','tras')
               for c in token.children):
            return 'mod'

    # Verbs that are ROOT or conj of ROOT → predicate
    if token.pos_ == 'VERB' and dep in ('ROOT', 'conj', 'parataxis'):
        return 'pred'
    if token.pos_ == 'AUX' and dep in ('ROOT', 'cop'):
        return 'pred'

    # conj inherits role from its head
    if dep == 'conj':
        head_role = DEP_TO_ROLE.get(token.head.dep_)
        return head_role or 'comp'

    # flat / fixed / compound inherit from head
    if dep in ('flat', 'fixed', 'compound'):
        head_role = DEP_TO_ROLE.get(token.head.dep_)
        return head_role or 'comp'

    return DEP_TO_ROLE.get(dep, 'comp')


def detect_clauses(doc):
    """Detect subordinate clauses from dependency parse."""
    clauses = [{'id': 0, 'type': 'main', 'startIdx': 0, 'endIdx': len(doc)-1,
                'depth': 0, 'parentId': None, 'connector': '', 'zh': '主句'}]

    CLAUSE_TYPE_MAP = {
        'advcl': _advcl_type,
        'acl:relcl': lambda t: ('relative', '关系从句'),
        'acl': lambda t: ('relative', '关系从句'),
        'ccomp': lambda t: ('complement', '补语从句'),
        'xcomp': lambda t: ('complement', '补语从句'),
        'csubj': lambda t: ('complement', '主语从句'),
    }

    clause_id = 1
    for token in doc:
        if token.dep_ in CLAUSE_TYPE_MAP:
            type_fn = CLAUSE_TYPE_MAP[token.dep_]
            ctype, czh = type_fn(token)

            # Find the connector/marker
            connector = ''
            for child in token.children:
                if child.dep_ in ('mark', 'cc') and child.i < token.i:
                    connector = child.text.lower()
                    break

            # Subtree span
            subtree_indices = sorted([t.i for t in token.subtree])
            if subtree_indices:
                clauses.append({
                    'id': clause_id,
                    'type': ctype,
                    'startIdx': subtree_indices[0],
                    'endIdx': subtree_indices[-1],
                    'depth': 1,
                    'parentId': 0,
                    'connector': connector,
                    'zh': czh,
                })
                clause_id += 1

    return clauses


def _advcl_type(token):
    """Determine adverbial clause type from its marker."""
    markers = {c.text.lower() for c in token.children if c.dep_ == 'mark'}
    if markers & {'si', 'a menos que', 'con tal de que', 'siempre que'}:
        return ('conditional', '条件从句')
    if markers & {'porque', 'ya que', 'puesto que', 'dado que', 'como', 'pues'}:
        return ('causal', '原因从句')
    if markers & {'aunque', 'a pesar de que', 'si bien'}:
        return ('concessive', '让步从句')
    if markers & {'cuando', 'mientras', 'antes de que', 'después de que',
                  'hasta que', 'desde que', 'en cuanto'}:
        return ('time', '时间从句')
    if markers & {'para que', 'a fin de que', 'para'}:
        return ('purpose', '目的从句')
    if markers & {'donde', 'adonde'}:
        return ('place', '地点从句')
    if markers & {'como', 'sin que', 'de modo que', 'de manera que'}:
        return ('manner', '方式从句')
    if markers & {'así que', 'de modo que', 'de manera que'}:
        return ('result', '结果从句')
    return ('causal', '状语从句')


def parse_sentence(doc):
    """Parse a single sentence (spaCy Span) into our token format."""
    tokens = []
    clause_list = detect_clauses(doc)

    for token in doc:
        if token.pos_ == 'SPACE':
            continue
        role = classify_token(token)

        # Determine which clause this token belongs to
        clause_id = 0
        for cl in clause_list:
            if cl['id'] > 0 and cl['startIdx'] <= token.i <= cl['endIdx']:
                clause_id = cl['id']

        is_connector = token.dep_ in ('mark', 'cc') and clause_id > 0

        # Clitic type
        clitic_type = None
        lower = token.text.lower()
        if lower in CLITIC_SURFACES and token.head.pos_ == 'VERB':
            if role == 'refl':
                clitic_type = 'reflexive'
            elif role == 'iobj':
                clitic_type = 'indirect'
            elif role == 'obj':
                clitic_type = 'direct'

        tok_data = {
            'surface': token.text,
            'lemma': token.lemma_,
            'pos': _map_pos(token.pos_),
            'posUD': token.pos_,
            'dep': token.dep_,
            'role': role,
            'head': token.head.i - doc[0].i if hasattr(doc[0], 'i') else token.head.i,
            'headText': token.head.text,
            'morph': str(token.morph) if token.morph else '',
            'clauseId': clause_id,
            'clauseType': next((c['type'] for c in clause_list if c['id'] == clause_id), 'main'),
            'isClauseConnector': is_connector,
        }
        if clitic_type:
            tok_data['cliticType'] = clitic_type

        tokens.append(tok_data)

    return {'tokens': tokens, 'clauses': clause_list}


def _map_pos(ud_pos):
    """Map UD POS to es-compromise style POS for CSS compatibility."""
    return {
        'NOUN': 'Noun', 'PROPN': 'Noun', 'VERB': 'Verb', 'AUX': 'Verb',
        'ADJ': 'Adjective', 'ADV': 'Adverb', 'DET': 'Determiner',
        'ADP': 'Preposition', 'CCONJ': 'Conjunction', 'SCONJ': 'Conjunction',
        'PRON': 'Pronoun', 'NUM': 'Number', 'PUNCT': 'Punctuation',
        'INTJ': 'Adverb', 'PART': 'Adverb', 'SYM': 'Punctuation',
        'X': 'Noun',
    }.get(ud_pos, 'Noun')


@app.route('/api/parse', methods=['POST'])
def api_parse():
    data = request.get_json(force=True)
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'empty text'}), 400

    doc = nlp(text)
    sentences = []
    for sent in doc.sents:
        sent_doc = sent.as_doc()
        sentences.append(parse_sentence(sent_doc))

    return jsonify({'sentences': sentences})


# ── Serve static frontend ──
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)


if __name__ == '__main__':
    print("Starting LenguaViva server on http://localhost:5001", flush=True)
    app.run(host='0.0.0.0', port=5001, debug=False)
