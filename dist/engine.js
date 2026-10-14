/* Drop50 engine — pure program + progression logic. Shared by app.js (browser) and tests (node). */
(function (root) {
  "use strict";
  const E = {};
  const DAY = 86400000;

  /* ---------- dates (device-local, never toISOString) ---------- */
  E.localISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  E.parse = (s) => new Date(`${s}T12:00:00`);
  E.addDays = (s, n) => { const d = E.parse(s); d.setDate(d.getDate() + n); return E.localISO(d); };
  E.daysBetween = (a, b) => Math.round((E.parse(b) - E.parse(a)) / DAY);
  E.nextMonday = (from = E.localISO()) => { const d = E.parse(from); const add = (8 - d.getDay()) % 7 || 7; return E.addDays(from, add); };

  /* ---------- program ---------- */
  E.exercise = (plan, id) => plan.exercises.find((x) => x.id === id);

  // Phase by calendar date since start: 4-week months, month 3 continues after day 90. Before start = preview of month 1.
  E.phaseFor = (plan, startDate, date) => {
    const offset = E.daysBetween(startDate, date);
    const index = offset < 28 ? 0 : offset < 56 ? 1 : 2;
    return { ...plan.phases[index], index, offset, preview: offset < 0, week: offset < 0 ? 0 : Math.floor(offset / 7) + 1, day: offset + 1 };
  };

  E.template = (plan, seq) => plan.rotation[((seq % plan.rotation.length) + plan.rotation.length) % plan.rotation.length];

  E.prescription = (plan, phaseIndex, slot) => plan.phases[phaseIndex].presc[plan.slots[slot].kind];
  E.schemeOf = (presc) => (presc.every((p) => p.min === presc[0].min && p.max === presc[0].max) ? "straight" : "rpt");

  // Entries a session holds: A..E, F1 (biceps), F2 (triceps), X (finisher)
  E.entryKeys = (tpl) => tpl.blocks.flatMap((b) => (b.ex.length > 1 ? b.ex.map((_, i) => `${b.slot}${i + 1}`) : [b.slot]));
  E.blockOfKey = (key) => key[0];

  E.newSession = (plan, seq, startDate, date, now = Date.now()) => {
    const tpl = E.template(plan, seq), phase = E.phaseFor(plan, startDate, date), entries = {};
    for (const b of tpl.blocks) {
      const presc = E.prescription(plan, phase.index, b.slot);
      b.ex.forEach((ex, i) => {
        const key = b.ex.length > 1 ? `${b.slot}${i + 1}` : b.slot;
        entries[key] = { ex, presc, scheme: E.schemeOf(presc), sets: presc.map(() => ({ w: "", r: "", done: false })) };
      });
    }
    return { id: `s${now.toString(36)}`, seq, tpl: tpl.id, phase: phase.index, date, startedAt: new Date(now).toISOString(), completedAt: null, entries };
  };

  // Sequence advances only on sessions that were completed or ended early (never on discard or skip-a-day).
  E.nextSeq = (state) => state.sessions.filter((s) => s.completedAt).length;
  E.activeSession = (state) => state.sessions.find((s) => !s.completedAt) || null;

  /* ---------- history ---------- */
  const num = (v) => (v === "" || v == null ? null : Number(v));
  E.doneSets = (entry) => entry.sets.filter((s) => s.done && num(s.r) != null);
  E.isFull = (entry) => entry.sets.length > 0 && entry.sets.every((s) => s.done && num(s.r) != null);

  // Exposures newest first. Each: {date, sessionId, entry, full}
  E.exposures = (state, exId, excludeSessionId) => {
    const out = [];
    for (const s of state.sessions) {
      if (s.id === excludeSessionId) continue;
      for (const entry of Object.values(s.entries)) {
        if (entry.ex !== exId || !E.doneSets(entry).length) continue;
        out.push({ date: s.date, at: s.completedAt || s.startedAt, sessionId: s.id, entry, full: E.isFull(entry) });
      }
    }
    return out.sort((a, b) => (a.at < b.at ? 1 : -1));
  };

  /* ---------- progression ---------- */
  E.round = (x, inc, mode = "nearest") => {
    const f = mode === "down" ? Math.floor : mode === "up" ? Math.ceil : Math.round;
    return Math.max(0, f(x / inc + 1e-9) * inc);
  };
  E.e1rm = (w, r, rir) => w * (1 + (r + rir) / 30);
  E.weightFor = (e1, reps, rir) => e1 / (1 + (reps + rir) / 30);

  // Back-off weights from a top set: ~90% / ~80%, rounded down, each at least one increment lighter.
  E.backoffs = (w1, inc, n) => {
    const out = [w1];
    for (let i = 1; i < n; i++) out.push(Math.max(0, Math.min(E.round(w1 * (1 - 0.1 * i), inc, "down"), out[i - 1] - inc)));
    return out;
  };

  /**
   * Targets for each prescribed set.
   * Rule (per set index, double progression): hit the top of that set's range last full exposure → +inc, reps reset to bottom;
   * otherwise same weight, one more rep (capped at top). Only full exposures drive progression.
   * Straight → RPT transition: set-1 weight from Epley e1RM (reps + RIR) of the best last set, back-offs 90/80%.
   */
  E.suggest = (presc, exposures, inc, basis) => {
    const scheme = E.schemeOf(presc);
    const full = exposures.find((x) => x.full);
    const last = exposures[0] || null;
    const bwOk = basis === "added";
    const blank = (note) => ({ sets: presc.map((p) => ({ w: bwOk ? 0 : null, r: p.min })), note, kind: "new" });

    if (!full) {
      if (!last) return blank(scheme === "rpt" ? "Pick a heavy weight for 4–6, then drop about 10% each set." : `Pick a weight you'd stop at with ${presc[0].rir >= 2 ? "2–3" : "1–2"} reps left.`);
      const ds = E.doneSets(last.entry), w = Math.max(...ds.map((s) => num(s.w) || 0));
      return { sets: presc.map((p) => ({ w, r: p.min })), note: "Last time wasn't finished — repeat the weight.", kind: "repeat" };
    }

    const L = full.entry;
    if (scheme === "rpt" && L.scheme !== "rpt") {
      const lastRir = L.presc?.[0]?.rir ?? 2.5;
      const best = Math.max(...L.sets.map((s) => E.e1rm(num(s.w) || 0, num(s.r), lastRir)));
      const reps1 = presc[0].min + 1;
      const w1 = E.round(E.weightFor(best, reps1, presc[0].rir), inc);
      const ws = E.backoffs(w1, inc, presc.length);
      return { sets: presc.map((p, i) => ({ w: ws[i], r: p.min })), note: "New: reverse pyramid. Heaviest set first.", kind: "rpt-start" };
    }

    const prev = presc.map((p, i) => { const s = L.sets[i] || L.sets[L.sets.length - 1]; return { w: num(s.w) || 0, r: num(s.r) }; });
    let up = 0, sets;
    if (scheme === "straight") {
      // classic double progression: add load only when every set reached the top of the range
      const all = prev.every((s, i) => s.r >= presc[i].max);
      if (all) up = presc.length;
      sets = presc.map((p, i) => (all ? { w: prev[i].w + inc, r: p.min } : { w: prev[i].w, r: Math.min(p.max, Math.max(p.min, prev[i].r + 1)) }));
    } else {
      sets = presc.map((p, i) => {
        if (prev[i].r >= p.max) { up++; return { w: prev[i].w + inc, r: p.min }; }
        return { w: prev[i].w, r: Math.min(p.max, Math.max(p.min, prev[i].r + 1)) };
      });
      // a back-off set is gated by the set before it: keep it one increment lighter and hold the top of its range
      for (let i = 1; i < sets.length; i++) if (sets[i - 1].w > 0 && sets[i].w >= sets[i - 1].w) sets[i] = { w: Math.max(0, sets[i - 1].w - inc), r: presc[i].max };
    }
    const note = up === sets.length ? `Add ${inc} lb — you earned it.` : up ? `Add ${inc} lb on ${up === 1 ? "one set" : `${up} sets`}, beat the reps on the rest.` : "Same weight — beat last time by a rep.";
    return { sets, note, kind: up ? "up" : "reps" };
  };

  // Live back-off: once set 1 has a real weight, unfilled later sets in an RPT entry follow it.
  // Straight sets: unfilled later sets follow the weight he actually used on the set before.
  E.liveTargets = (entry, targets, inc) => {
    if (entry.scheme !== "rpt") {
      let carry = null;
      const sets = targets.sets.map((t, i) => {
        const w = num(entry.sets[i]?.w);
        const out = w == null && carry != null ? { ...t, w: carry } : t;
        if (w != null) carry = w;
        return out;
      });
      return sets.some((s, i) => s !== targets.sets[i]) ? { ...targets, sets } : targets;
    }
    const w1 = num(entry.sets[0]?.w);
    if (w1 == null || w1 === targets.sets[0].w) return targets;
    const ws = E.backoffs(w1, inc, entry.sets.length);
    return { ...targets, sets: targets.sets.map((t, i) => (i === 0 ? t : { ...t, w: ws[i] })) };
  };

  E.beatLast = (entry, prev) => {
    if (!prev) return false;
    const vol = (e) => E.doneSets(e).reduce((n, s) => n + (num(s.w) || 0) * num(s.r) + num(s.r) * 0.001, 0);
    const best = (e) => Math.max(...E.doneSets(e).map((s) => E.e1rm(num(s.w) || 0, num(s.r), 0)));
    return best(entry) > best(prev.entry) + 1e-9 || vol(entry) > vol(prev.entry) + 1e-9;
  };

  /* ---------- body weight + diet ---------- */
  E.weights = (logs) => Object.entries(logs).filter(([, l]) => Number(l.weight) > 0).map(([d, l]) => [d, Number(l.weight)]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  E.avg7 = (series, end) => {
    const pts = series.filter(([d]) => d <= end && E.daysBetween(d, end) < 7);
    return pts.length ? pts.reduce((n, [, w]) => n + w, 0) / pts.length : null;
  };
  E.macros = (diet, lb) => {
    const kg = lb * 0.45359237, m = diet.macros_g_per_kg, r = (a) => a.map((x) => Math.round(x * kg));
    return { kg: Math.round(kg), protein: r(m.protein), carbs: r(m.carbs), fat: r(m.fat) };
  };

  /* ---------- Apple Health hand-off (Shortcut → clipboard) ---------- */
  // Accepts "drop50 steps=8,123 count weight=254.6 lb …" or a JSON dictionary; must mention drop50.
  E.HEALTH_KEYS = { steps: ["steps"], weight: ["weight"], active: ["active", "burned", "calories", "kcal", "energy"], calories: ["dietary", "eaten"], protein: ["protein"] };
  E.parseHealth = (text) => {
    if (typeof text !== "string" || !/drop50/i.test(text)) return null;
    const out = {};
    for (const [key, names] of Object.entries(E.HEALTH_KEYS)) {
      for (const name of names) {
        const m = text.match(new RegExp(`"?\\b${name}\\b"?\\s*[:=]\\s*"?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*(kg)?`, "i"));
        if (m) { out[key] = Number(m[1].replace(/,/g, "")) * (key === "weight" && m[2] ? 2.20462262 : 1); break; }
      }
    }
    for (const k of ["steps", "active"]) if (out[k] != null) out[k] = Math.round(out[k]);
    if (out.weight != null && !(out.weight >= 80 && out.weight <= 800)) delete out.weight; // junk
    for (const k of ["calories", "protein"]) if (!(out[k] > 0)) delete out[k];
    return Object.keys(out).length ? out : null;
  };
  // Health is the authority for steps; weight/food only overwrite when Health actually has a value.
  E.mergeHealth = (log = {}, h) => {
    const next = { ...log };
    for (const [k, v] of Object.entries(h)) next[k] = k === "weight" ? Math.round(v * 10) / 10 : Math.round(v);
    return next;
  };

  /* ---------- state ---------- */
  E.STORE = "drop50.v2";
  E.defaultState = (today = E.localISO()) => ({
    v: 2,
    profile: { age: 36, height: 70, startWeight: 255, goalWeight: 205, startDate: today <= "2026-10-19" ? "2026-10-19" : E.nextMonday(today), days: [1, 3, 5], calories: 2400, protein: 180, stepGoal: 10000, shortcutName: "Drop50 Sync" },
    inc: {},
    logs: {},
    sessions: [],
    lastBackupAt: null,
  });

  // v1 kept profile + daily logs; its A/B/C workouts belonged to a program that never started.
  E.migrate = (raw, today) => {
    const base = E.defaultState(today);
    if (!raw || typeof raw !== "object") return base;
    if (raw.v === 2) return { ...base, ...raw, profile: { ...base.profile, ...raw.profile }, inc: raw.inc || {}, logs: raw.logs || {}, sessions: Array.isArray(raw.sessions) ? raw.sessions : [] };
    const p = raw.profile || {}, logs = {};
    for (const [d, l] of Object.entries(raw.logs || {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !l) continue;
      const keep = {};
      for (const k of ["weight", "steps", "active", "calories", "protein"]) if (l[k] !== "" && l[k] != null && Number.isFinite(Number(l[k]))) keep[k] = Number(l[k]);
      if (Object.keys(keep).length) logs[d] = keep;
    }
    const profile = { ...base.profile };
    for (const k of ["age", "height", "startWeight", "goalWeight", "calories", "protein"]) if (Number.isFinite(p[k])) profile[k] = p[k];
    if (Array.isArray(p.days) && p.days.length >= 2) profile.days = p.days;
    if (p.startDate && p.startDate !== "2026-10-12") profile.startDate = p.startDate;
    return { ...base, profile, logs };
  };

  E.validBackup = (d) => {
    try {
      const s = d?.state;
      return d?.format === "drop50-backup" && d.version === 2 && s && s.v === 2 && typeof s.profile === "object" && /^\d{4}-\d{2}-\d{2}$/.test(s.profile.startDate) &&
        typeof s.logs === "object" && !Array.isArray(s.logs) && Array.isArray(s.sessions) &&
        s.sessions.every((x) => x && typeof x.id === "string" && Number.isInteger(x.seq) && x.entries && typeof x.entries === "object" &&
          Object.values(x.entries).every((e) => e && typeof e.ex === "string" && Array.isArray(e.sets) && e.sets.length <= 10));
    } catch { return false; }
  };

  if (typeof module === "object" && module.exports) module.exports = E;
  else root.Engine = E;
})(typeof window !== "undefined" ? window : globalThis);
