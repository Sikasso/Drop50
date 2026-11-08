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

GROUPS = {"legs": "Legs", "chest": "Chest", "back": "Back", "shoulders": "Shoulders", "biceps": "Biceps", "triceps": "Triceps"}
GROUP_BY_SLOT = {"A": "legs", "B": "legs", "C": "shoulders", "D": "chest", "E": "back"}
for exercise in EX:
    if exercise["slot"] == "F":
        exercise["group"] = "biceps" if exercise["arm"] == "bi" else "triceps"
    elif exercise["slot"] == "X":
        exercise["group"] = "shoulders" if exercise["id"] == "lateral_raise" else "legs"
    else:
        exercise["group"] = GROUP_BY_SLOT[exercise["slot"]]

def library_exercise(id, name, group, slot, gear, basis, inc, cues, mistake, **extra):
    return dict(id=id, name=name, group=group, slot=slot, gear=gear, basis=basis, inc=inc,
                cues=cues, mistake=mistake, frames=0, **extra)

EX += [
    library_exercise("barbell_bench_press", "Barbell bench press", "chest", "D", "Barbell", "total", 5,
        ["Set the rack safeties or use a spotter. Plant both feet and pull your shoulder blades back.",
         "Lower the bar to your lower chest with wrists stacked over elbows.",
         "Press the bar back up over your shoulders. Count the bar and plates in your logged weight."],
        "Bouncing the bar off your chest or lifting your hips."),
    library_exercise("dumbbell_floor_press", "Dumbbell floor press", "chest", "D", "Dumbbell", "each", 5,
        ["Lie faceup with knees bent and feet planted.", "Lower until upper arms touch the floor gently.",
         "Pause, then press with wrists stacked above elbows."], "Dropping your elbows onto the floor."),
    library_exercise("dumbbell_fly", "Dumbbell chest fly", "chest", "G", "Dumbbell", "each", 2.5,
        ["Lie on a flat bench with dumbbells above your chest and elbows slightly bent.",
         "Open your arms until you feel a chest stretch, then bring them back together."],
        "Lowering beyond a comfortable range or turning it into a press."),
    library_exercise("kettlebell_floor_press", "Single-arm kettlebell floor press", "chest", "D", "Kettlebell", "single", 5,
        ["Lie faceup, grip the bell firmly, and keep your wrist straight.",
         "Lower until the upper arm touches lightly, then press. Do all reps, then switch."],
        "Letting the bell pull your wrist back.", uni=True),
    library_exercise("dumbbell_reverse_lunge", "Dumbbell reverse lunge", "legs", "A", "Dumbbell", "each", 5,
        ["Hold the dumbbells at your sides and take a controlled step back.",
         "Lower the back knee, then drive through the front foot to stand."],
        "Pushing off the back foot instead of loading the front leg.", uni=True),
    library_exercise("dumbbell_calf_raise", "Standing dumbbell calf raise", "legs", "G", "Dumbbell", "each", 5,
        ["Stand tall with dumbbells at your sides.", "Lift both heels, pause at the top, then lower slowly."],
        "Bouncing through short reps."),
    library_exercise("kettlebell_goblet_squat", "Kettlebell goblet squat", "legs", "A", "Kettlebell", "single", 5,
        ["Hold the bell close to your chest and brace.", "Sit between your hips, keeping knees over toes.",
         "Push through the whole foot to stand."], "Letting the heels lift."),
    library_exercise("kettlebell_deadlift", "Kettlebell deadlift", "legs", "B", "Kettlebell", "single", 5,
        ["Set the bell between your feet. Hinge at the hips and bend the knees enough to reach.",
         "Brace, stand tall, then hinge to lower the bell to the floor."], "Rounding your back to reach the bell."),
    library_exercise("chest_supported_dumbbell_row", "Chest-supported dumbbell row", "back", "E", "Dumbbell", "each", 5,
        ["Lie chest-down on an incline bench with feet planted.",
         "Pull your elbows back, pause, then let the dumbbells lower under control."],
        "Lifting your chest off the bench or shrugging."),
    library_exercise("kettlebell_row", "One-arm kettlebell row", "back", "E", "Kettlebell", "single", 5,
        ["Brace your free hand on a bench and hinge with a flat back.",
         "Pull the bell toward your hip, then lower slowly. Do all reps, then switch."],
        "Rotating your torso to move the bell.", uni=True),
    library_exercise("dumbbell_reverse_fly", "Dumbbell reverse fly", "shoulders", "H", "Dumbbell", "each", 2.5,
        ["Hinge forward with a long spine and a soft bend in your elbows.",
         "Lift both arms out to your sides, then lower under control."], "Shrugging or using momentum."),
    library_exercise("kettlebell_overhead_press", "Single-arm kettlebell press", "shoulders", "C", "Kettlebell", "single", 5,
        ["Start with the bell supported at the shoulder and your wrist straight.",
         "Brace with ribs down, press overhead, then lower to the rack position. Switch sides after all reps."],
        "Leaning back or sideways as you press.", uni=True),
    library_exercise("dumbbell_concentration_curl", "Dumbbell concentration curl", "biceps", "F", "Dumbbell", "single", 2.5,
        ["Sit and brace the back of your upper arm against your inner thigh.",
         "Curl smoothly and lower fully. Do all reps, then switch."], "Moving your shoulder to help lift the weight.", arm="bi", uni=True),
    library_exercise("dumbbell_skull_crusher", "Lying dumbbell triceps extension", "triceps", "F", "Dumbbell", "each", 2.5,
        ["Lie on a bench with dumbbells above your shoulders and palms facing in.",
         "Bend at the elbows to lower the dumbbells beside your head, then extend."],
        "Letting your upper arms swing or elbows flare.", arm="tri"),
    library_exercise("kettlebell_curl", "Two-hand kettlebell curl", "biceps", "F", "Kettlebell", "single", 5,
        ["Stand tall and hold the bell by both horns.", "Curl without moving your upper arms, then lower slowly."],
        "Leaning back to start the rep.", arm="bi"),
    library_exercise("kettlebell_overhead_extension", "Kettlebell overhead triceps extension", "triceps", "F", "Kettlebell", "single", 5,
        ["Hold the bell by the horns with both hands, then press it overhead.",
         "Keep your ribs down and bend at the elbows to lower behind your head. Extend smoothly."],
        "Arching your back or widening your elbows.", arm="tri"),
]


