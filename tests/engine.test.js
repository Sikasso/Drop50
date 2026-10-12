const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../dist/engine.js");
const plan = require("../dist/plan.json");

const START = "2026-10-19";
const sessionWith = (id, at, entries, completed = true) => ({ id, seq: 0, date: at.slice(0, 10), startedAt: at, completedAt: completed ? at : null, entries });
const entry = (ex, presc, sets) => ({ ex, presc, scheme: E.schemeOf(presc), sets: sets.map(([w, r, done = true]) => ({ w, r, done })) });
const M1 = plan.phases[0].presc.compound, M2 = plan.phases[1].presc.compound, M3 = plan.phases[2].presc.compound;

test("rotation: 9 sessions, six slots each, every pool exercise 3x, never back to back", () => {
  assert.equal(plan.rotation.length, 9);
  const counts = {};
  plan.rotation.forEach((t, i) => {
    assert.deepEqual(t.blocks.slice(0, 6).map((b) => b.slot), ["A", "B", "C", "D", "E", "F"]);
    assert.equal(t.blocks[5].ex.length, 2);
    const next = plan.rotation[(i + 1) % 9];
    for (const b of t.blocks.slice(0, 6)) {
      b.ex.forEach((x) => (counts[x] = (counts[x] || 0) + 1));
      const nb = next.blocks.find((n) => n.slot === b.slot);
      b.ex.forEach((x) => assert.ok(!nb.ex.includes(x), `${x} repeats in consecutive sessions ${t.id}->${next.id}`));
    }
  });
  for (const [x, n] of Object.entries(counts)) assert.equal(n, 3, x);
  for (const id of Object.keys(counts)) assert.ok(E.exercise(plan, id), id);
  for (const ex of plan.exercises) assert.ok(ex.cues.length === 3 && ex.mistake && ex.frames, ex.id);
});

test("phases by date: preview before start, months at day 28 and 56, month 3 continues", () => {
  assert.equal(E.phaseFor(plan, START, "2026-10-12").preview, true);
  assert.equal(E.phaseFor(plan, START, "2026-10-12").index, 0);
  assert.equal(E.phaseFor(plan, START, START).week, 1);
  assert.equal(E.phaseFor(plan, START, E.addDays(START, 27)).index, 0);
  assert.equal(E.phaseFor(plan, START, E.addDays(START, 28)).index, 1);
  assert.equal(E.phaseFor(plan, START, E.addDays(START, 56)).index, 2);
  assert.equal(E.phaseFor(plan, START, E.addDays(START, 200)).index, 2);
  assert.equal(E.phaseFor(plan, START, E.addDays(START, 89)).week, 13);
});

test("sequence is completion-driven; discard and in-progress do not advance", () => {
  const st = E.defaultState("2026-10-11");
  assert.equal(E.nextSeq(st), 0);
  const s = E.newSession(plan, 0, START, "2026-10-12", Date.parse("2026-10-12T18:00:00"));
  st.sessions.push(s);
  assert.equal(E.nextSeq(st), 0);
  assert.equal(E.activeSession(st).id, s.id);
  s.completedAt = "2026-10-12T19:00:00";
  assert.equal(E.nextSeq(st), 1);
  assert.equal(E.template(plan, 9).id, "W1D1");
  assert.deepEqual(E.entryKeys(E.template(plan, 0)), ["A", "B", "C", "D", "E", "F1", "F2"]);
  assert.deepEqual(Object.keys(s.entries), ["A", "B", "C", "D", "E", "F1", "F2"]);
  assert.equal(s.entries.A.sets.length, 3);
});

test("first exposure: blank weight (bodyweight 0 for added-load lifts), bottom reps", () => {
  const t = E.suggest(M1, [], 5, "each");
  assert.equal(t.kind, "new");
  assert.deepEqual(t.sets.map((s) => [s.w, s.r]), [[null, 8], [null, 8], [null, 8]]);
  assert.equal(E.suggest(M1, [], 5, "added").sets[0].w, 0);
});

