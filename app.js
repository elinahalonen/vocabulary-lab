// Marta's Vocabulary Lab, prototype 1: daily word discovery.
//
// The whole app is three parts:
//   1. State: what Marta has seen, saved in localStorage.
//   2. Selection: which new words today's session gets.
//   3. Views: functions that draw one screen each, from the current state.
// Every user action changes state, saves it, and redraws the screen with render().

const STORAGE_KEY = 'vocablab.v1';
const DAILY_OPTIONS = [3, 5, 7];

// ---------- 1. State ----------

function emptyState() {
  return {
    version: 1,
    settings: { dailyCount: 5 },
    seen: {},   // wordId -> { first: 'YYYY-MM-DD', last: 'YYYY-MM-DD' }
    notes: {},  // wordId -> { date, text }   (Marta's remarks on a word)
    days: {},   // 'YYYY-MM-DD' -> { words: [wordId, ...], pos: index of current card }
  };
}

let storageWorks = true;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const saved = JSON.parse(raw);
    // When the shape of the state changes, convert old versions here instead of discarding them.
    const base = emptyState();
    return { ...base, ...saved, settings: { ...base.settings, ...saved.settings } };
  } catch {
    storageWorks = false;
    return emptyState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
}

// Local calendar date. toISOString() would use UTC, so between midnight and
// 1 or 2 a.m. Polish time it would still report yesterday.
function todayKey(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------- 2. Selection ----------

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random order, but easier words first: fill from difficulty 1, then 2, then 3.
// This is the crudest possible "progressive difficulty" and is meant to be replaced.
function pickNewWords(n) {
  const unseen = words.filter(w => !state.seen[w.id]);
  const picked = [];
  for (const level of [1, 2, 3]) {
    for (const w of shuffle(unseen.filter(w => w.difficulty === level))) {
      if (picked.length === n) return picked;
      picked.push(w.id);
    }
  }
  return picked;
}

// Today's session is created once per day and then kept, so reloading the page
// does not reshuffle. Words she never reached stay unseen and can come back tomorrow.
function todaySession() {
  const key = todayKey();
  if (!state.days[key]) {
    state.days[key] = { words: pickNewWords(state.settings.dailyCount), pos: 0 };
    saveState();
  }
  const session = state.days[key];
  session.words = session.words.filter(id => byId.has(id)); // in case a word was removed from words.json
  return session;
}

function markSeen(id) {
  const key = todayKey();
  const entry = state.seen[id];
  state.seen[id] = { first: entry ? entry.first : key, last: key };
  saveState();
}

// ---------- 3. Views ----------

let words = [];
let byId = new Map();
let state = loadState();
// today | library | settings | card. A card is either part of today's session
// ({ name: 'card', mode: 'session' }) or opened from a list ({ mode: 'browse', id, back }).
let view = { name: 'today' };

const LABELS = {
  pos: { noun: 'rzecz.', adjective: 'przym.', verb: 'czas.', adverb: 'przysł.', phrase: 'wyr.' },
  gender: { m: 'm.', f: 'ż.', n: 'n.', pl: 'lm.' },
  register: { general: null, bookish: 'książk.', colloquial: 'pot.', specialist: 'specjal.' },
  lang: { la: 'łac.', grc: 'gr.', fr: 'fr.', it: 'wł.', de: 'niem.', en: 'ang.', other: '' },
};

// Small helper for building elements: h('p', { class: 'x' }, 'text', child, ...)
// Text is always inserted as text, never as HTML.
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c);
  return el;
}

