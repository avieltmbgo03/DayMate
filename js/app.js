/* ---------- helpers ---------- */
const C = Object.assign({ hisName: 'Kenzie', herName: 'Aviel', anniversary: '', messages: [], letters: [], memories: [], dateIdeas: [], foodIdeas: [], tinySteps: [] }, window.DAYMATE_CONTENT);
if (!C.messages.length) C.messages = ['♡'];
if (!C.dateIdeas.length) C.dateIdeas = ['Picnic sa park'];
if (!C.foodIdeas.length) C.foodIdeas = ['Sinigang', 'Tapsilog', 'Pancit canton'];
if (!C.tinySteps.length) C.tinySteps = ['Isulat mo lang yung title ng gagawin mo.'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());            // YYYY-MM-DD (local)
const fmt = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'}) : '';
const peso = n => (n < 0 ? '−' : '') + '₱' + Math.abs(n).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
const pick = a => a[Math.floor(Math.random() * a.length)];
const empty = t => `<p class="text-muted small mb-0">${t}</p>`;

/* ---------- storage (localStorage only) ---------- */
const P = 'daymate:';
const DB = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(P + k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { alert('Storage is full.'); } }
};
const S = {
  tasks: DB.get('tasks', []), notes: DB.get('notes', []), events: DB.get('events', []),
  bucket: DB.get('bucket', []), tx: DB.get('tx', []),
  settings: DB.get('settings', { theme: 'light' })
};
const save = k => DB.set(k, S[k]);
const userName = () => S.settings.name || C.hisName;

/* ---------- constants ---------- */
const NAV = [['home','Home','house'],['myday','My Day','check2-square'],['reset','Reset','arrow-repeat'],
  ['notes','Notes','journal-text'],['little','Little Things','envelope-heart'],['plans','Our Plans','calendar-heart'],
  ['budget','Budget','wallet2'],['settings','Settings','gear']];
const BREAKS = ['Pahinga muna. Stretch ka saglit.','Drink water! 💧','Tingin ka sa malayo ng 20 seconds.','Deep breath in… and out.','Kumain ka na ba? 🍚'];
const BCATS = ['Food','Transport','School','Fun','Bills','Allowance','Other'];
const PR = { High: 0, Medium: 1, Low: 2 };

/* ---------- generic add/edit form ---------- */
const forms = {
  tasks: { t: 'Task', x: () => ({ done: false }), f: [
    { name:'title', label:'Task', req:1 },
    { name:'category', label:'Category', type:'select', o:['Internship','School','Personal'] },
    { name:'priority', label:'Priority', type:'select', o:['Low','Medium','High'] },
    { name:'due', label:'Due date', type:'date', def: today }] },
  notes: { t: 'Note', x: () => ({ pinned: false, date: today() }), f: [
    { name:'title', label:'Title', req:1 },
    { name:'category', label:'Category', type:'select', o:['Internship','School','Ideas','Personal'] },
    { name:'content', label:'Note', type:'textarea' }] },
  events: { t: 'Event', f: [
    { name:'title', label:'What', req:1 },
    { name:'date', label:'Date', type:'date', req:1, def: today },
    { name:'time', label:'Time', type:'time' }] },
  bucket: { t: 'Bucket list item', x: () => ({ done: false }), f: [
    { name:'title', label:'Gusto niyo gawin together', req:1 }] },
  tx: { t: 'Transaction', f: [
    { name:'type', label:'Type', type:'select', o:['Expense','Income'] },
    { name:'amount', label:'Amount (₱)', type:'number', req:1 },
    { name:'category', label:'Category', type:'select', o:BCATS },
    { name:'date', label:'Date', type:'date', def: today },
    { name:'note', label:'Note' }] }
};
let formModal, formCb;
function openForm(title, fields, vals, cb) {
  $('#formTitle').textContent = title;
  $('#formBody').innerHTML = fields.map(f => {
    const v = vals[f.name] ?? (f.def ? f.def() : '');
    const inp = f.type === 'select'
      ? `<select class="form-select" name="${f.name}">${f.o.map(o => `<option ${o == v ? 'selected' : ''}>${o}</option>`).join('')}</select>`
      : f.type === 'textarea'
      ? `<textarea class="form-control" name="${f.name}" rows="5">${esc(v)}</textarea>`
      : `<input class="form-control" type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'step="0.01" min="0"' : ''}>`;
    return `<div class="mb-3"><label class="form-label">${f.label}</label>${inp}</div>`;
  }).join('');
  formCb = cb; formModal.show();
}
function edit(k, id) {
  const F = forms[k], o = id && S[k].find(x => x.id === id);
  openForm(F.t, F.f, o || {}, d => {
    if (o) Object.assign(o, d); else S[k].unshift({ id: uid(), ...d, ...(F.x?.()) });
    save(k); render();
  });
}