test("straight sets: +1 rep when short of the top, + increment when every set hit 12", () => {
  const st = { sessions: [sessionWith("a", "2026-10-19T18:00:00", { A: entry("leg_press", M1, [[200, 12], [200, 11], [200, 10]]) })] };
  let t = E.suggest(M1, E.exposures(st, "leg_press"), 10, "total");
  assert.deepEqual(t.sets.map((s) => [s.w, s.r]), [[200, 12], [200, 12], [200, 11]]);
  assert.equal(t.kind, "reps");
  st.sessions.push(sessionWith("b", "2026-10-26T18:00:00", { A: entry("leg_press", M1, [[200, 12], [200, 12], [200, 12]]) }));
  t = E.suggest(M1, E.exposures(st, "leg_press"), 10, "total");
  assert.deepEqual(t.sets.map((s) => [s.w, s.r]), [[210, 8], [210, 8], [210, 8]]);
  assert.match(t.note, /Add 10 lb/);
});

test("partial exposure never drives progression; falls back to last full one", () => {
  const st = { sessions: [
    sessionWith("a", "2026-10-19T18:00:00", { B: entry("romanian_deadlift", M1, [[50, 10], [50, 10], [50, 9]]) }),
    sessionWith("b", "2026-10-21T18:00:00", { B: entry("romanian_deadlift", M1, [[55, 12], ["", "", false], ["", "", false]]) }),
  ] };
  const ex = E.exposures(st, "romanian_deadlift");
  assert.equal(ex[0].full, false);
  const t = E.suggest(M1, ex, 5, "each");
  assert.deepEqual(t.sets.map((s) => [s.w, s.r]), [[50, 11], [50, 11], [50, 10]]);
  const only = { sessions: [st.sessions[1]] };
  assert.equal(E.suggest(M1, E.exposures(only, "romanian_deadlift"), 5, "each").kind, "repeat");
});

test("straight -> RPT transition uses e1RM with reps+RIR and descending back-offs", () => {
  const st = { sessions: [sessionWith("a", "2026-11-14T18:00:00", { C: entry("arnold_press", M1, [[30, 12], [30, 12], [30, 11]]) })] };
  const t = E.suggest(M2, E.exposures(st, "arnold_press"), 5, "each");
  // e1 = 30*(1+(12+2.5)/30) = 44.5; w1 = 44.5/(1+(5+1.5)/30) = 36.6 -> 35; back-offs 30, 25 (each >= one increment lighter)
  assert.deepEqual(t.sets.map((s) => s.w), [35, 30, 25]);
  assert.deepEqual(t.sets.map((s) => s.r), [4, 8, 10]);
  assert.equal(t.kind, "rpt-start");
});

test("RPT -> RPT: per-set double progression, stays descending", () => {
  const st = { sessions: [sessionWith("a", "2026-11-20T18:00:00", { D: entry("dumbbell_bench_press", M2, [[70, 6], [60, 9], [55, 12]]) })] };
  const t = E.suggest(M3, E.exposures(st, "dumbbell_bench_press"), 5, "each");
  assert.deepEqual(t.sets.map((s) => [s.w, s.r]), [[75, 4], [60, 10], [55, 12]]);
  // collision: set 2 jumps to set 1's weight -> forced one increment lighter
  const st2 = { sessions: [sessionWith("a", "2026-11-20T18:00:00", { D: entry("dumbbell_bench_press", M2, [[60, 5], [55, 10], [50, 12]]) })] };
  const t2 = E.suggest(M2, E.exposures(st2, "dumbbell_bench_press"), 5, "each");
  assert.deepEqual(t2.sets.map((s) => s.w), [60, 55, 50]);
});

