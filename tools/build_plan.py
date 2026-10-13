"""Builds dist/plan.json (Drop50 v2) from the rotation found by rot.py."""
import json, sys

OUT = sys.argv[1]

# basis: each = per dumbbell, single = one dumbbell, total = stack/plates, added = load added to bodyweight
EX = [
  # slot A — squat pattern
  dict(id="leg_press", name="Leg press", slot="A", basis="total", inc=10, frames=3,
       cues=["Feet shoulder-width, mid-platform; brace into the back pad.", "Lower until hips are about to curl off the pad.", "Drive through the whole foot; stop just short of locking the knees."],
       mistake="Pelvis rolling off the pad at the bottom."),
  dict(id="hack_squat", name="Hack squat", slot="A", basis="total", inc=10, frames=2, unit_note="plates added",
       cues=["Shoulders and back flat on the pad, feet mid-platform.", "Sit straight down, knees tracking over toes.", "Stand by pushing the floor away; keep hips on the pad."],
       mistake="Heels lifting or knees caving in on the way up."),
  dict(id="split_squat", name="Dumbbell split squat", slot="A", basis="each", inc=5, uni=True, frames=3,
       cues=["Long stance, feet on two separate tracks.", "Drop the back knee straight down; front knee over toes.", "Push through the front foot. Do all reps, then switch legs."],
       mistake="Narrow tightrope stance that kills balance."),
  dict(id="goblet_squat", name="Goblet squat", slot="A", basis="single", inc=5, frames=3, swap_only=True,
       cues=["Hold the dumbbell tight to your chest and brace.", "Sit between your hips, knees tracking over toes.", "Stand tall without letting the chest drop."],
       mistake="Heels lifting or knees collapsing inward."),
  # slot B — hinge pattern
  dict(id="romanian_deadlift", name="Dumbbell Romanian deadlift", slot="B", basis="each", inc=5, frames=3,
       cues=["Soft knees, brace, dumbbells against your thighs.", "Push hips back until you feel a strong hamstring stretch.", "Stand by driving the hips forward; squeeze glutes at the top."],
       mistake="Rounding the back to reach lower."),
  dict(id="hip_thrust", name="Barbell hip thrust", slot="B", basis="total", inc=10, frames=2,
       cues=["Upper back on the bench edge, bar padded over the hips.", "Tuck the chin and ribs; drive through the heels.", "Lock out with glutes, pause one second, lower under control."],
       mistake="Arching the lower back instead of extending the hips."),
  dict(id="back_extension", name="45° back extension", slot="B", basis="added", inc=5, frames=2,
       cues=["Pad just below the hip crease so you can hinge freely.", "Hinge down with a long spine; hold a plate to add load.", "Rise until body is in a straight line — no hyperextending."],
       mistake="Swinging up past straight and cranking the low back."),
  # slot C — vertical push
  dict(id="dumbbell_overhead_press", name="Seated dumbbell press", slot="C", basis="each", inc=5, frames=3,
       cues=["Bench upright, wrists stacked over elbows.", "Brace ribs down before every rep.", "Press up and slightly in; lower to ear level."],
       mistake="Arching back so it turns into an incline press."),
  dict(id="machine_shoulder_press", name="Machine shoulder press", slot="C", basis="total", inc=10, frames=2,
       cues=["Set the seat so handles start at shoulder height.", "Back flat on the pad, core braced.", "Press without shrugging; control the return."],
       mistake="Seat too low, which pinches the shoulders."),
  dict(id="arnold_press", name="Arnold press", slot="C", basis="each", inc=5, frames=2,
       cues=["Start palms facing you at chin height.", "Rotate palms forward as you press up.", "Reverse the rotation on the way down."],
       mistake="Rushing the rotation and losing control at the top."),
  # slot D — horizontal push
  dict(id="dumbbell_bench_press", name="Dumbbell bench press", slot="D", basis="each", inc=5, frames=3,
       cues=["Shoulder blades back and down, feet planted.", "Lower to mid-chest, elbows about 45° from your body.", "Press up without bouncing."],
       mistake="Elbows flared straight out to the sides."),
  dict(id="incline_dumbbell_press", name="Incline dumbbell press", slot="D", basis="each", inc=5, frames=2,
       cues=["Bench at 30°, shoulder blades pinned.", "Lower to upper chest with forearms vertical.", "Press up and slightly together."],
       mistake="Bench too steep, turning it into a shoulder press."),
  dict(id="machine_chest_press", name="Machine chest press", slot="D", basis="total", inc=10, frames=2,
       cues=["Handles at mid-chest height.", "Shoulder blades back against the pad.", "Press out smoothly; let the stack touch down lightly."],
       mistake="Shoulders rolling forward off the pad."),
  # slot E — pull
  dict(id="lat_pulldown", name="Lat pulldown", slot="E", basis="total", inc=10, frames=3,
       cues=["Grip just outside shoulders, thighs locked under the pad.", "Drive elbows down to your sides, bar to upper chest.", "Let arms go long at the top without shrugging."],
       mistake="Leaning way back and swinging the weight."),
  dict(id="seated_cable_row", name="Seated cable row", slot="E", basis="total", inc=10, frames=3,
       cues=["Sit tall, slight knee bend.", "Pull elbows to your waist and pause.", "Reach forward under control without rounding."],
       mistake="Rocking the torso to move the stack."),
  dict(id="one_arm_dumbbell_row", name="One-arm dumbbell row", slot="E", basis="single", inc=5, uni=True, frames=2,
       cues=["Hand and knee on the bench, back flat.", "Pull the dumbbell toward your hip.", "Lower to a full stretch. All reps, then switch."],
       mistake="Twisting the torso to heave the weight."),
  dict(id="close_grip_pulldown", name="Close-grip pulldown", slot="E", basis="total", inc=10, frames=2, swap_only=True,
       cues=["Close or neutral grip, chest up.", "Pull to upper chest, elbows tight.", "Control the bar back up."],
       mistake="Pulling with the arms instead of the back."),
  # slot F — arms (biceps + triceps superset)
  dict(id="dumbbell_curl", name="Dumbbell curl", slot="F", arm="bi", basis="each", inc=5, frames=3,
       cues=["Stand tall, elbows pinned to your sides.", "Curl without letting the elbows drift forward.", "Lower all the way under control."],
       mistake="Rocking the torso for momentum."),
  dict(id="hammer_curl", name="Hammer curl", slot="F", arm="bi", basis="each", inc=5, frames=2,
       cues=["Palms facing each other the whole time.", "Elbows stay at your sides.", "Squeeze at the top, lower slowly."],
       mistake="Swinging the dumbbells up."),
  dict(id="incline_dumbbell_curl", name="Incline dumbbell curl", slot="F", arm="bi", basis="each", inc=5, frames=2,
       cues=["Bench at 45–60°, arms hanging straight down.", "Curl without moving the upper arm forward.", "Full stretch at the bottom of every rep."],
       mistake="Shoulders rolling forward to cheat the curl."),
  dict(id="rope_pushdown", name="Rope pushdown", slot="F", arm="tri", basis="total", inc=5, frames=2,
       cues=["Elbows pinned at your sides.", "Push down and spread the rope at the bottom.", "Control it back to 90° at the elbow."],
       mistake="Elbows flaring and shoulders taking over."),
  dict(id="overhead_rope_extension", name="Overhead rope extension", slot="F", arm="tri", basis="total", inc=5, frames=2,
       cues=["Face away from the cable, staggered stance.", "Elbows point forward, upper arms still.", "Extend fully overhead, then stretch back."],
       mistake="Elbows flaring wide."),
  dict(id="machine_dip", name="Machine dip", slot="F", arm="tri", basis="total", inc=10, frames=2,
       cues=["Sit tall, handles just below the chest.", "Press down until arms are straight.", "Return slowly to about 90° at the elbow."],
       mistake="Shrugging the shoulders up toward the ears."),
  dict(id="dumbbell_overhead_extension", name="Seated dumbbell overhead extension", slot="F", arm="tri", basis="single", inc=5, frames=2, swap_only=True,
       cues=["Sit tall, both hands cupping one dumbbell overhead.", "Lower it behind your head, elbows pointing up.", "Extend fully without flaring the elbows."],
       mistake="Elbows drifting wide and the low back arching."),
  # finishers (optional)
  dict(id="lateral_raise", name="Dumbbell lateral raise", slot="X", basis="each", inc=5, frames=3,
       cues=["Light dumbbells, soft elbows.", "Raise out and slightly forward to shoulder height.", "Lower slowly — no torso swing."],
       mistake="Shrugging or heaving with momentum."),
  dict(id="hamstring_curl", name="Seated hamstring curl", slot="X", basis="total", inc=10, frames=3,
       cues=["Line the machine pivot up with your knee.", "Hips stay down on the seat.", "Curl hard, return slowly."],
       mistake="Letting the stack crash between reps."),
]