# Public exercise-specific videos; the player loads only when tapped.
VIDEOS = {'leg_press': 'q4W4_VJbKW0', 'hack_squat': 'VY8ko6ecfso', 'split_squat': 'Wcmg-3iHwjQ', 'goblet_squat': 'Xjo_fY9Hl9w', 'romanian_deadlift': 'QFbZevA7dps', 'hip_thrust': '4hYRM_60BD4', 'back_extension': 'F6xrarzGl-g', 'dumbbell_overhead_press': 'rO_iEImwHyo', 'machine_shoulder_press': 'Gkk-6q7Rq-s', 'arnold_press': 'TEzehbTzBD0', 'dumbbell_bench_press': 'M0tN99QgPyU', 'incline_dumbbell_press': 'IP4oeKh1Sd4', 'machine_chest_press': 'NwzUje3z0qY', 'lat_pulldown': '7JnP8dFbS14', 'seated_cable_row': 'vwHG9Jfu4sw', 'one_arm_dumbbell_row': 'QHRU41-NhaU', 'close_grip_pulldown': 'IjoFCmLX7z0', 'dumbbell_curl': 'Iyqr-MyDqRY', 'hammer_curl': 'CFBZ4jN1CMI', 'incline_dumbbell_curl': 'HhHHBj3qTJ4', 'rope_pushdown': '03RVTmYUMrU', 'overhead_rope_extension': 'iB4u8yUmPnI', 'machine_dip': 'pMarNxAvHPc', 'dumbbell_overhead_extension': 'JTczoqjnKUA', 'lateral_raise': 'PzsMitRdI_8', 'hamstring_curl': '_2Kd0d-JEUM', 'barbell_bench_press': 'lWFknlOTbyM', 'dumbbell_floor_press': 'T0Y3OBF1bNI', 'dumbbell_fly': 'WE1thwwQRRw', 'kettlebell_floor_press': 'P_ijh09h23s', 'dumbbell_reverse_lunge': 'zZaXHwFf9r8', 'dumbbell_calf_raise': 'wwy3BSUjlW4', 'kettlebell_goblet_squat': 'MWHIs0zxkCU', 'kettlebell_deadlift': 'm-KlB4F4bIc', 'chest_supported_dumbbell_row': 'ro2vfHfD0DQ', 'kettlebell_row': 'WmT_rBeKnuM', 'dumbbell_reverse_fly': 'D5_zfFhfyzE', 'kettlebell_overhead_press': 'YXtkmM_Gd5Q', 'dumbbell_concentration_curl': 'DMhaqmlT1GU', 'dumbbell_skull_crusher': '4rI3EBpbA2U', 'kettlebell_curl': 'GHQ1-gGuT0g', 'kettlebell_overhead_extension': 'Q09iNPS4LSc'}
assert {x["id"] for x in EX} == set(VIDEOS)
for exercise in EX:
    exercise["video"] = VIDEOS[exercise["id"]]