function go(next) {
  view = next;
  render();
  window.scrollTo(0, 0);
  // Move focus to the new screen's heading so screen readers announce it.
  const heading = document.querySelector('#app h1');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

function render() {
  const app = document.getElementById('app');
  const screens = { today: viewToday, card: viewCard, library: viewLibrary, settings: viewSettings };
  const parts = [
    viewNav(),
    storageWorks ? null : h('p', { class: 'notice', role: 'status' },
      'Ta przeglądarka nie zapisuje postępów. Wszystko działa, ale po zamknięciu strony zniknie.'),
    h('main', { id: 'main' }, screens[view.name]()),
  ];
  app.replaceChildren(...parts.filter(Boolean));
}

function viewNav() {
  const item = (name, label) => h('button', {
    class: 'nav-item', type: 'button',
    'aria-current': (view.name === name || (view.name === 'card' && (view.back ?? 'today') === name)) ? 'page' : null,
    onclick: () => go({ name }),
  }, label);
  return h('header', { class: 'top' },
    h('p', { class: 'brand' }, 'Pracownia słów'),
    h('nav', { 'aria-label': 'Główna' },
      item('today', 'Dziś'), item('library', 'Moje słowa'), item('settings', 'Ustawienia')),
  );
}

function viewToday() {
  const session = todaySession();
  const total = session.words.length;
  const remaining = words.filter(w => !state.seen[w.id]).length;

  if (total === 0) {
    return h('section', { class: 'panel' },
      h('h1', {}, 'Wszystkie słowa poznane'),
      h('p', {}, `To były wszystkie słowa z tej wersji (${words.length}). Kolejne pojawią się, gdy Elina je doda.`),
      h('button', { class: 'btn primary', type: 'button', onclick: () => go({ name: 'library' }) }, 'Przejrzyj swoje słowa'),
    );
  }

  if (session.pos >= total) {
    return h('section', { class: 'panel' },
      h('h1', {}, 'Na dziś to wszystko'),
      h('p', { class: 'lede' }, 'Dzisiejsze słowa:'),
      wordList(session.words, 'today'),
      h('p', { class: 'quiet' }, `Nowych słów w puli: ${remaining}.`),
    );
  }

  const started = session.pos > 0;
  return h('section', { class: 'panel' },
    h('h1', {}, started ? 'Wracamy do dzisiejszych słów' : `Dziś: ${total} ${pluralWords(total)}`),
    h('p', { class: 'lede' }, started
      ? `Jesteś przy słowie ${session.pos + 1} z ${total}.`
      : 'Po jednym na raz, bez pośpiechu. Możesz przerwać w dowolnym momencie.'),
    progress(session.pos, total),
    h('button', { class: 'btn primary', type: 'button', onclick: () => go({ name: 'card', mode: 'session' }) },
      started ? 'Kontynuuj' : 'Zaczynamy'),
  );
}

function pluralWords(n) {
  // Polish plural: 1 słowo, 2–4 słowa, 5+ słów (with the usual 12–14 exception)
  if (n === 1) return 'słowo';
  const tens = n % 100, ones = n % 10;
  return ones >= 2 && ones <= 4 && !(tens >= 12 && tens <= 14) ? 'słowa' : 'słów';
}

function progress(pos, total) {
  return h('ol', { class: 'progress', 'aria-label': `Postęp: ${pos} z ${total}` },
    Array.from({ length: total }, (_, i) =>
      h('li', { class: i < pos ? 'done' : i === pos ? 'current' : '' })));
}

function viewCard() {
  let id, nav;
  if (view.mode === 'session') {
    const session = todaySession();
    if (session.pos >= session.words.length) return viewToday();
    id = session.words[session.pos];
    const isLast = session.pos === session.words.length - 1;
    const move = delta => { session.pos += delta; saveState(); go(session.pos >= session.words.length ? { name: 'today' } : view); };
    nav = h('div', { class: 'card-nav' },
      h('button', { class: 'btn', type: 'button', disabled: session.pos === 0, onclick: () => move(-1) }, 'Wstecz'),
      h('span', { class: 'count' }, `${session.pos + 1} / ${session.words.length}`),
      h('button', { class: 'btn primary', type: 'button', onclick: () => move(1) }, isLast ? 'Zakończ' : 'Dalej'),
    );
  } else {
    id = view.id;
    nav = h('div', { class: 'card-nav' },
      h('button', { class: 'btn', type: 'button', onclick: () => go({ name: view.back }) }, 'Wróć do listy'));
  }
  markSeen(id);
  return h('div', {}, wordCard(byId.get(id)), nav);
}

function wordCard(w) {
  const grammar = [LABELS.pos[w.pos], w.gender && LABELS.gender[w.gender], LABELS.register[w.register]]
    .filter(Boolean).join(' ');
  const origin = w.origin;
  const multi = w.senses.length > 1;

  return h('article', { class: 'card', lang: 'pl' },
    h('h1', { class: 'headword' }, w.lemma),
    h('p', { class: 'grammar' }, grammar),
    h('ol', { class: multi ? 'senses numbered' : 'senses' },
      w.senses.map(s => h('li', {},
        h('p', { class: 'definition' }, s.label ? h('span', { class: 'label' }, s.label + ' ') : null, s.definition),
        h('ul', { class: 'examples' }, s.examples.map(e => h('li', {}, e))),
      ))),
    w.note ? h('p', { class: 'note' }, w.note) : null,
    relatedBlock(w.related),
    h('p', { class: 'origin' },
      h('span', { class: 'origin-label' }, 'Pochodzenie '),
      `${LABELS.lang[origin.lang]} `, h('i', {}, origin.etymon), ` ‘${origin.gloss}’`,
      origin.note ? `. ${origin.note}` : ''),
    noteForElina(w.id),
  );
}

function relatedBlock(rel) {
  if (!rel) return null;
  const rows = [['Bliskie znaczeniowo', rel.synonyms], ['Przeciwieństwa', rel.antonyms], ['Z tej samej rodziny', rel.derived]]
    .filter(([, list]) => list && list.length);
  if (!rows.length) return null;
  return h('dl', { class: 'related' }, rows.map(([label, list]) => [h('dt', {}, label), h('dd', {}, list.join(', '))]));
}

// A way for Marta to say "this definition or example sounds wrong".
// She is a native speaker, so she is also the first content reviewer.
function noteForElina(id) {
  const existing = state.notes[id];
  const box = h('div', { class: 'remark' });
  const showForm = () => {
    const field = h('textarea', { id: `note-${id}`, rows: '3' }, existing ? existing.text : '');
    box.replaceChildren(
      h('label', { for: `note-${id}` }, 'Co tu nie gra? (np. przykład brzmi sztucznie, definicja jest nieścisła)'),
      field,
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const text = field.value.trim();
          if (text) state.notes[id] = { date: todayKey(), text }; else delete state.notes[id];
          saveState(); render();
        } }, 'Zapisz uwagę'),
        h('button', { class: 'btn link', type: 'button', onclick: () => render() }, 'Anuluj')),
    );
    field.focus();
  };
  box.append(existing
    ? h('p', { class: 'quiet' }, 'Twoja uwaga: ', h('q', {}, existing.text), ' ',
        h('button', { class: 'btn link', type: 'button', onclick: showForm }, 'Zmień'))
    : h('button', { class: 'btn link', type: 'button', onclick: showForm }, 'Coś tu nie gra?'));
  return box;
}