/* ---------- actions (event delegation) ---------- */
let msgIdx = [...today()].reduce((a, c) => a + c.charCodeAt(0), 0) % C.messages.length;
const toast = m => {
  const el = document.createElement('div');
  el.className = 'toast show dm-toast';
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(m)}</div><button class="btn-close me-2 m-auto" onclick="this.closest('.toast').remove()"></button></div>`;
  $('#toasts').append(el); setTimeout(() => el.remove(), 7000);
};
const A = {
  add: k => edit(k),
  edit: (k, id) => edit(k, id),
  del: (k, id) => { if (confirm('Sure ka bang buburahin?')) { S[k] = S[k].filter(x => x.id !== id); save(k); render(); } },
  flip: (k, id, b) => { const o = S[k].find(x => x.id === id); o[b.dataset.f] = !o[b.dataset.f]; save(k); render(); },
  msg: () => { msgIdx = Math.floor(Math.random() * C.messages.length); renderMsg(); },
  idea: () => { $('#ideaBox').textContent = pick(C.dateIdeas); },
  brk: () => toast(pick(BREAKS)),
  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    a.download = `daymate-backup-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  import: () => $('#importFile').click(),
  reset: () => { if (confirm('Buburahin lahat ng data sa browser na ito. Sure?')) { Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k)); location.reload(); } }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) A[b.dataset.act]?.(b.dataset.k, b.dataset.id, b);
});

/* ---------- filters & inputs ---------- */
const F = { cat: 'All', range: 'All' };
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.flt) { F[t.dataset.flt] = t.value; renderTasks(); }
  if (t.dataset.s) { S.settings[t.dataset.s] = t.value.trim(); save('settings'); render(); }
  if (t.id === 'darkSwitch') { S.settings.theme = t.checked ? 'dark' : 'light'; save('settings'); applyTheme(); render(); }
  if (t.id === 'importFile' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d !== 'object') throw new Error('bad file');
        const lists = ['tasks', 'notes', 'events', 'bucket', 'tx'];
        Object.keys(S).forEach(k => {
          const ok = lists.includes(k) ? Array.isArray(d[k]) : (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]));
          if (ok) { S[k] = d[k]; save(k); }
        });
        applyTheme(); render(); toast('Import successful ✓');
      } catch { alert('Invalid backup file.'); }
    };
    r.readAsText(t.files[0]); t.value = '';
  }
});
$('#noteSearch').addEventListener('input', renderNotes);
$('#formEl').addEventListener('submit', e => {
  e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); formModal.hide(); formCb(d);
});

/* ---------- renderers ---------- */
const btns = (k, id) => `
  <button class="btn btn-sm btn-link" aria-label="Edit" data-act="edit" data-k="${k}" data-id="${id}"><i class="bi bi-pencil"></i></button>
  <button class="btn btn-sm btn-link text-danger" aria-label="Delete" data-act="del" data-k="${k}" data-id="${id}"><i class="bi bi-trash"></i></button>`;
