/* Drop50 v2 — UI. All data lives on this device (localStorage); see engine.js for program + progression logic. */
"use strict";
const E = window.Engine;
const VERSION = "2026.10.13-0940";
let plan = null, state = null;
const ui = { tab: "today", open: null, form: {}, sheet: null, rest: null, discardArmed: false, update: null };
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => E.localISO();
const fmtDate = (s, o = { weekday: "short", month: "short", day: "numeric" }) => new Intl.DateTimeFormat("en-US", o).format(E.parse(s));
const n = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const fmtN = (v) => (v == null ? "" : Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10));
const plural = (k, w) => `${k} ${w}${k === 1 ? "" : "s"}`;
const CHEV = `<svg class="chev" viewBox="0 0 8 13"><path d="M1.5 1.5l5 5-5 5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const GEAR = `<svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm8.1-2.3l1.7 1.3c.2.1.2.4.1.6l-1.6 2.8c-.1.2-.4.3-.6.2l-2-.8c-.4.3-.9.6-1.4.8l-.3 2.1c0 .2-.2.4-.5.4h-3.2c-.2 0-.4-.2-.5-.4l-.3-2.1c-.5-.2-1-.5-1.4-.8l-2 .8c-.2.1-.5 0-.6-.2l-1.6-2.8c-.1-.2-.1-.5.1-.6l1.7-1.3a6 6 0 010-1.7L2.2 9.8c-.2-.1-.2-.4-.1-.6l1.6-2.8c.1-.2.4-.3.6-.2l2 .8c.4-.3.9-.6 1.4-.8l.3-2.1c.1-.2.3-.4.5-.4h3.2c.3 0 .5.2.5.4l.3 2.1c.5.2 1 .5 1.4.8l2-.8c.2-.1.5 0 .6.2l1.6 2.8c.1.2.1.5-.1.6l-1.7 1.3a6 6 0 010 1.7z"/></svg>`;
const DOWN = `<svg viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SYNC = `<svg viewBox="0 0 24 24"><path d="M12 4.5a7.5 7.5 0 016.9 4.6M19.5 4.5v4.8h-4.8M12 19.5a7.5 7.5 0 01-6.9-4.6M4.5 19.5v-4.8h4.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MORE = `<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18" cy="12" r="1.9"/></svg>`;

/* ================= storage ================= */
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(E.STORE)); } catch {}
  if (!raw) try { raw = JSON.parse(localStorage.getItem("drop50.v1")); } catch {}
  state = E.migrate(raw, today());
}
function save() {
  try { localStorage.setItem(E.STORE, JSON.stringify(state)); }
  catch { toast("Couldn't save — phone storage is full"); }
}

/* ================= helpers ================= */
const ex = (id) => E.exercise(plan, id);
const slotOf = (key) => key[0];
const colorVar = (key) => `--c:var(--${slotOf(key)})`;
const incFor = (id) => state.inc[id] || ex(id).inc;
const unit = (x) => (x.basis === "each" ? "lb ea" : x.basis === "added" ? "+lb" : "lb");
const active = () => E.activeSession(state);
const phaseNow = (date = today()) => E.phaseFor(plan, state.profile.startDate, date);
const rxText = (presc) => {
  const rir = presc[0].rir === 0 ? "to failure" : presc[0].rir >= 2 ? "2–3 in the tank" : "1–2 in the tank";
  const same = E.schemeOf(presc) === "straight";
  return { sets: same ? `${presc.length} × ${presc[0].min}–${presc[0].max}` : presc.map((p) => `${p.min}–${p.max}`).join(" / "), rir };
};
const setsTxt = (entry) => E.doneSets(entry).map((s) => `${n(s.w) ? fmtN(n(s.w)) : "BW"}×${s.r}`).join(", ");
function targetsFor(session, key) {
  const entry = session.entries[key], x = ex(entry.ex);
  const hist = E.exposures(state, entry.ex, session.id);
  return { hist, t: E.liveTargets(entry, E.suggest(entry.presc, hist, incFor(entry.ex), x.basis), incFor(entry.ex)) };
}
function entryProgress(entry) { const d = entry.sets.filter((s) => s.done).length; return { d, of: entry.sets.length }; }
function blockKeys(session, slot) { return Object.keys(session.entries).filter((k) => k[0] === slot); }
function blockDone(session, slot) { return blockKeys(session, slot).every((k) => session.entries[k].sets.every((s) => s.done)); }
function slotsOf(session) { return [...new Set(Object.keys(session.entries).map((k) => k[0]))]; }
function minutesSince(iso) { return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); }
function clock(sec) { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; }

/* ================= feedback: toast, haptic, chime ================= */
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400); }
const haptic = (() => {
  // iOS 18+ plays a system haptic when a switch control toggles; must run inside a tap.
  let label;
  return () => {
    try {
      if (navigator.vibrate) return navigator.vibrate(12);
      if (!label) { label = document.createElement("label"); label.style.cssText = "position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden"; const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); label.append(i); document.body.append(label); }
      label.click();
    } catch {}
  };
})();
let audio;
function unlockAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "ambient"; // don't stop his music
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch {}
}
function chime() {
  if (!audio || audio.state !== "running") return;
  const t = audio.currentTime;
  [880, 1320].forEach((f, i) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = f; o.type = "sine";
    g.gain.setValueAtTime(0.0001, t + i * 0.16); g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.16 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.35);
    o.connect(g).connect(audio.destination); o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.4);
  });
}
let wake = null;
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator && !wake && document.visibilityState === "visible") { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}

/* ================= render: shell ================= */
function render() {
  const s = active();
  document.body.classList.toggle("in-workout", !!(s && ui.workoutOpen));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === ui.tab));
  $("#app").innerHTML = ui.tab === "today" ? todayView() : ui.tab === "progress" ? progressView() : planView();
  renderWorkout();
  renderRest();
}

/* ================= Today ================= */
function todayView() {
  const d = today(), ph = phaseNow(d), s = active(), seq = s ? s.seq : E.nextSeq(state), tpl = E.template(plan, seq);
  const cycle = Math.floor(seq / plan.rotation.length) + 1;
  const kicker = ph.preview ? `Test week. Starts ${fmtDate(state.profile.startDate, { weekday: "short", month: "short", day: "numeric" })}` : `Week ${ph.week}, month ${ph.index + 1}`;
  const stale = s && minutesSince(s.startedAt) > 12 * 60;
  const rows = tpl.blocks.map((b) => {
    const key = b.ex.length > 1 ? `${b.slot}1` : b.slot;
    const ids = s ? blockKeys(s, b.slot).map((k) => s.entries[k].ex) : b.ex;
    const presc = E.prescription(plan, s ? s.phase : ph.index, b.slot);
    const done = s && blockDone(s, b.slot);
    return `<div class="lineup-row ${done ? "done" : ""}" style="${colorVar(key)}"><i class="bar"></i><div><div class="name">${ids.map((i) => esc(ex(i).name)).join(" + ")}</div><div class="pat">${esc(plan.slots[b.slot].label)}${b.slot === "X" ? " · optional" : ""}</div></div><span class="rx num">${rxText(presc).sets}</span></div>`;
  }).join("");
  const progress = s ? Object.values(s.entries).reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0) : 0;
  const total = s ? Object.values(s.entries).reduce((a, e) => a + e.sets.length, 0) : 0;
  const nextDay = nextTrainingDay();
  return `
  <header class="head"><div><div class="date">${fmtDate(d, { weekday: "long", month: "long", day: "numeric" })}</div><h1>Today</h1></div>
    <div class="head-btns"><button class="round-btn" data-act="sync" aria-label="Sync from Apple Health">${SYNC}</button><button class="round-btn" data-act="settings" aria-label="Settings">${GEAR}</button></div></header>
  ${installHint()}${updateBanner()}
  ${stale ? `<div class="banner"><p>You have an unfinished workout from ${fmtDate(s.date)}.</p><div class="acts"><button class="pill" data-act="resume">Resume</button><button class="pill" data-act="end">Save as finished</button><button class="pill" data-act="discard-sheet">Discard</button></div></div>` : ""}
  <section class="hero" aria-label="Today's workout">
    <div class="hero-top"><div><div class="hero-kicker">${kicker}</div><h2>Full body ${tpl.id.replace("W", "· W").replace("D", " D")}</h2></div>
      ${s ? `<span class="tag live">In progress</span>` : `<span class="tag">${esc(ph.name)}</span>`}</div>
    <div class="lineup">${rows}</div>
    <button class="cta" data-act="${s ? "resume" : "start"}">${s ? `Resume workout · ${progress}/${total} sets` : "Start workout"}</button>
    <div class="hero-foot"><span>${cycle > 1 ? `Cycle ${cycle} · ` : ""}Session ${(seq % plan.rotation.length) + 1} of ${plan.rotation.length}</span><span>About 55 min</span></div>
  </section>
  ${!s && nextDay && !state.profile.days.includes(E.parse(d).getDay()) ? `<p class="foot" style="margin:10px 4px 0">Rest day on your schedule. Next planned session: ${fmtDate(nextDay, { weekday: "long" })}. Walking counts.</p>` : ""}
  <div class="section"><h2>Daily</h2><span class="aside">${state.healthSyncAt && E.localISO(new Date(state.healthSyncAt)) === d ? `Health synced ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(state.healthSyncAt))}` : "Pull down to sync Health"}</span></div>
  ${tiles(d)}
  <div class="section"><h2>This week</h2><span class="aside">${weekDone()} of ${state.profile.days.length} sessions</span></div>
  ${weekStrip(d)}`;
}
function nextTrainingDay() { for (let i = 1; i <= 7; i++) { const x = E.addDays(today(), i); if (state.profile.days.includes(E.parse(x).getDay())) return x; } return null; }
function mondayOf(d) { const g = E.parse(d).getDay(); return E.addDays(d, -((g + 6) % 7)); }
function weekDone() { const m = mondayOf(today()); return state.sessions.filter((s) => s.completedAt && s.date >= m && s.date <= E.addDays(m, 6)).length; }
function weekStrip(d) {
  const m = mondayOf(d), did = new Set(state.sessions.filter((s) => s.completedAt).map((s) => s.date));
  return `<div class="week">${Array.from({ length: 7 }, (_, i) => {
    const x = E.addDays(m, i), dow = E.parse(x).getDay();
    return `<div class="wd ${x === d ? "today" : ""} ${state.profile.days.includes(dow) ? "train" : ""} ${did.has(x) ? "did" : ""}"><span>${"SMTWTFS"[dow]}</span><b>${E.parse(x).getDate()}</b><i></i></div>`;
  }).join("")}</div>`;
}
function tiles(d) {
  const l = state.logs[d] || {}, p = state.profile, series = E.weights(state.logs), avg = E.avg7(series, d);
  const pct = (v, goal) => Math.max(0, Math.min(100, ((v || 0) / goal) * 100));
  const steps = l.steps || 0, ringP = pct(steps, p.stepGoal), C = 2 * Math.PI * 13;
  return `<div class="tiles">
    <button class="tile" data-act="metric" data-k="steps"><span class="k">Steps <svg class="ring" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" stroke="var(--s3)"/><circle cx="15" cy="15" r="13" stroke="var(--t1)" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - ringP / 100)}" transform="rotate(-90 15 15)" stroke-linecap="round"/></svg></span>
      <span class="v num">${l.steps != null ? l.steps.toLocaleString() : "—"}</span><span class="s">Goal ${p.stepGoal.toLocaleString()}</span></button>
    <button class="tile" data-act="metric" data-k="weight"><span class="k">Weight</span><span class="v num">${l.weight ? fmtN(l.weight) : "—"}<small>lb</small></span><span class="s">${avg ? `7-day avg ${avg.toFixed(1)}` : "Weigh in after waking"}</span></button>
    <button class="tile" data-act="metric" data-k="active"><span class="k">Burned</span><span class="v num">${l.active != null ? l.active.toLocaleString() : "—"}<small>kcal</small></span><span class="s">Active calories</span></button>
    <button class="tile" data-act="metric" data-k="protein"><span class="k">Protein</span><span class="v num">${l.protein ? l.protein : "—"}<small>g</small></span><span class="s">of ${p.protein} g<span class="meter"><i style="width:${pct(l.protein, p.protein)}%"></i></span></span></button>
  </div>`;
}
function installHint() {
  const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  if (standalone || localStorage.getItem("drop50.hint") === "off" || !/iPhone|iPad/.test(navigator.userAgent)) return "";
  return `<div class="banner"><p><b>Install it first.</b> Tap Share, then “Add to Home Screen”, and only log from that icon — the installed app keeps its own data, separate from Safari.</p><div class="acts"><button class="pill" data-act="hint-off">Got it</button></div></div>`;
}
function updateBanner() { return ui.update ? `<div class="banner"><p>A new version of Drop50 is ready.</p><div class="acts"><button class="pill" data-act="apply-update">Update now</button></div></div>` : ""; }

/* ================= Workout ================= */
function renderWorkout() {
  const root = $("#workout"), s = active();
  if (!s || !ui.workoutOpen) { root.hidden = true; root.innerHTML = ""; keepAwake(false); return; }
  const scroll = root.scrollTop;
  root.hidden = false;
  const tpl = plan.rotation.find((t) => t.id === s.tpl), slots = slotsOf(s);
  if (!ui.open || !s.entries[blockKeys(s, ui.open)[0]]) ui.open = slots.find((sl) => !blockDone(s, sl)) || slots[0];
  const strip = slots.map((sl) => { const ks = blockKeys(s, sl), all = ks.reduce((a, k) => a + s.entries[k].sets.length, 0), d = ks.reduce((a, k) => a + entryProgress(s.entries[k]).d, 0); return `<i style="--c:var(--${sl});--p:${(d / all) * 100}%"></i>`; }).join("");
  root.innerHTML = `
    <div class="wk-bar"><div class="wk-row">
      <button class="round-btn" data-act="minimize" aria-label="Back to Today">${DOWN}</button>
      <div class="wk-title"><b>Full body · ${tpl.id}</b><span class="num" id="elapsed">${minutesSince(s.startedAt)} min</span></div>
      <button class="round-btn" data-act="wk-menu" aria-label="Workout options">${MORE}</button></div>
      <div class="strip">${strip}</div></div>
    <div class="wk-body">${slots.map((sl) => cardHTML(s, sl)).join("")}
      <div class="finish"><button class="cta" data-act="finish">Finish workout</button></div>
      <p class="foot" style="text-align:center">${esc(plan.one_rule)}</p></div>`;
  root.scrollTop = scroll;
  keepAwake(true);
}
function cardHTML(s, slot) {
  const keys = blockKeys(s, slot), first = s.entries[keys[0]], x = ex(first.ex), open = ui.open === slot;
  const done = keys.reduce((a, k) => a + entryProgress(s.entries[k]).d, 0), all = keys.reduce((a, k) => a + s.entries[k].sets.length, 0);
  const names = keys.map((k) => ex(s.entries[k].ex).name).join(" + ");
  const head = `<button class="card-head" data-act="open" data-slot="${slot}"><i class="bar"></i><span><span class="pat">${esc(plan.slots[slot].label)}</span><span class="name" style="display:block">${esc(names)}</span></span><span class="stat num ${done === all ? "ok" : ""}">${done === all ? "Done" : `${done}/${all}`}</span></button>`;
  if (!open) return `<section class="card" id="card-${slot}" style="--c:var(--${slot})">${head}</section>`;
  const rx = rxText(first.presc);
  const media = keys.map((k, idx) => mediaHTML(s.entries[k].ex, idx)).join("");
  const isPair = keys.length > 1;
  const lasts = keys.map((k) => lastHTML(s, k, isPair)).join("");
  return `<section class="card open" id="card-${slot}" style="--c:var(--${slot})">${head}<div class="card-body">
    ${media}
    <div class="ex-title"><div class="pat">${esc(plan.slots[slot].label)}${slot === "X" ? " · optional" : ""}</div><h3>${esc(names)}</h3>${isPair ? `<div class="ss">Superset: do <b>a</b> ${esc(ex(s.entries[keys[0]].ex).name.toLowerCase())}, then <b>b</b> ${esc(ex(s.entries[keys[1]].ex).name.toLowerCase())}, then rest.</div>` : x.uni ? `<div class="ss">Reps are per side.</div>` : ""}</div>
    <div class="rx-line"><span class="tag num">${rx.sets}</span><span class="tag">${rx.rir}</span><span class="tag num">Rest ${clock(plan.slots[slot].rest)}</span></div>
    ${lasts}
    <div class="sets"><div class="sets-head"><span>Set</span><span>Weight</span><span style="text-align:center">Reps</span><span></span></div>${setRows(s, keys)}</div>
    <div class="card-tools"><button class="pill" data-act="form" data-slot="${slot}">${ui.form[slot] ? "Hide form" : "Form tips"}</button><button class="pill" data-act="swap" data-slot="${slot}">Swap</button><button class="pill" data-act="history" data-ex="${keys.map((k) => s.entries[k].ex).join(",")}">History</button></div>
    ${ui.form[slot] ? keys.map((k) => formHTML(s.entries[k].ex)).join("") : ""}
  </div></section>`;
}
function mediaHTML(id, idx) {
  if (idx > 0) return ""; // one demo per card; the superset partner's demo is under Form tips
  const x = ex(id), still = matchMedia("(prefers-reduced-motion: reduce)").matches, step = x.frames === 3 ? 0.9 : 1.1;
  return `<div class="media ${still ? "" : "play"} ${x.frames === 2 ? "f2" : ""}" style="--dur:${step * x.frames}s;--step:${step}s" data-act="media" role="img" aria-label="${esc(x.name)} demonstration">
    ${Array.from({ length: x.frames }, (_, i) => `<img src="media/${x.id}-${i}.webp" alt="" style="--i:${i}" decoding="async">`).join("")}<div class="shade"></div></div>`;
}
function lastHTML(s, key, isPair) {
  const entry = s.entries[key], { hist, t } = targetsFor(s, key), last = hist[0];
  const name = isPair ? `<b>${esc(ex(entry.ex).name)}</b> · ` : "";
  if (!last) return `<div class="last">${name}<b>First time.</b><span class="goal">${esc(t.note)}</span></div>`;
  return `<div class="last ${t.kind === "up" || t.kind === "rpt-start" ? "up" : ""}">${name}Last ${fmtDate(last.date, { month: "short", day: "numeric" })}: <b class="num">${setsTxt(last.entry)}</b><span class="goal">${esc(t.note)}</span></div>`;
}
function setRows(s, keys) {
  const per = keys.map((k) => ({ k, entry: s.entries[k], x: ex(s.entries[k].ex), t: targetsFor(s, k).t }));
  const len = Math.max(...per.map((p) => p.entry.sets.length));
  // "next" = first undone set in alternating order
  let next = null;
  outer: for (let i = 0; i < len; i++) for (const p of per) if (p.entry.sets[i] && !p.entry.sets[i].done) { next = `${p.k}:${i}`; break outer; }
  let html = "";
  for (let i = 0; i < len; i++) for (const [j, p] of per.entries()) {
    const st = p.entry.sets[i]; if (!st) continue;
    const tg = p.t.sets[i] || p.t.sets[p.t.sets.length - 1];
    const wPh = tg.w == null ? "—" : p.x.basis === "added" && !tg.w ? "BW" : fmtN(tg.w);
    const id = `${p.k}:${i}`;
    html += `<div class="set ${st.done ? "done" : ""} ${id === next ? "next" : ""} ${keys.length > 1 && j === 0 && i > 0 ? "pair-gap" : ""}" style="--c:var(--${p.k[0]})">
      <span class="n">${i + 1}${keys.length > 1 ? "abc"[j] : ""}</span>
      <label class="fld"><input inputmode="decimal" enterkeyhint="next" aria-label="Set ${i + 1} weight" data-k="${p.k}" data-i="${i}" data-f="w" placeholder="${wPh}" value="${esc(st.w)}"><span class="u">${unit(p.x)}</span></label>
      <div class="reps"><button data-act="rep" data-d="-1" data-k="${p.k}" data-i="${i}" aria-label="One fewer rep">−</button><input inputmode="numeric" aria-label="Set ${i + 1} reps" data-k="${p.k}" data-i="${i}" data-f="r" placeholder="${tg.r}" value="${esc(st.r)}"><button data-act="rep" data-d="1" data-k="${p.k}" data-i="${i}" aria-label="One more rep">+</button></div>
      <button class="chk" data-act="check" data-k="${p.k}" data-i="${i}" aria-label="${st.done ? "Undo" : "Complete"} set ${i + 1}">${CHECK}</button></div>`;
  }
  return html;
}
function formHTML(id) {
  const x = ex(id), inc = incFor(id), opts = x.basis === "total" ? [5, 10, 15] : [2.5, 5, 10];
  return `<div class="form"><b>${esc(x.name)}</b><ol>${x.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>
    <div class="warn"><b>Watch for:</b> ${esc(x.mistake)}</div>
    <div class="inc"><span>Weight jumps</span><span class="seg">${opts.map((o) => `<button class="${o === inc ? "on" : ""}" data-act="inc" data-ex="${id}" data-v="${o}">${o} lb</button>`).join("")}</span></div></div>`;
}

/* ================= rest timer ================= */
function startRest(sec, label) { ui.rest = { end: Date.now() + sec * 1000, label, done: false }; renderRest(); }
function renderRest() {
  const r = ui.rest, el = $("#rest");
  if (!r || !active() || !ui.workoutOpen) { el.hidden = true; return; }
  const left = (r.end - Date.now()) / 1000;
  if (left <= 0 && !r.done) { r.done = true; chime(); setTimeout(() => { if (ui.rest === r) { ui.rest = null; renderRest(); } }, 4000); }
  el.hidden = false;
  el.className = `rest ${r.done ? "over" : ""}`;
  el.innerHTML = r.done ? `<span class="lbl">Rest's up. ${esc(r.label)}</span><button data-act="rest-skip">OK</button>`
    : `<span class="clock num">${clock(left)}</span><span class="lbl">${esc(r.label)}</span><button data-act="rest-add" data-v="-15">−15</button><button data-act="rest-add" data-v="15">+15</button><button data-act="rest-skip">Skip</button>`;
}
setInterval(() => {
  if (ui.rest && !ui.rest.done) { const c = $("#rest .clock"); if (c) c.textContent = clock((ui.rest.end - Date.now()) / 1000); if (Date.now() >= ui.rest.end) renderRest(); }
  const s = active(), el = $("#elapsed"); if (s && el) el.textContent = `${minutesSince(s.startedAt)} min`;
}, 250);