POOLS = {
  "A": ["leg_press", "hack_squat", "split_squat"],
  "B": ["romanian_deadlift", "hip_thrust", "back_extension"],
  "C": ["dumbbell_overhead_press", "machine_shoulder_press", "arnold_press"],
  "D": ["dumbbell_bench_press", "incline_dumbbell_press", "machine_chest_press"],
  "E": ["lat_pulldown", "seated_cable_row", "one_arm_dumbbell_row"],
  "Fb": ["dumbbell_curl", "hammer_curl", "incline_dumbbell_curl"],
  "Ft": ["rope_pushdown", "overhead_rope_extension", "machine_dip"],
}
# from rot.py: each exercise 3x per cycle, never in consecutive sessions, no two sessions share >3 of 7 picks
ROT = [(1,0,2,2,1,1,1),(2,2,1,1,2,2,0),(0,1,0,2,0,1,1),(2,2,2,1,1,0,2),(1,1,0,0,2,1,0),
       (0,0,1,1,1,2,2),(1,2,0,0,0,0,1),(0,0,2,2,2,2,0),(2,1,1,0,0,0,2)]
FINISHER = {1: "lateral_raise", 2: "hamstring_curl"}  # by day index within the week

rotation = []
for s, t in enumerate(ROT):
    week, day = s // 3, s % 3
    keys = ["A", "B", "C", "D", "E", "Fb", "Ft"]
    pick = {k: POOLS[k][t[i]] for i, k in enumerate(keys)}
    blocks = [{"slot": k, "ex": [pick[k]]} for k in "ABCDE"]
    blocks.append({"slot": "F", "ex": [pick["Fb"], pick["Ft"]]})
    if day in FINISHER:
        blocks.append({"slot": "X", "ex": [FINISHER[day]]})
    rotation.append({"id": f"W{week+1}D{day+1}", "week": week + 1, "day": day + 1, "blocks": blocks})