const taskRow = t => `
  <div class="row-dm ${t.done ? 'done' : ''}">
    <input class="form-check-input mt-0" type="checkbox" aria-label="Done" ${t.done ? 'checked' : ''} data-act="flip" data-k="tasks" data-id="${t.id}" data-f="done">
    <div class="flex-grow-1"><div class="t">${esc(t.title)}</div>
      <small class="text-muted">${esc(t.category)}${t.due ? ' · ' + fmt(t.due) : ''}</small></div>
    <span class="pill p-${esc(t.priority)}">${esc(t.priority)}</span>${btns('tasks', t.id)}
  </div>`;

function renderMsg() {
  $$('.msgBox').forEach(b => b.innerHTML = `<p class="serif fs-4 mb-1">“${esc(C.messages[msgIdx])}”</p><small class="text-muted">— ${esc(C.herName)} ♡</small>`);
}

function renderHome() {
  const h = new Date().getHours();
  $('#greeting').textContent = `Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}, ${userName()}!`;
  $('#today').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const tt = S.tasks.filter(t => t.due === today()), dn = tt.filter(t => t.done).length;
  $('#progress').textContent = tt.length ? `${dn} of ${tt.length}` : '—';
  $('#progressBar').style.width = tt.length ? (dn / tt.length * 100) + '%' : '0%';
  const pend = S.tasks.filter(t => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 5);
  $('#homeTasks').innerHTML = pend.length ? pend.map(taskRow).join('') : empty('Walang pending. Chill ka muna ✨');
  const ev = S.events.filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  $('#homeEvents').innerHTML = ev.length
    ? ev.map(e => `<div class="row-dm"><div class="flex-grow-1">${esc(e.title)}</div><small class="text-muted">${fmt(e.date)} ${esc(e.time)}</small></div>`).join('')
    : empty('Wala pang events.');
  $('#homeCare').innerHTML = `<div class="d-flex justify-content-between align-items-center">
      <h6 class="mb-0">Reset corner</h6><a class="care-link" href="#reset">Open <i class="bi bi-arrow-right"></i></a></div>
    <p class="mt-3 mb-3">Stuck, pagod, o hindi alam saan magsisimula? Timer, breathing, at food picker, nandito lahat.</p>
    <div class="d-flex gap-2 flex-wrap">
      <a class="btn btn-dm btn-sm" href="#reset"><i class="bi bi-stopwatch"></i> Focus timer</a>
      <button class="btn btn-outline-secondary btn-sm" data-act="brk">☕ Break</button></div>`;
}

function renderTasks() {
  const wk = ymd(new Date(Date.now() + 7 * 864e5));
  const list = S.tasks
    .filter(t => F.cat === 'All' || t.category === F.cat)
    .filter(t => F.range === 'All' || (F.range === 'Today' ? t.due === today() : t.due >= today() && t.due <= wk))
    .sort((a, b) => (a.done - b.done) || (a.due || '9999').localeCompare(b.due || '9999') || (PR[a.priority] - PR[b.priority]));
  $('#taskList').innerHTML = list.length ? list.map(taskRow).join('') : empty('Walang tasks dito.');
}

function renderNotes() {
  const q = $('#noteSearch').value.toLowerCase();
  const list = S.notes.filter(n => (n.title + n.content + n.category).toLowerCase().includes(q))
    .sort((a, b) => b.pinned - a.pinned);
  $('#noteList').innerHTML = list.length ? list.map(n => `
    <div class="col-md-6 col-xl-4"><div class="dm-card">
      <div class="d-flex justify-content-between align-items-start">
        <h5 class="serif mb-1">${esc(n.title)}</h5>
        <button class="btn btn-sm btn-link note-pin" aria-label="Pin note" data-act="flip" data-k="notes" data-id="${n.id}" data-f="pinned">
          <i class="bi bi-pin${n.pinned ? '-fill' : ''}"></i></button></div>
      <span class="pill">${esc(n.category)}</span> <small class="text-muted">${fmt(n.date)}</small>
      <p class="mt-2 mb-1" style="white-space:pre-line">${esc(n.content)}</p>
      <div class="text-end">${btns('notes', n.id)}</div></div></div>`).join('')
    : `<div class="col-12">${empty('Wala pang notes.')}</div>`;
}