/* ================= workout actions ================= */
function startWorkout() {
  const seq = E.nextSeq(state), s = E.newSession(plan, seq, state.profile.startDate, today());
  state.sessions.push(s); save();
  ui.workoutOpen = true; ui.open = null; ui.form = {};
  unlockAudio(); render();
}
function setField(key, i, f, v) {
  const s = active(); if (!s) return;
  const st = s.entries[key].sets[i];
  st[f] = v === "" ? "" : Number(v);
  save();
}
function check(key, i) {
  const s = active(), entry = s.entries[key], st = entry.sets[i], x = ex(entry.ex);
  unlockAudio();
  if (st.done) { st.done = false; save(); refreshCard(slotOf(key)); toast("Set unchecked"); return; }
  const tg = targetsFor(s, key).t.sets[i];
  const w = n(st.w) ?? tg.w, r = n(st.r) ?? tg.r;
  if (w == null) { const inp = $(`input[data-k="${key}"][data-i="${i}"][data-f="w"]`); inp?.focus(); toast("Enter the weight you used"); return; }
  if (!r) { toast("Enter your reps"); return; }
  Object.assign(st, { w, r, done: true });
  haptic(); save();
  const slot = slotOf(key), keys = blockKeys(s, slot);
  // superset: rest only after the pair is done for this round
  const pairDone = keys.every((k) => !s.entries[k].sets[i] || s.entries[k].sets[i].done);
  if (blockDone(s, slot)) {
    ui.rest = null;
    const nextSlot = slotsOf(s).find((sl) => !blockDone(s, sl));
    if (nextSlot) { startRest(plan.slots[slot].rest, ex(blockKeys(s, nextSlot).map((k) => s.entries[k].ex)[0]).name); setTimeout(() => { ui.open = nextSlot; renderWorkout(); $(`#card-${nextSlot}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 450); }
    else toast("Every set done. Finish when you're ready.");
    refreshCard(slot);
  } else {
    if (pairDone) startRest(plan.slots[slot].rest, keys.length > 1 ? `Round ${i + 2} next` : `Set ${i + 2} next`);
    refreshCard(slot);
  }
}
function refreshCard(slot) {
  const s = active(), el = $(`#card-${slot}`);
  if (!s || !el) return renderWorkout();
  el.outerHTML = cardHTML(s, slot);
  const strip = $(".strip");
  if (strip) strip.outerHTML = `<div class="strip">${slotsOf(s).map((sl) => { const ks = blockKeys(s, sl), all = ks.reduce((a, k) => a + s.entries[k].sets.length, 0), d = ks.reduce((a, k) => a + entryProgress(s.entries[k]).d, 0); return `<i style="--c:var(--${sl});--p:${(d / all) * 100}%"></i>`; }).join("")}</div>`;
  renderRest();
}
function finishWorkout(early) {
  const s = active(); if (!s) return;
  s.completedAt = new Date().toISOString(); if (early) s.ended = true;
  ui.rest = null; ui.workoutOpen = false; save(); keepAwake(false);
  const beat = Object.values(s.entries).filter((e) => E.doneSets(e).length && E.beatLast(e, E.exposures(state, e.ex, s.id)[0])).map((e) => ex(e.ex).name);
  const sets = Object.values(s.entries).reduce((a, e) => a + E.doneSets(e).length, 0), total = Object.values(s.entries).reduce((a, e) => a + e.sets.length, 0);
  const mins = Math.round((Date.parse(s.completedAt) - Date.parse(s.startedAt)) / 60000);
  const stale = !state.lastBackupAt || Date.now() - Date.parse(state.lastBackupAt) > 3 * 86400000;
  render();
  openSheet(`<h2>Workout saved</h2><p class="lede">${plural(sets, "set")} of ${total} in ${plural(mins, "minute")}.</p>
    <div class="group">${beat.length ? beat.map((b) => `<div class="row"><span class="dot-c" style="--c:var(--D)"></span><span class="grow">${esc(b)}</span><span class="delta pos">Beat last time</span></div>`).join("") : `<div class="row"><span class="grow muted">No lifts beat last time yet — the first week sets your baseline.</span></div>`}</div>
    <div class="stack">${stale ? `<button class="cta" data-act="backup">Save a backup to Files</button><button class="cta ghost" data-act="close-sheet">Done</button>` : `<button class="cta" data-act="close-sheet">Done</button>`}</div>`);
}
function discardWorkout() {
  const s = active(); if (!s) return;
  state.sessions = state.sessions.filter((x) => x !== s);
  ui.rest = null; ui.workoutOpen = false; save(); closeSheet(); render(); toast("Workout discarded");
}

/* ================= sheets ================= */
function openSheet(html) {
  $("#sheet-root").innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
  const sh = $(".sheet"); let y0 = null, dy = 0;
  sh.addEventListener("touchstart", (e) => { if (sh.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sh.addEventListener("touchmove", (e) => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  sh.addEventListener("touchend", () => { if (y0 == null) return; y0 = null; if (dy > 110) closeSheet(); else sh.style.transform = ""; });
}
function closeSheet() { $("#sheet-root").innerHTML = ""; ui.discardArmed = false; document.body.classList.remove("kb"); }

function metricSheet(k) {
  const d = today(), l = state.logs[d] || {}, p = state.profile;
  const cfg = {
    weight: { t: "Weight", u: "lb", lede: "Morning, after the bathroom, before food. The 7-day average is what counts.", ph: fmtN(E.weights(state.logs).at(-1)?.[1] ?? p.startWeight), mode: "decimal" },
    steps: { t: "Steps", u: "steps", lede: `${plan.steps.split.map(([w, v]) => `${w.toLowerCase()} ${v.toLocaleString()}`).join(", ")}.`, ph: "0", mode: "numeric" },
    active: { t: "Calories burned", u: "kcal", lede: "Active calories from Apple Health. Health sync fills this in.", ph: "0", mode: "numeric" },
    calories: { t: "Calories", u: "kcal", lede: `Target ${p.calories.toLocaleString()}. Add as you eat or enter the day's total.`, ph: "0", mode: "numeric", add: [300, 500, 700] },
    protein: { t: "Protein", u: "g", lede: `Target ${p.protein} g — 35–50 g a meal gets you there.`, ph: "0", mode: "numeric", add: [25, 40, 50] },
  }[k];
  openSheet(`<h2>${cfg.t}</h2><p class="lede">${esc(cfg.lede)}</p>
    <div class="big-input"><input id="metric" inputmode="${cfg.mode}" placeholder="${cfg.ph}" value="${l[k] ?? ""}" aria-label="${cfg.t}"><span>${cfg.u}</span></div>
    ${cfg.add ? `<div class="chips">${cfg.add.map((a) => `<button class="pill num" data-act="metric-add" data-v="${a}">+${a}</button>`).join("")}</div>` : k === "weight" ? `<div class="chips"><button class="pill num" data-act="metric-add" data-v="-0.2">−0.2</button><button class="pill num" data-act="metric-add" data-v="0.2">+0.2</button></div>` : ""}
    <div class="stack"><button class="cta" data-act="metric-save" data-k="${k}">Save</button>${l[k] != null ? `<button class="cta ghost small" data-act="metric-clear" data-k="${k}">Clear today's entry</button>` : ""}</div>`);
  const inp = $("#metric"); inp.focus(); inp.select?.();
}
function swapSheet(slot) {
  const s = active(), keys = blockKeys(s, slot);
  const groups = keys.map((k) => {
    const cur = s.entries[k].ex, pool = slot === "F" ? plan.pools[ex(cur).arm === "bi" ? "Fb" : "Ft"] : plan.pools[slot];
    return `<div class="section" style="margin-top:14px"><h2 style="font-size:17px">Instead of ${esc(ex(cur).name)}</h2></div><div class="group">${pool.filter((id) => id !== cur).map((id) => `<button class="row" style="width:100%;text-align:left" data-act="do-swap" data-k="${k}" data-ex="${id}"><span class="grow">${esc(ex(id).name)}<div class="sub">${E.exposures(state, id).length ? `Last: ${setsTxt(E.exposures(state, id)[0].entry)}` : "Not logged yet"}</div></span>${CHEV}</button>`).join("")}</div>`;
  }).join("");
  openSheet(`<h2>Swap exercise</h2><p class="lede">Machine taken? Pick another ${esc(plan.slots[slot].label.toLowerCase())} move — its own history comes with it.</p>${groups}`);
}
function historySheet(ids) {
  openSheet(ids.split(",").map((id, i) => {
    const hist = E.exposures(state, id);
    return `<h2${i ? ' style="margin-top:22px"' : ""}>${esc(ex(id).name)}</h2><p class="lede">${hist.length ? plural(hist.length, "session") : "No sets logged yet."}</p>
    ${hist.length ? `<div class="group hist">${hist.slice(0, 30).map((h) => `<div class="row"><span class="grow"><span class="sets-txt">${setsTxt(h.entry)}</span><div class="sub">${fmtDate(h.date, { weekday: "short", month: "short", day: "numeric" })}${h.full ? "" : ", unfinished"}</div></span></div>`).join("")}</div>` : ""}`;
  }).join(""));
}
function menuSheet() {
  openSheet(`<h2>Workout options</h2><p class="lede">Ending early saves what you logged and moves you to the next session.</p>
    <div class="stack"><button class="cta ghost" data-act="end">End workout now</button><button class="cta danger" data-act="discard">${ui.discardArmed ? "Tap again to discard" : "Discard this workout"}</button></div>`);
}
function sessionPreview(seq) {
  const tpl = plan.rotation[seq];
  openSheet(`<h2>Full body · ${tpl.id}</h2><p class="lede">Week ${tpl.week}, day ${tpl.day} of the 3-week rotation.</p>
    <div class="group">${tpl.blocks.map((b) => `<div class="row" style="${colorVar(b.slot)}"><span class="dot-c"></span><span class="grow">${b.ex.map((i) => esc(ex(i).name)).join(" + ")}<div class="sub">${esc(plan.slots[b.slot].label)}${b.slot === "X" ? " · optional" : ""}</div></span></div>`).join("")}</div>`);
}
function settingsSheet() {
  const p = state.profile, f = (label, key, val, type = "number", mode = "numeric") => `<label class="row field-row"><span class="grow">${label}</span><input name="${key}" type="${type}" ${type === "number" ? `inputmode="${mode}"` : ""} value="${esc(val)}"></label>`;
  openSheet(`<h2>Settings</h2><p class="lede">Version ${VERSION}. Everything is stored on this phone.</p>
    <div class="group" id="settings">
      ${f("Program start", "startDate", p.startDate, "date")}
      <div class="row days-row"><span class="grow">Training days</span><span class="days">${[1, 2, 3, 4, 5, 6, 0].map((dw) => `<button class="${p.days.includes(dw) ? "on" : ""}" data-act="day" data-v="${dw}" aria-pressed="${p.days.includes(dw)}">${"SMTWTFS"[dw]}</button>`).join("")}</span></div>
      ${f("Starting weight (lb)", "startWeight", p.startWeight, "number", "decimal")}
      ${f("Goal weight (lb)", "goalWeight", p.goalWeight, "number", "decimal")}
      ${f("Calories / day", "calories", p.calories)}
      ${f("Protein / day (g)", "protein", p.protein)}
      ${f("Steps / day", "stepGoal", p.stepGoal)}
    </div>
    <div class="stack"><button class="cta" data-act="save-settings">Save settings</button></div>
    <div class="section"><h2 style="font-size:17px">Apple Health</h2></div>
    <div class="group"><button class="row" style="width:100%;text-align:left" data-act="health-setup"><span class="grow">Set up Health sync<div class="sub">${state.healthSyncAt ? `Last synced ${fmtDate(E.localISO(new Date(state.healthSyncAt)))}` : "Steps, weight and food from Apple Health"}</div></span>${CHEV}</button></div>
    <div class="section"><h2 style="font-size:17px">Your data</h2></div>
    <div class="group">
      <button class="row" style="width:100%;text-align:left" data-act="backup"><span class="grow">Save a backup to Files<div class="sub">${state.lastBackupAt ? `Last backup ${fmtDate(E.localISO(new Date(state.lastBackupAt)))}` : "No backup yet"}</div></span>${CHEV}</button>
      <label class="row" style="width:100%"><span class="grow">Restore from a backup<div class="sub">Replaces what's on this phone</div></span>${CHEV}<input type="file" id="restore" accept=".json,application/json,text/plain" hidden></label>
      <button class="row" style="width:100%;text-align:left;color:var(--danger)" data-act="erase"><span class="grow">${ui.discardArmed ? "Tap again to erase everything" : "Erase all data"}<div class="sub">Use this after your test week</div></span></button>
    </div>
    <p class="foot" style="margin-top:14px">${esc(plan.media_credit)}</p>`);
}
function saveSettings() {
  const root = $("#settings"), p = { ...state.profile };
  root.querySelectorAll("input[name]").forEach((i) => { p[i.name] = i.type === "date" ? i.value : Number(i.value); });
  p.days = [...root.querySelectorAll(".days .on")].map((b) => Number(b.dataset.v));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)) return toast("Pick a start date");
  if (p.days.length < 2) return toast("Pick at least two training days");
  if (!(p.goalWeight > 0 && p.startWeight > p.goalWeight)) return toast("Goal weight should be below your starting weight");
  if (!(p.calories >= 1200 && p.protein >= 50 && p.stepGoal >= 1000)) return toast("Check your daily targets");
  state.profile = p; save(); closeSheet(); render(); toast("Settings saved");
}

/* ================= Apple Health (Shortcut → clipboard) ================= */
// Reads the shortcut's clipboard hand-off. On return from Shortcuts it runs automatically; if iOS blocks a read without a tap, the Finish sheet offers one.
function syncHealth() {
  if (!navigator.clipboard?.readText) { healthSetupSheet(); return; }
  navigator.clipboard.readText().then(importHealth).catch(() => toast("Couldn't read the clipboard. Try again."));
}
function importHealth(text) {
  { state.healthLastText = String(text ?? "").slice(0, 300); save();
    const h = E.parseHealth(text), d = today();
    if (!h) { toast(`No Health numbers on the clipboard. Run ${state.profile.shortcutName || "Drop50 Sync"} first.`); return; }
    state.logs[d] = E.mergeHealth(state.logs[d], h);
    try { localStorage.removeItem(PENDING); } catch {}
    state.healthSyncAt = new Date().toISOString(); save(); closeSheet(); render(); haptic();
    const bits = [h.steps != null && `${h.steps.toLocaleString()} steps`, h.weight && `${fmtN(Math.round(h.weight * 10) / 10)} lb`, h.active != null && `${h.active.toLocaleString()} kcal burned`, h.calories && `${h.calories.toLocaleString()} kcal`, h.protein && `${h.protein} g protein`].filter(Boolean);
    toast(`Synced ${bits.join(", ")}`);
  }
}
function healthSetupSheet() {
  const step = (t) => `<li>${t}</li>`;
  openSheet(`<h2>Sync Apple Health</h2><p class="lede">A shortcut reads Health and copies the numbers; Drop50 brings them in. Already built yours? Just check the name below.</p>
    <div class="form" style="margin-top:0"><b>Build the shortcut</b><ol>
      ${step("Open <b>Shortcuts</b>, tap <b>+</b>, name it <b>Health → Drop50</b>.")}
      ${step("Add <b>Find Health Samples</b>: Type <b>Steps</b>, Start Date <b>is today</b>, Group By <b>Day</b>.")}
      ${step("Add <b>Find Health Samples</b>: Type <b>Weight</b>, Sort by <b>Start Date</b>, Order <b>Latest First</b>, Limit <b>1</b>.")}
      ${step("Add <b>Find Health Samples</b>: Type <b>Active Energy</b>, Start Date <b>is today</b>, Group By <b>Day</b>.")}
      ${step("Add <b>Text</b>: <b>drop50 steps=</b>[steps] <b>weight=</b>[weight] <b>active=</b>[active energy], inserting each result as a variable.")}
      ${step("Add <b>Copy to Clipboard</b>. Run it once and allow Health access.")}
    </ol></div>
    ${state.healthLastText ? `<div class="form"><b>Last thing your shortcut sent</b><div class="warn num" style="margin-top:6px;word-break:break-word;-webkit-user-select:text;user-select:text">${esc(state.healthLastText)}</div></div>` : ""}
    <div class="form"><b>Connect it to Drop50</b>
      <label class="row field-row" style="padding:10px 0 4px"><span class="grow">Shortcut name</span><input id="shortcutName" type="text" autocapitalize="off" autocomplete="off" value="${esc(state.profile.shortcutName || "Drop50 Sync")}" style="width:170px"></label>
      <div class="warn">Type it exactly as it appears in Shortcuts.</div></div>
    <div class="form"><b>Every day</b><ol>
      ${step("On Today, <b>pull down</b> or tap the sync icon. Drop50 runs your shortcut.")}
      ${step("Come back to Drop50 (tap <b>◀</b> in the top-left corner or swipe the bottom bar). Today's numbers fill in.")}
    </ol><div class="warn">Steps from Health replace what's in Drop50 for today. Weight, calories and protein only fill in when Health has them.</div></div>
    <div class="stack"><button class="cta" data-act="save-shortcut">Save and run the shortcut</button><button class="cta ghost small" data-act="paste-health">Already ran it? Bring in the numbers</button></div>`);
}

// Drop50 launches the user's shortcut, then waits for them to come back and paste.
const PENDING = "drop50.pendingSync";
function openExternal(url) { location.href = url; }
function runShortcut() {
  closeSheet();
  try { localStorage.setItem(PENDING, String(Date.now())); } catch {}
  openExternal(`shortcuts://run-shortcut?name=${encodeURIComponent(state.profile.shortcutName || "Drop50 Sync")}`);
}
function checkPendingSync() {
  let t = 0; try { t = Number(localStorage.getItem(PENDING) || 0); } catch {}
  if (!t) return;
  if (Date.now() - t > 10 * 60000) { localStorage.removeItem(PENDING); return; }
  if (ui.workoutOpen) return;
  navigator.clipboard?.readText?.().then(importHealth).catch(() => { if (!$(".sheet")) finishSyncSheet(); }) ?? finishSyncSheet();
}
function finishSyncSheet() {
  openSheet(`<h2>Finish Health sync</h2><p class="lede">${esc(state.profile.shortcutName || "Drop50 Sync")} copied today's numbers. Tap to bring them in.</p>
    <div class="stack"><button class="cta" data-act="paste-health">Bring in Health data</button><button class="cta ghost small" data-act="run-shortcut">Run the shortcut again</button></div>`);
}

/* ================= pull to sync (Today) ================= */
(() => {
  let y0 = null, dy = 0, armed = false;
  const ind = document.createElement("div");
  ind.className = "pull"; ind.innerHTML = SYNC; document.body.append(ind);
  const reset = () => { ind.style.transform = ""; ind.classList.remove("show", "armed"); $("#app").style.transform = ""; $("#app").classList.remove("pulling"); };
  document.addEventListener("touchstart", (e) => {
    y0 = ui.tab === "today" && !ui.workoutOpen && !$(".sheet") && scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null; dy = 0; armed = false;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || scrollY > 0) { reset(); return; }
    const pull = Math.min(110, dy * 0.5);
    armed = pull >= 64;
    $("#app").classList.add("pulling"); $("#app").style.transform = `translateY(${pull}px)`;
    ind.classList.add("show"); ind.classList.toggle("armed", armed);
    ind.style.transform = `translate(-50%, ${pull - 44}px) rotate(${pull * 3.2}deg)`;
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (y0 == null) return;
    y0 = null; const go = armed; reset();
    if (go) runShortcut();
  });
})();

/* ================= backup ================= */
function backupFile() {
  const data = { format: "drop50-backup", version: 2, exportedAt: new Date().toISOString(), state };
  return new File([JSON.stringify(data, null, 1)], `drop50-backup-${today()}.json`, { type: "application/json" });
}
function backup() {
  const file = backupFile(), done = () => { state.lastBackupAt = new Date().toISOString(); save(); toast("Backup saved"); closeSheet(); render(); };
  // navigator.share must run synchronously inside the tap
  if (navigator.canShare?.({ files: [file] })) { navigator.share({ files: [file], title: "Drop50 backup" }).then(done).catch((e) => { if (e?.name !== "AbortError") toast("Backup didn't save — try again"); }); return; }
  const a = document.createElement("a"), url = URL.createObjectURL(file);
  a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); done();
}
function restore(fileInput) {
  const file = fileInput.files?.[0]; if (!file) return;
  file.text().then((txt) => {
    const d = JSON.parse(txt);
    if (!E.validBackup(d)) throw new Error("bad");
    state = E.migrate(d.state, today()); save(); closeSheet(); render(); toast("Backup restored");
  }).catch(() => toast("That file isn't a Drop50 backup"));
}

/* ================= Progress ================= */
function progressView() {
  const p = state.profile, series = E.weights(state.logs), last = series.at(-1), avg = last ? E.avg7(series, last[0]) : null;
  const lost = avg ? p.startWeight - avg : 0, toGo = p.startWeight - p.goalWeight;
  const done = state.sessions.filter((s) => s.completedAt);
  const lifts = plan.exercises.map((x) => ({ x, h: E.exposures(state, x.id) })).filter((o) => o.h.length);
  const streak = weekStreak();
  return `<header class="head"><div><div class="date">${done.length ? `${plural(done.length, "workout")} logged` : "Your trend lives here"}</div><h1>Progress</h1></div></header>
  <section class="stat-hero"><div class="big num">${avg ? avg.toFixed(1) : "—"}<small>lb</small></div>
    <div class="cap">${avg ? `7-day average · ${lost >= 0 ? `${lost.toFixed(1)} lb down` : `${(-lost).toFixed(1)} lb up`} of ${toGo}` : "Log your weight each morning to start the trend."}</div>
    <div class="meter" style="margin-top:12px"><i style="width:${Math.max(0, Math.min(100, (lost / toGo) * 100))}%"></i></div>
    ${series.length >= 2 ? chart(series) : ""}</section>
  <div class="section"><h2>Training</h2></div>
  <div class="trio"><div><b>${done.length}</b><span>workouts</span></div><div><b>${weekDone()}/${p.days.length}</b><span>this week</span></div><div><b>${streak}</b><span>week streak</span></div></div>
  <div class="section"><h2>Lifts</h2><span class="aside">vs. last time</span></div>
  ${lifts.length ? `<div class="group">${lifts.map(({ x, h }) => {
    const best = (e) => Math.max(...E.doneSets(e).map((s) => E.e1rm(n(s.w) || 0, n(s.r), 0)));
    const d = h[1] ? best(h[0].entry) - best(h[1].entry) : null;
    const top = E.doneSets(h[0].entry).reduce((a, s) => ((n(s.w) || 0) > (n(a.w) || 0) ? s : a));
    return `<button class="row" style="width:100%;text-align:left;${colorVar(x.slot)}" data-act="history" data-ex="${x.id}"><span class="dot-c"></span><span class="grow">${esc(x.name)}<div class="sub num">Top set ${n(top.w) ? fmtN(n(top.w)) : "BW"} × ${top.r} · ${fmtDate(h[0].date, { month: "short", day: "numeric" })}</div></span><span class="delta ${d > 0 ? "pos" : ""}">${d == null ? "New" : d > 0.5 ? "Up" : d < -0.5 ? "Down" : "Even"}</span>${CHEV}</button>`;
  }).join("")}</div>` : `<div class="empty">Finish your first workout and every lift shows up here, with what to beat next time.</div>`}`;
}
function weekStreak() {
  let streak = 0, m = mondayOf(today());
  const need = Math.min(state.profile.days.length, 3), count = (mon) => state.sessions.filter((s) => s.completedAt && s.date >= mon && s.date <= E.addDays(mon, 6)).length;
  if (count(m) >= need) streak++;
  for (let i = 1; i < 60; i++) { const mon = E.addDays(m, -7 * i); if (count(mon) >= need) streak++; else break; }
  return streak;
}
function chart(series) {
  const pts = series.slice(-90), W = 340, H = 150, pad = { l: 30, r: 6, t: 10, b: 20 };
  const vals = pts.map((p) => p[1]), goal = state.profile.goalWeight;
  let lo = Math.min(...vals) - 1.5, hi = Math.max(...vals) + 1.5; if (hi - lo < 6) { const m = (hi + lo) / 2; lo = m - 3; hi = m + 3; }
  const d0 = pts[0][0], span = Math.max(1, E.daysBetween(d0, pts.at(-1)[0]));
  const x = (d) => pad.l + (E.daysBetween(d0, d) / span) * (W - pad.l - pad.r), y = (v) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const avgLine = pts.map(([d]) => `${x(d).toFixed(1)},${y(E.avg7(series, d)).toFixed(1)}`).join(" ");
  const ticks = [hi, (hi + lo) / 2, lo];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend, ${pts.length} weigh-ins">
    ${ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="lab" x="0" y="${y(t) + 4}">${Math.round(t)}</text>`).join("")}
    ${goal > lo && goal < hi ? `<line class="goal" x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal)}" y2="${y(goal)}"/>` : ""}
    ${pts.map(([d, v]) => `<circle class="dot" cx="${x(d).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6"/>`).join("")}
    <polyline class="avg" points="${avgLine}"/>
    <text class="lab" x="${pad.l}" y="${H - 4}">${fmtDate(d0, { month: "short", day: "numeric" })}</text><text class="lab" x="${W - pad.r}" y="${H - 4}" text-anchor="end">${fmtDate(pts.at(-1)[0], { month: "short", day: "numeric" })}</text></svg>`;
}

/* ================= Plan ================= */
function planView() {
  const p = state.profile, ph = phaseNow(), start = p.startDate, nextSeq = (active()?.seq ?? E.nextSeq(state)) % plan.rotation.length;
  const mc = E.macros(plan.diet, p.goalWeight);
  const meal = ui.meal ?? 0;
  return `<header class="head"><div><div class="date">${esc(plan.title)}</div><h1>Plan</h1></div><button class="round-btn" data-act="settings" aria-label="Settings">${GEAR}</button></header>
  <div class="rule">${esc(plan.one_rule)}</div>
  <div class="section"><h2>90 days</h2><span class="aside">${ph.preview ? "Starts " + fmtDate(start, { month: "short", day: "numeric" }) : `Day ${ph.day}`}</span></div>
  <div class="months">${plan.phases.map((m, i) => `<article class="month ${i === ph.index && !ph.preview ? "now" : ""}"><div class="month-top"><h3>Month ${m.month}: ${esc(m.name)}</h3><span class="when">${fmtDate(E.addDays(start, i * 28), { month: "short", day: "numeric" })}${i < 2 ? ` – ${fmtDate(E.addDays(start, i * 28 + 27), { month: "short", day: "numeric" })}` : " on"}</span></div><p>${esc(m.summary)}</p><ul>${m.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></article>`).join("")}</div>
  <div class="section"><h2>Rotation</h2><span class="aside">3 weeks, then repeat</span></div>
  <div class="rot"><span></span>${["Day 1", "Day 2", "Day 3"].map((d) => `<span class="h" style="justify-content:center">${d}</span>`).join("")}
    ${[0, 1, 2].map((w) => `<span class="h">Week ${w + 1}</span>${[0, 1, 2].map((d) => { const i = w * 3 + d, t = plan.rotation[i]; return `<button class="c ${i === nextSeq ? "next" : ""}" data-act="preview" data-seq="${i}"><span class="bars">${t.blocks.filter((b) => b.slot !== "X").map((b) => `<i style="--c:var(--${b.slot})"></i>`).join("")}</span><b>${esc(ex(t.blocks[0].ex[0]).name.replace("Dumbbell ", "DB "))}</b><span>${esc(ex(t.blocks[3].ex[0]).name.replace("Dumbbell ", "DB "))}</span></button>`; }).join("")}`).join("")}</div>
  <div class="legend">${["A", "B", "C", "D", "E", "F"].map((s) => `<span style="${colorVar(s)}"><i class="dot-c"></i>${esc(plan.slots[s].label)}</span>`).join("")}</div>
  <div class="section"><h2>Food</h2><span class="aside">${p.calories.toLocaleString()} kcal / day</span></div>
  <div class="group"><div class="row"><span class="grow">${esc(plan.diet.headline)}<div class="sub">Target = maintenance minus ${plan.diet.deficit[0]}–${plan.diet.deficit[1]}. Your 3-week weight trend tells you if ${p.calories.toLocaleString()} is right.</div></span></div></div>
  <div class="macro" style="margin-top:10px"><div><b class="num">${mc.protein[0]}–${mc.protein[1]}</b><span>g protein</span></div><div><b class="num">${mc.carbs[0]}–${mc.carbs[1]}</b><span>g carbs</span></div><div><b class="num">${mc.fat[0]}–${mc.fat[1]}</b><span>g fat</span></div></div>
  <p class="foot" style="margin:8px 4px 0">Ranges use your goal weight (${p.goalWeight} lb ≈ ${mc.kg} kg): protein 1.8–2.2, carbs 2–4, fat 0.6–1 g per kg.</p>
  <div class="section"><h2 style="font-size:17px">Keep it simple</h2></div>
  <div class="foods">${plan.diet.foods.map((f) => `<span>${esc(f)}</span>`).join("")}</div>
  <div class="section"><h2 style="font-size:17px">Sample days</h2><span class="seg">${plan.diet.meal_plans.map((m, i) => `<button class="${i === meal ? "on" : ""}" data-act="meal" data-v="${i}">${esc(m.name)}</button>`).join("")}</span></div>
  <p class="foot" style="margin:0 4px 8px">About ${plan.diet.meal_plans[meal].kcal.toLocaleString()} calories, as an example.</p><div class="group">${plan.diet.meal_plans[meal].meals.map((m, i) => `<div class="row"><span class="muted num" style="width:54px">Meal ${i + 1}</span><span class="grow">${esc(m)}</span></div>`).join("")}</div>
  <p class="foot" style="margin:8px 4px 0">${esc(plan.diet.motto)}</p>
  <div class="section"><h2>Steps</h2><span class="aside">${p.stepGoal.toLocaleString()} a day</span></div>
  <div class="group">${plan.steps.split.map(([w, v]) => `<div class="row"><span class="grow">${esc(w)}</span><span class="num muted">${v.toLocaleString()}</span></div>`).join("")}</div>`;
}

/* ================= events ================= */
const actions = {
  tab: (b) => { ui.tab = b.dataset.tab; render(); scrollTo({ top: 0 }); },
  start: () => startWorkout(),
  resume: () => { ui.workoutOpen = true; unlockAudio(); render(); },
  minimize: () => { ui.workoutOpen = false; render(); },
  open: (b) => { ui.open = b.dataset.slot; renderWorkout(); $(`#card-${ui.open}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); },
  check: (b) => check(b.dataset.k, +b.dataset.i),
  rep: (b) => {
    const s = active(), key = b.dataset.k, i = +b.dataset.i, st = s.entries[key].sets[i];
    const base = n(st.r) ?? targetsFor(s, key).t.sets[i].r;
    st.r = Math.max(0, base + Number(b.dataset.d)); save();
    const inp = $(`input[data-k="${key}"][data-i="${i}"][data-f="r"]`); if (inp) inp.value = st.r;
  },
  form: (b) => { ui.form[b.dataset.slot] = !ui.form[b.dataset.slot]; refreshCard(b.dataset.slot); },
  swap: (b) => { const s = active(); if (blockKeys(s, b.dataset.slot).some((k) => s.entries[k].sets.some((x) => x.done))) return toast("Uncheck this exercise's sets to swap it"); swapSheet(b.dataset.slot); },
  "do-swap": (b) => { const s = active(), e = s.entries[b.dataset.k]; e.ex = b.dataset.ex; e.sets = e.presc.map(() => ({ w: "", r: "", done: false })); save(); closeSheet(); refreshCard(slotOf(b.dataset.k)); toast(`Swapped in ${ex(b.dataset.ex).name}`); },
  history: (b) => historySheet(b.dataset.ex),
  inc: (b) => { state.inc[b.dataset.ex] = Number(b.dataset.v); save(); refreshCard(ui.open); },
  media: (b) => b.classList.toggle("play"),
  "wk-menu": () => menuSheet(),
  finish: () => finishWorkout(false),
  end: () => { closeSheet(); finishWorkout(true); },
  "discard-sheet": () => menuSheet(),
  discard: () => { if (!ui.discardArmed) { ui.discardArmed = true; menuSheet(); return; } discardWorkout(); },
  "rest-add": (b) => { if (ui.rest) { ui.rest.end += Number(b.dataset.v) * 1000; renderRest(); } },
  "rest-skip": () => { ui.rest = null; renderRest(); },
  "close-sheet": () => closeSheet(),
  metric: (b) => metricSheet(b.dataset.k),
  "metric-add": (b) => { const i = $("#metric"); const v = (n(i.value) ?? (b.dataset.v.includes(".") ? n(i.placeholder) : 0)) + Number(b.dataset.v); i.value = fmtN(Math.round(v * 10) / 10); },
  "metric-save": (b) => {
    const k = b.dataset.k, v = n($("#metric").value), d = today();
    if (v == null || v < 0) return toast("Enter a number");
    if (k === "weight" && (v < 80 || v > 800)) return toast("That weight looks off — check it");
    (state.logs[d] ||= {})[k] = k === "weight" ? Math.round(v * 10) / 10 : Math.round(v);
    save(); closeSheet(); render(); haptic();
  },
  "metric-clear": (b) => { const d = today(); if (state.logs[d]) delete state.logs[d][b.dataset.k]; save(); closeSheet(); render(); },
  settings: () => settingsSheet(),
  sync: () => runShortcut(),
  "run-shortcut": () => runShortcut(),
  "paste-health": () => syncHealth(),
  "save-shortcut": () => { const v = $("#shortcutName").value.trim(); if (!v) return toast("Enter your shortcut's name"); state.profile.shortcutName = v; save(); runShortcut(); },
  "health-setup": () => healthSetupSheet(),
  day: (b) => { b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on")); },
  "save-settings": () => saveSettings(),
  backup: () => backup(),
  erase: () => { if (!ui.discardArmed) { ui.discardArmed = true; settingsSheet(); return; } localStorage.removeItem(E.STORE); localStorage.removeItem("drop50.v1"); state = E.defaultState(today()); save(); closeSheet(); ui.workoutOpen = false; render(); toast("All data erased"); },
  preview: (b) => sessionPreview(+b.dataset.seq),
  meal: (b) => { ui.meal = +b.dataset.v; render(); },
  "hint-off": () => { localStorage.setItem("drop50.hint", "off"); render(); },
  "apply-update": () => { ui.update?.postMessage("skip-waiting"); },
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const fn = actions[b.dataset.act];
  if (fn) { e.preventDefault(); fn(b, e); }
});
document.addEventListener("change", (e) => {
  const i = e.target;
  if (i.id === "restore") return restore(i);
  if (i.dataset.f && i.dataset.k) setField(i.dataset.k, +i.dataset.i, i.dataset.f, i.value.replace(",", "."));
});
document.addEventListener("keydown", (e) => {
  const i = e.target;
  if (e.key === "Enter" && i.id === "metric") $('[data-act="metric-save"]')?.click();
  if (e.key === "Enter" && i.dataset.f) { e.preventDefault(); i.blur(); }
});
// hide floating chrome while the keyboard is up
window.visualViewport?.addEventListener("resize", () => document.body.classList.toggle("kb", window.visualViewport.height < window.innerHeight * 0.75));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (active() && ui.workoutOpen) keepAwake(true);
  navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
  render();
  checkPendingSync();
});

/* ================= boot ================= */
async function boot() {
  load();
  try { plan = await (await fetch("plan.json")).json(); }
  catch { $("#app").innerHTML = `<p class="empty">Drop50 needs one online visit to download your plan. Connect and reopen.</p>`; return; }
  if (active() && minutesSince(active().startedAt) < 12 * 60) ui.workoutOpen = true;
  render();
  checkPendingSync(); // app may have been unloaded while Shortcuts ran
  navigator.storage?.persist?.().catch(() => {});
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const reg = await navigator.serviceWorker.register("sw.js").catch(() => null);
    if (!reg) return;
    const watch = (w) => w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) { ui.update = w; render(); } });
    if (reg.waiting && navigator.serviceWorker.controller) { ui.update = reg.waiting; render(); }
    reg.addEventListener("updatefound", () => watch(reg.installing));
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
boot();