S = lambda lo, hi, rir, n: [{"min": lo, "max": hi, "rir": rir} for _ in range(n)]
RPT = lambda rir: [{"min": 4, "max": 6, "rir": rir}, {"min": 8, "max": 10, "rir": rir}, {"min": 10, "max": 12, "rir": rir}]

plan = {
  "version": 2,
  "title": "Drop50 — Lean in 90",
  "source": "trainer.neal full-body 3x/week framework",
  "slots": {
    "A": {"label": "Squat", "kind": "compound", "rest": 150},
    "B": {"label": "Hinge", "kind": "compound", "rest": 150},
    "C": {"label": "Vertical push", "kind": "compound", "rest": 120},
    "D": {"label": "Horizontal push", "kind": "compound", "rest": 120},
    "E": {"label": "Pull", "kind": "compound", "rest": 120},
    "F": {"label": "Arms", "kind": "arms", "rest": 75},
    "X": {"label": "Finisher", "kind": "finisher", "rest": 60},
  },
  "phases": [
    {"month": 1, "name": "Quality & Form", "scheme": "straight", "rir_label": "2–3 in the tank",
     "summary": "Moderate reps, perfect technique, never to failure. Let your body learn the movements.",
     "rules": ["Focus on good technique and controlling the weight.", "Moderate rep ranges (8–12).", "Don't train to failure.", "Build a strong foundation."],
     "presc": {"compound": S(8, 12, 2.5, 3), "arms": S(10, 12, 2.5, 3), "finisher": S(12, 15, 2.5, 2)}},
    {"month": 2, "name": "Reverse Pyramid", "scheme": "rpt", "rir_label": "1–2 in the tank",
     "summary": "Heaviest set first, then drop the weight and add reps. Still not to failure.",
     "rules": ["Set 1: heavy, 4–6 reps.", "Set 2: lighter, 8–10 reps.", "Set 3: lighter, 10–12 reps.", "Leave 1–2 reps in reserve on all sets."],
     "presc": {"compound": RPT(1.5), "arms": S(10, 12, 1.5, 3), "finisher": S(12, 15, 1.5, 2)}},
    {"month": 3, "name": "Increase Intensity", "scheme": "rpt", "rir_label": "to failure",
     "summary": "Same reverse pyramid, every set taken to failure. This is where strength and physique jump.",
     "rules": ["Same reverse pyramid.", "Go to failure on each set.", "Squats and hinges: stop at the last clean rep.", "Use a spotter or machines when pushing presses to failure."],
     "presc": {"compound": RPT(0), "arms": S(10, 12, 0, 3), "finisher": S(12, 15, 0, 2)}},
  ],
  "exercises": EX,
  "pools": {"A": POOLS["A"] + ["goblet_squat"], "B": POOLS["B"], "C": POOLS["C"], "D": POOLS["D"],
            "E": POOLS["E"] + ["close_grip_pulldown"], "Fb": POOLS["Fb"], "Ft": POOLS["Ft"] + ["dumbbell_overhead_extension"], "X": ["lateral_raise", "hamstring_curl"]},
  "rotation": rotation,
  "one_rule": "Track your weights and reps and try to beat them every week.",
  "diet": {
    "headline": "If you're not in a calorie deficit, you can forget about losing fat and getting lean.",
    "deficit": [500, 700],
    "macros_g_per_kg": {"protein": [1.8, 2.2], "carbs": [2, 4], "fat": [0.6, 1.0]},
    "macro_basis": "goal",
    "foods": ["Lean meats (chicken, turkey, lean beef)", "Fish (salmon, tuna, white fish)", "Eggs", "Rice, potatoes, oats, pasta",
              "Vegetables (broccoli, spinach, peppers)", "Fruit (banana, berries, apple)", "Greek yogurt", "Cottage cheese",
              "Wholegrain bread", "Healthy fats (olive oil, nuts, avocado)", "Protein powder", "Low-calorie foods (salad, soups)"],
    "meal_plans": [
      {"name": "Option 1", "kcal": 2000, "meals": ["Oats, protein powder, banana", "Chicken, rice, vegetables", "Greek yogurt, berries", "Lean beef, potatoes, vegetables"]},
      {"name": "Option 2", "kcal": 2500, "meals": ["Eggs, wholegrain toast, fruit", "Turkey, pasta, vegetables", "Protein shake, banana, nuts", "Salmon, rice, vegetables"]},
      {"name": "Option 3", "kcal": 2500, "meals": ["Greek yogurt, oats, berries", "Chicken wrap (wholegrain), salad", "Cottage cheese, fruit, nuts", "Lean beef, potatoes, vegetables"]},
    ],
    "motto": "Simple and boring = faster results.",
  },
  "steps": {"goal": 10000, "split": [["Early morning", 3000], ["Mid afternoon", 4000], ["Late evening", 3000]]},
  "media_credit": "New exercise photos: free-exercise-db (public domain, Unlicense).",
}
json.dump(plan, open(OUT, "w"), indent=1, ensure_ascii=False)
print("wrote", OUT, len(rotation), "sessions", len(EX), "exercises")
for r in rotation:
    print(r["id"], " | ".join("+".join(b["ex"]) for b in r["blocks"]))