function renderLittle() {
  renderMsg();
  $('#letters').innerHTML = C.letters.map(l => `<details class="letter"><summary>${esc(l.title)}</summary><p>${esc(l.body)}</p></details>`).join('');
  $('#memories').innerHTML = C.memories.map(m => `
    <div class="dm-card p-2">
      ${m.photo ? `<img src="${esc(m.photo)}" class="img-fluid rounded mb-2" alt="">` : ''}
      <div>${esc(m.caption)}</div><small class="text-muted">${fmt(m.date)}</small></div>`).join('');
}

function renderPlans() {
  const a = C.anniversary, n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const [ay, am, ad] = String(a || '').split('-').map(Number);
  if (a && ay && am && ad) {
    const d = new Date(ay, am - 1, ad), nx = new Date(n.getFullYear(), am - 1, ad);
    if (nx < t0) nx.setFullYear(nx.getFullYear() + 1);
    const until = Math.round((nx - t0) / 864e5);
    $('#countdown').innerHTML = `<div class="row text-center">
      <div class="col-6"><div class="big">${Math.max(0, Math.round((t0 - d) / 864e5))}</div><small class="text-muted">days together ♡</small></div>
      <div class="col-6"><div class="big">${until}</div><small class="text-muted">days to anniversary</small></div></div>`;
  } else $('#countdown').innerHTML = empty('I-set ang anniversary sa content.js');
  const ev = [...S.events].sort((a, b) => a.date.localeCompare(b.date));
  $('#eventList').innerHTML = ev.length ? ev.map(e => `
    <div class="row-dm" style="${e.date < today() ? 'opacity:.5' : ''}">
      <div class="flex-grow-1">${esc(e.title)}<br><small class="text-muted">${fmt(e.date)} ${esc(e.time)}</small></div>${btns('events', e.id)}</div>`).join('')
    : empty('Wala pang events.');
  $('#bucketList').innerHTML = S.bucket.length ? S.bucket.map(b => `
    <div class="row-dm ${b.done ? 'done' : ''}">
      <input class="form-check-input mt-0" type="checkbox" aria-label="Done" ${b.done ? 'checked' : ''} data-act="flip" data-k="bucket" data-id="${b.id}" data-f="done">
      <div class="flex-grow-1 t">${esc(b.title)}</div>
      <button class="btn btn-sm btn-link text-danger" aria-label="Delete" data-act="del" data-k="bucket" data-id="${b.id}"><i class="bi bi-trash"></i></button></div>`).join('')
    : empty('Start your list ♡');
}

let chart;
function renderBudget() {
  const m = today().slice(0, 7), tx = S.tx.filter(t => (t.date || '').startsWith(m));
  const sum = ty => tx.filter(t => t.type === ty).reduce((a, t) => a + +t.amount, 0);
  const inc = sum('Income'), exp = sum('Expense');
  $('#bInc').textContent = peso(inc); $('#bExp').textContent = peso(exp); $('#bBal').textContent = peso(inc - exp);
  const cats = {};
  tx.filter(t => t.type === 'Expense').forEach(t => cats[t.category] = (cats[t.category] || 0) + +t.amount);
  chart?.destroy(); chart = null;
  const has = Object.keys(cats).length && window.Chart;
  $('#chart').style.display = has ? '' : 'none';
  $('#noChart').textContent = has ? '' : 'Wala pang expenses this month.';
  const css = getComputedStyle(document.documentElement);
  if (has) Chart.defaults.color = css.getPropertyValue('--text').trim();
  if (has) chart = new Chart($('#chart'), { type: 'doughnut',
    data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), borderColor: css.getPropertyValue('--card').trim(), backgroundColor: ['#879B83','#B8C7B0','#414B40','#d9c9a8','#c98f8f','#a9b8c9','#c7b8d9'] }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
  const list = [...S.tx].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20);
  $('#txList').innerHTML = list.length ? list.map(t => `
    <div class="row-dm"><div class="flex-grow-1">${esc(t.note || t.category)}<br><small class="text-muted">${esc(t.category)} · ${fmt(t.date)}</small></div>
      <strong style="color:${t.type === 'Income' ? '#5b8a55' : '#b06060'}">${t.type === 'Income' ? '+' : '−'}${peso(+t.amount)}</strong>${btns('tx', t.id)}</div>`).join('')
    : empty('Wala pang transactions.');
}