test("live back-off follows the weight actually used on set 1", () => {
  const e = entry("dumbbell_bench_press", M2, [[80, "", false], ["", "", false], ["", "", false]]);
  const base = { sets: [{ w: 70, r: 4 }, { w: 60, r: 8 }, { w: 55, r: 10 }] };
  assert.deepEqual(E.liveTargets(e, base, 5).sets.map((s) => s.w), [70, 70, 60]);
  const untouched = entry("leg_press", M1, [["", "", false], ["", "", false], ["", "", false]]);
  assert.equal(E.liveTargets(untouched, base, 10), base);
  // straight sets: first-time blank targets pick up the weight used on set 1
  const first = entry("leg_press", M1, [[300, 10, true], ["", "", false], ["", "", false]]);
  const blank = { sets: [{ w: null, r: 8 }, { w: null, r: 8 }, { w: null, r: 8 }] };
  assert.deepEqual(E.liveTargets(first, blank, 10).sets.map((s) => s.w), [null, 300, 300]);
});

test("swaps count: history follows the exercise, not the slot", () => {
  const st = { sessions: [sessionWith("a", "2026-10-19T18:00:00", { A: entry("goblet_squat", M1, [[70, 12], [70, 12], [70, 12]]) })] };
  assert.equal(E.exposures(st, "goblet_squat").length, 1);
  assert.equal(E.exposures(st, "leg_press").length, 0);
});

test("backoffs and rounding", () => {
  assert.deepEqual(E.backoffs(20, 5, 3), [20, 15, 10]);
  assert.deepEqual(E.backoffs(100, 10, 3), [100, 90, 80]);
  assert.equal(E.round(36.6, 5), 35);
  assert.equal(E.round(37.5, 5), 40);
});

test("macros from the trainer formula on goal weight", () => {
  const m = E.macros(plan.diet, 205);
  assert.deepEqual(m.protein, [167, 205]);
  assert.deepEqual(m.carbs, [186, 372]);
  assert.deepEqual(m.fat, [56, 93]);
});

test("weights: 7-day average excludes older entries", () => {
  const s = E.weights({ "2026-10-01": { weight: 260 }, "2026-10-19": { weight: 255 }, "2026-10-20": { weight: 254 }, "2026-10-21": { steps: 5 } });
  assert.equal(s.length, 3);
  assert.equal(E.avg7(s, "2026-10-21"), 254.5);
});

test("migration v1 -> v2 keeps profile + logs, drops old workouts, moves default start date", () => {
  const v1 = { profile: { startDate: "2026-10-12", startWeight: 256, goalWeight: 205, days: [1, 3, 5], calories: 2400, protein: 180, age: 36, height: 70 },
    logs: { "2026-10-12": { weight: "255.4", steps: "", calories: "2300", walk: true } }, workouts: { "2026-10-12": { A: {} } } };
  const s = E.migrate(v1, "2026-10-11");
  assert.equal(s.v, 2);
  assert.equal(s.profile.startDate, "2026-10-19");
  assert.equal(s.profile.startWeight, 256);
  assert.deepEqual(s.logs["2026-10-12"], { weight: 255.4, calories: 2300 });
  assert.deepEqual(s.sessions, []);
  const back = { format: "drop50-backup", version: 2, state: s };
  assert.ok(E.validBackup(back));
  assert.ok(!E.validBackup({ format: "drop50-backup", version: 1, state: v1 }));
});

test("local dates never shift at night", () => {
  assert.equal(E.localISO(new Date(2026, 9, 19, 23, 30)), "2026-10-19");
  assert.equal(E.nextMonday("2026-10-11"), "2026-10-12");
  assert.equal(E.nextMonday("2026-10-12"), "2026-10-19");
});

test("assets: every exercise has its demo frames; app and service worker versions match", () => {
  const fs = require("node:fs"), path = require("node:path"), dist = path.join(__dirname, "../dist");
  for (const x of plan.exercises) for (let i = 0; i < x.frames; i++) assert.ok(fs.existsSync(path.join(dist, "media", `${x.id}-${i}.webp`)), `${x.id}-${i}`);
  const v = (f) => fs.readFileSync(path.join(dist, f), "utf8").match(/VERSION = "([^"]+)"/)[1];
  assert.equal(v("app.js"), v("sw.js"));
  for (const f of ["index.html", "styles.css", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"]) assert.ok(fs.existsSync(path.join(dist, f)), f);
});