GEAR = {
    "Machine": "leg_press hack_squat back_extension machine_shoulder_press machine_chest_press machine_dip hamstring_curl",
    "Cable": "lat_pulldown seated_cable_row close_grip_pulldown rope_pushdown overhead_rope_extension",
    "Barbell": "hip_thrust",
    "Dumbbell": ("split_squat goblet_squat romanian_deadlift dumbbell_overhead_press arnold_press dumbbell_bench_press "
                 "incline_dumbbell_press one_arm_dumbbell_row dumbbell_curl hammer_curl incline_dumbbell_curl "
                 "dumbbell_overhead_extension lateral_raise"),
}
legacy_gear = {id: gear for gear, ids in GEAR.items() for id in ids.split()}
for exercise in EX:
    if exercise["id"] in legacy_gear:
        exercise["gear"] = legacy_gear[exercise["id"]]

def focus(label, summary, minutes, **blocks):
    return dict(label=label, summary=summary, minutes=minutes,
                blocks=[dict(slot=slot, ex=exercises.split()) for slot, exercises in blocks.items()])

FOCUSES = {
    "full": {"label": "Full body", "summary": "Train legs, upper body, and arms in the regular three-week rotation.", "minutes": 55},
    "legs": focus("Legs", "Start with a squat and hinge, then finish with hamstrings and calves.", 40,
                  A="leg_press", B="romanian_deadlift", G="hamstring_curl", H="dumbbell_calf_raise"),
    "arms": focus("Arms", "Alternate a biceps move and a triceps move in each superset. Rest after both.", 30,
                  F="dumbbell_curl rope_pushdown", G="hammer_curl dumbbell_overhead_extension"),
    "chest": focus("Chest", "Start with a flat press, follow with an incline press, and finish with flyes.", 35,
                   D="barbell_bench_press", G="incline_dumbbell_press", H="dumbbell_fly"),
    "back": focus("Back", "Start with a pulldown, then row with chest support and finish one side at a time.", 35,
                  E="lat_pulldown", G="chest_supported_dumbbell_row", H="kettlebell_row"),
    "shoulders": focus("Shoulders", "Start with an overhead press, then train your side and rear delts.", 30,
                       C="dumbbell_overhead_press", G="lateral_raise", H="dumbbell_reverse_fly"),
}

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
    "G": {"label": "Accessory", "kind": "arms", "rest": 75},
    "H": {"label": "Accessory", "kind": "arms", "rest": 75},
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
  "groups": GROUPS,
  "focuses": FOCUSES,
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
  "media_credit": "Exercise videos are provided by their respective YouTube creators and require internet.",
}
json.dump(plan, open(OUT, "w"), indent=1, ensure_ascii=False)
print("wrote", OUT, len(rotation), "sessions", len(EX), "exercises")
for r in rotation:
    print(r["id"], " | ".join("+".join(b["ex"]) for b in r["blocks"]))