/* ---------- reset corner (nothing is saved here) ---------- */
const RS = { mins: 25, left: 25 * 60, end: 0, tid: null, bt: null };
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
function paintTimer() {
  $('#timerText').textContent = mmss(RS.left);
  $('#timerBtn').textContent = RS.tid ? 'Pause' : 'Start';
  $$('[data-act="tmin"]').forEach(b => b.classList.toggle('active', +b.dataset.n === RS.mins));
}
const stopTimer = () => { clearInterval(RS.tid); RS.tid = null; };
function tickTimer() {
  RS.left = Math.max(0, Math.round((RS.end - Date.now()) / 1000));
  if (!RS.left) { stopTimer(); RS.left = RS.mins * 60; toast('Tapos na ang oras! Good job ♡'); navigator.vibrate?.(300); }
  paintTimer();
}
Object.assign(A, {
  tmin: (k, id, b) => { stopTimer(); RS.mins = +b.dataset.n; RS.left = RS.mins * 60; paintTimer(); },
  tgo: () => { if (RS.tid) { stopTimer(); } else { RS.end = Date.now() + RS.left * 1000; RS.tid = setInterval(tickTimer, 500); } paintTimer(); },
  trst: () => { stopTimer(); RS.left = RS.mins * 60; paintTimer(); },
  breathe: () => {
    const el = $('#breath'), on = el.classList.toggle('on'), lab = $('#breathText');
    clearInterval(RS.bt); $('#breathBtn').textContent = on ? 'Stop' : 'Start breathing';
    if (!on) { lab.textContent = 'Ready ka na?'; return; }
    let i = 0; const step = () => { lab.textContent = i++ % 2 ? 'Labas… dahan-dahan' : 'Papasok… 4 count'; };
    step(); RS.bt = setInterval(step, 4000);
  },
  eat: () => { $('#eatBox').textContent = pick(C.foodIdeas); },
  tiny: () => { $('#tinyBox').textContent = pick(C.tinySteps); }
});
function renderReset() {
  const t = S.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (PR[a.priority] - PR[b.priority]))[0];
  $('#nextUp').textContent = t ? `Next up: ${t.title}` : 'Walang pending na task. Chill ka muna ✨';
  paintTimer();
}

function renderSettings() {
  $('#setName').value = S.settings.name || ''; $('#setName').placeholder = C.hisName;
  $('#darkSwitch').checked = S.settings.theme === 'dark';
}
function render() { renderHome(); renderTasks(); renderReset(); renderNotes(); renderLittle(); renderPlans(); renderBudget(); renderSettings(); }

/* ---------- theme, nav, init ---------- */
const applyTheme = () => document.documentElement.setAttribute('data-bs-theme', S.settings.theme || 'light');
const navHTML = NAV.map(([id, label, ic]) => `<a href="#${id}" data-v="${id}"><i class="bi bi-${ic}"></i><span>${label}</span></a>`).join('');
$('#sideNav').innerHTML = navHTML; $('#bottomNav').innerHTML = navHTML;
function route() {
  let v = location.hash.slice(1); if (!$('#view-' + v)) v = 'home';
  $$('.view').forEach(s => s.hidden = s.id !== 'view-' + v);
  $$('[data-v]').forEach(a => a.classList.toggle('active', a.dataset.v === v));
  if (v === 'budget') chart?.resize();
  scrollTo(0, 0);
}
addEventListener('hashchange', route);

formModal = new bootstrap.Modal('#formModal');
applyTheme(); render(); route();
const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
tick(); setInterval(tick, 1000);
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } else renderHome(); }, 60000);
setInterval(() => toast(pick(BREAKS)), 45 * 60 * 1000);   // reminder habang naka-open lang ang site