function wordList(ids, back) {
  return h('ul', { class: 'word-list' }, ids.map(id => {
    const w = byId.get(id);
    return h('li', {},
      h('button', { type: 'button', onclick: () => go({ name: 'card', mode: 'browse', id, back }) },
        h('span', { class: 'wl-word' }, w.lemma),
        h('span', { class: 'wl-def' }, w.senses[0].definition)));
  }));
}

function viewLibrary() {
  const ids = Object.keys(state.seen).filter(id => byId.has(id))
    .sort((a, b) => byId.get(a).lemma.localeCompare(byId.get(b).lemma, 'pl'));
  return h('section', { class: 'panel' },
    h('h1', {}, 'Moje słowa'),
    ids.length
      ? [h('p', { class: 'lede' }, `Poznane do tej pory: ${ids.length} z ${words.length}.`), wordList(ids, 'library')]
      : h('p', {}, 'Tu pojawią się słowa, które już poznałaś.'),
  );
}

function viewSettings() {
  const pending = state.settings.dailyCount;
  return h('section', { class: 'panel settings' },
    h('h1', {}, 'Ustawienia'),

    h('fieldset', {},
      h('legend', {}, 'Ile nowych słów dziennie'),
      h('div', { class: 'choices' }, DAILY_OPTIONS.map(n =>
        h('label', { class: 'choice' },
          h('input', { type: 'radio', name: 'daily', id: `daily-${n}`, value: String(n), checked: n === pending,
            onchange: () => { state.settings.dailyCount = n; saveState(); render(); } }),
          ` ${n}`))),
      h('p', { class: 'quiet' }, 'Zmiana zadziała od jutra. Dzisiejsza porcja zostaje bez zmian.')),

    h('fieldset', {},
      h('legend', {}, 'Kopia postępów'),
      h('p', { class: 'quiet' }, 'Postępy są zapisane tylko w tej przeglądarce. Skopiuj je i wyślij Elinie albo zachowaj na wszelki wypadek. Zawierają też Twoje uwagi do słów.'),
      backupTools()),

    h('fieldset', {},
      h('legend', {}, 'Zacznij od nowa'),
      resetTool()),
  );
}

