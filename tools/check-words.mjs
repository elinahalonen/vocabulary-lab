// Checks data/words.json for the mistakes that are easy to make by hand:
// missing fields, duplicate ids, unknown enum values, empty examples.
// Run with:  node tools/check-words.mjs
import { readFileSync } from 'node:fs';

const file = new URL('../data/words.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));

const POS = ['noun', 'adjective', 'verb', 'adverb', 'phrase'];
const GENDER = ['m', 'f', 'n', 'pl'];
const REGISTER = ['general', 'bookish', 'colloquial', 'specialist'];
const LANG = ['la', 'grc', 'fr', 'it', 'de', 'en', 'other'];
const PROVENANCE = ['marta_example', 'ai_suggested', 'marta_request', 'elina_choice'];
const STATUS = ['ai_draft', 'checked', 'needs_fix'];

const problems = [];
const ids = new Set();

for (const [i, w] of data.words.entries()) {
  const where = `word ${i} (${w.id ?? 'no id'})`;
  const need = (cond, msg) => { if (!cond) problems.push(`${where}: ${msg}`); };

  need(typeof w.id === 'string' && w.id, 'missing id');
  need(!ids.has(w.id), 'duplicate id');
  ids.add(w.id);
  need(typeof w.lemma === 'string' && w.lemma, 'missing lemma');
  need(POS.includes(w.pos), `pos must be one of ${POS.join(', ')}`);
  if (w.pos === 'noun') need(GENDER.includes(w.gender), 'nouns need a gender');
  need([1, 2, 3].includes(w.difficulty), 'difficulty must be 1, 2 or 3');
  need(REGISTER.includes(w.register), `register must be one of ${REGISTER.join(', ')}`);
  need(Array.isArray(w.senses) && w.senses.length > 0, 'needs at least one sense');
  for (const [j, s] of (w.senses ?? []).entries()) {
    need(typeof s.definition === 'string' && s.definition, `sense ${j + 1} has no definition`);
    need(Array.isArray(s.examples) && s.examples.length > 0, `sense ${j + 1} has no examples`);
  }
  need(w.origin && LANG.includes(w.origin.lang), `origin.lang must be one of ${LANG.join(', ')}`);
  need(PROVENANCE.includes(w.provenance), `provenance must be one of ${PROVENANCE.join(', ')}`);
  need(w.verification && STATUS.includes(w.verification.status), `verification.status must be one of ${STATUS.join(', ')}`);
}

const byLevel = [1, 2, 3].map(d => data.words.filter(w => w.difficulty === d).length);
const checked = data.words.filter(w => w.verification?.status === 'checked').length;

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log(`OK: ${data.words.length} words (difficulty 1/2/3: ${byLevel.join('/')}), ${checked} checked by a person.`);