function backupTools() {
  const out = h('textarea', { id: 'backup-out', rows: '4', readonly: true }, JSON.stringify(state));
  const input = h('textarea', { id: 'backup-in', rows: '4', placeholder: 'Wklej tutaj skopiowaną kopię' });
  const msg = h('p', { class: 'quiet', role: 'status' });
  return [
    out,
    h('button', { class: 'btn', type: 'button', onclick: async () => {
      try { await navigator.clipboard.writeText(out.value); msg.textContent = 'Skopiowano.'; }
      catch { out.select(); msg.textContent = 'Zaznaczono tekst. Skopiuj go ręcznie.'; }
    } }, 'Skopiuj'),
    h('label', { for: 'backup-in' }, 'Wczytaj kopię'),
    input,
    h('button', { class: 'btn', type: 'button', onclick: () => {
      try {
        const loaded = JSON.parse(input.value);
        if (loaded.version !== 1 || typeof loaded.seen !== 'object') throw new Error();
        state = { ...emptyState(), ...loaded };
        saveState(); go({ name: 'today' });
      } catch { msg.textContent = 'To nie wygląda na kopię z tej aplikacji. Sprawdź, czy wkleiłaś cały tekst.'; }
    } }, 'Wczytaj'),
    msg,
  ];
}

// Two-step reset instead of confirm(), which some embedded views block.
function resetTool() {
  const box = h('div', {});
  const ask = () => box.replaceChildren(
    h('p', {}, 'Na pewno? Zniknie lista poznanych słów i Twoje uwagi.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn danger', type: 'button', onclick: () => { state = emptyState(); saveState(); go({ name: 'today' }); } }, 'Tak, wyczyść'),
      h('button', { class: 'btn link', type: 'button', onclick: () => render() }, 'Nie')));
  box.append(h('button', { class: 'btn', type: 'button', onclick: ask }, 'Wyczyść postępy'));
  return box;
}

// Arrow keys move between cards during today's session.
document.addEventListener('keydown', e => {
  if (view.name !== 'card' || view.mode !== 'session' || e.target.closest('textarea, input')) return;
  const buttons = document.querySelectorAll('.card-nav .btn');
  if (e.key === 'ArrowRight') buttons[buttons.length - 1]?.click();
  if (e.key === 'ArrowLeft' && !buttons[0]?.disabled) buttons[0]?.click();
});

async function start() {
  try {
    const res = await fetch('data/words.json');
    if (!res.ok) throw new Error(res.status);
    words = (await res.json()).words;
    byId = new Map(words.map(w => [w.id, w]));
    render();
  } catch (err) {
    document.getElementById('app').replaceChildren(h('p', { class: 'notice' },
      'Nie udało się wczytać słów. Jeśli otwierasz plik bezpośrednio z dysku, uruchom lokalny serwer (instrukcja w README).'));
    console.error(err);
  }
}

start();
