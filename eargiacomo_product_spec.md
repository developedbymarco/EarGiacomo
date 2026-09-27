# EarGiacomo — Production-Ready Ear Training Web App Specification

> Product name: **EarGiacomo**
>
> Spendable currency: **Giacominos**

## Build decisions

These decisions override any conflicting wording later in this document.

- The first build is a logged-out practice loop. Accounts, Giacominos balances, friends, battles, and the leaderboard come after musical questions and piano playback are verified.
- Learning is four paths (Intervals, Chords, Visual, Cadences). A visual node may require the matching listening node. Concepts are separate from lessons, and mastery attaches to concept keys such as `interval:M3`.
- The theory engine covers intervals through the 15th and the required chords from the start. The first practice UI is narrower: minor and major seconds and thirds, perfect fourths, fifths, and octaves; root-position major, minor, augmented, and diminished triads; staff and piano visual identification for those concepts. Ascending, descending, and harmonic presentation are included.
- Augmented major seventh does not exist.
- XP is permanent and cannot be wagered. Giacominos buy curriculum nodes and are the battle entry fee. Both players pay the same fee when a friend accepts. The winner receives both fees. A draw refunds both players. Quitting before a minimum number of answered questions refunds both.
- The public leaderboard ranks an Ear Rating from recent accuracy weighted by concept difficulty. Giacominos won or lost do not change rank. A player may hide their row.
- When the app is finished, the website and piano samples run on a VPS with Docker Compose (`web` and `caddy` for HTTPS). Auth, Postgres, and Realtime stay on hosted Supabase. The Supabase stack is not installed on the VPS.
- The first build does not set up a server.

---

> Working title: **EarGiacomo**
>
> A Duolingo-inspired, cozy dark-academia ear-training platform for music students, with structured learning paths, visual identification, XP-based progression, Supabase authentication/data, friend systems, and real-time multiplayer battles.

---

## 1. Product Vision

EarGiacomo is a production-ready web application for serious but enjoyable ear training.

The core idea is to combine:

- structured conservatory-style ear training;
- Duolingo-like progression;
- a cozy, feminine, elegant dark-academia visual identity;
- interactive piano and notation tools;
- flexible practice settings;
- XP, levels, unlocks, rewards, and mastery;
- friend systems and multiplayer battles;
- persistent accounts, progression, and statistics through Supabase.

The app should feel playful and rewarding without becoming childish.

It is not just a quiz app. It is a **learning system**: concepts are introduced gradually, practiced in controlled combinations, revisited through spaced repetition, and eventually tested in broad “mock exam” conditions.

---

# 2. Design Direction

## Visual personality

Target aesthetic:

- dark academia;
- cozy;
- elegant;
- feminine without being juvenile;
- premium stationery / conservatory / old library energy;
- soft game-like feedback inspired by Duolingo;
- refined enough for university or conservatory students.

### Suggested palette

- Espresso: `#241C19`
- Deep plum: `#3A2737`
- Burgundy: `#704354`
- Dusty rose: `#B98593`
- Cream paper: `#F4EBDD`
- Warm parchment: `#E8D8C1`
- Sage: `#87927B`
- Antique gold accent: `#C7A867`

Avoid bright primary colors and cartoon-heavy visuals.

## Typography

Suggested:

- headings: Playfair Display / Cormorant Garamond;
- interface/body: Inter / Manrope;
- musical labels may use a serif treatment when aesthetically appropriate.

## UI motifs

- softly rounded cards;
- ornamental dividers used sparingly;
- subtle paper texture;
- notebook / manuscript references;
- brass/gold XP indicators;
- glowing lesson path nodes;
- velvet-like dark panels;
- parchment-colored exercise surfaces;
- small animated flourishes for correct answers and level unlocks.

## Accessibility

- WCAG AA contrast;
- no critical information conveyed by color alone;
- keyboard navigation;
- visible focus states;
- reduced-motion preference;
- audio controls usable without mouse;
- notation remains readable at mobile sizes.

---

# 3. Recommended Technology Stack

## Frontend

- **Next.js 15+**
- **TypeScript**
- **React**
- **Tailwind CSS**
- **shadcn/ui** primitives
- **Framer Motion** for subtle progression animations
- **Zustand** for local exercise state where useful
- **TanStack Query** only if additional cache control is needed beyond server actions / Supabase queries

## Backend

- **Supabase**
  - Auth
  - PostgreSQL
  - Realtime
  - Storage
  - Row Level Security
  - Edge Functions where server-side validation is required

## Audio

Use a sample-based piano engine rather than a basic oscillator piano.

Recommended architecture:

- **Tone.js** for scheduling/timing
- high-quality multi-sampled piano instruments stored in Supabase Storage or bundled/static CDN assets
- Web Audio API under the hood
- preload current instrument before the exercise begins
- different selectable piano presets

Suggested initial piano presets:

1. Concert Grand
2. Warm Felt
3. Studio Upright
4. Bright Classical
5. Soft Practice Piano

Each piano preset must have a **Preview** button before selection.

User preference is persisted to Supabase.

Do not use crude synthesized sine/triangle piano approximations in the production version.

## Music notation

Recommended:

- **VexFlow**

Alternative:

- OpenSheetMusicDisplay, if MusicXML-heavy functionality is introduced later.

For the MVP/initial production version, VexFlow is preferred because individual interval/chord/cadence notation can be generated programmatically without a full score document.

## Deployment

Designed for self-hosting on a VPS.

Recommended deployment:

- Docker
- Docker Compose
- Node production server
- reverse proxy: Caddy or Nginx
- HTTPS via Let's Encrypt
- Supabase hosted service initially

Optional later architecture:

- self-host Supabase on VPS if desired.

---

# 4. Core Product Areas

The app has four primary learning modes:

1. **Intervals**
2. **Chords**
3. **Visual Identification**
4. **Cadences**

Each learning area contains:

- guided learning path;
- unlocked concepts;
- practice mode;
- mastery tracking;
- configurable custom practice;
- mock exam compatibility where applicable.

---

# 5. Learning Path Philosophy

Users should not immediately be asked to distinguish every possible answer.

Difficulty grows through **controlled expansion of the answer set**.

Example:

### Chord-quality progression

Level 1:

- Major
- Minor

Level 2:

- Major
- Minor
- Augmented

Level 3:

- Major
- Minor
- Augmented
- Diminished

Later:

- inversions
- seventh chords
- open/closed voicing
- increasingly broad combinations

The same principle applies to:

- interval classes;
- melodic direction;
- harmonic intervals;
- chord qualities;
- chord inversions;
- seventh chords;
- visual recognition;
- cadences.

---

# 6. Curriculum Structure

The exact XP costs and lesson counts should be editable by administrators.

The following is the recommended initial progression.

---

## 6.1 Interval Path

Intervals supported up to the **15th**.

### Interval vocabulary

Unison through compound intervals:

- Perfect Unison
- Minor 2nd
- Major 2nd
- Minor 3rd
- Major 3rd
- Perfect 4th
- Augmented 4th / Diminished 5th
- Perfect 5th
- Minor 6th
- Major 6th
- Minor 7th
- Major 7th
- Perfect Octave
- Minor 9th
- Major 9th
- Minor 10th
- Major 10th
- Perfect 11th
- Augmented 11th / Diminished 12th
- Perfect 12th
- Minor 13th
- Major 13th
- Minor 14th
- Major 14th
- Perfect 15th

Enharmonic naming may be normalized at the curriculum level.

### Ear-training variants

Every relevant interval can be practiced as:

- melodic ascending;
- melodic descending;
- harmonic.

### Example staged progression

#### Stage I — Seconds and Thirds

- M2 vs m2
- M3 vs m3
- m2 / M2 / m3 / M3

#### Stage II — Perfect consonances

Add:

- P4
- P5
- P8

#### Stage III — Sixths and Sevenths

Add:

- m6
- M6
- m7
- M7

#### Stage IV — Tritone

Add:

- A4 / d5

#### Stage V — Compound intervals

Progressively introduce:

- 9ths;
- 10ths;
- 11ths;
- 12ths;
- 13ths;
- 14ths;
- 15ths.

### Independent dimensions

Curriculum nodes may separately unlock:

- interval identity;
- ascending;
- descending;
- harmonic;
- mixed direction;
- mixed presentation;
- expanded pitch range.

---

# 7. Chord Path

## 7.1 Triads

Required triads:

- Major
- Minor
- Diminished
- Augmented

### Presentation types

- harmonic;
- melodic ascending;
- melodic descending;
- broken/arpeggiated where suitable.

### Voicing concepts

- root position;
- first inversion;
- second inversion;
- closed harmony;
- open harmony.

Open harmony should not merely shift the chord randomly. Voicings should be generated using musically valid spacing rules.

---

## 7.2 Seventh Chords

Required seventh-chord qualities include:

- Major Seventh
- Dominant Seventh
- Minor Seventh
- Half-Diminished Seventh
- Diminished Seventh
- Minor-Major Seventh
- Augmented Seventh, if included in the chosen theory curriculum

### Explicit exclusion

**Do not include Augmented Major Seventh.**

### Inversions

Support:

- root position;
- first inversion;
- second inversion;
- third inversion.

### Presentation

- harmonic;
- melodic ascending;
- melodic descending;
- optional arpeggiated forms.

---

# 8. Visual Identification Path

The third practice path is **visual rather than auditory**.

The learner sees musical information and identifies what it represents.

There are two presentation formats:

1. **Pentagram / staff notation**
2. **Piano keyboard**

---

## 8.1 Interval Visual Identification

Examples:

- show C4 and E♭4 on the staff → identify m3;
- highlight two piano keys → identify P5;
- show compound notes across staves → identify M10.

Configurable:

- treble clef;
- bass clef;
- mixed clefs;
- simple intervals;
- compound intervals;
- accidentals;
- range.

---

## 8.2 Chord Visual Identification

Show:

- notes on staff;
- highlighted piano keys.

Ask user to identify:

- quality;
- inversion;
- voicing;
- seventh-chord type;
- eventually combinations, e.g. “Minor 7th, first inversion.”

---

## 8.3 Visual-answer modes

Beginner:

- one concept per question.

Advanced:

- multi-part identification.

Example:

> Quality: Dominant Seventh  
> Inversion: Second inversion

---

# 9. Cadence Path

The cadence system teaches harmonic function, chord quality, inversion recognition, and resolution.

Required starting cadence families:

- IV – I
- V – I

Support:

- triads;
- seventh chords;
- inversions;
- altered voicings where musically valid;
- different keys;
- major and minor tonalities.

Example:

- V7 – I
- V7 – i
- V6 – I
- V4/3 – I
- V7 – III / i-related contexts when valid in the selected curriculum

Because Roman-numeral analysis can vary by theoretical system, cadence definitions should be represented as structured curriculum data rather than hard-coded UI strings.

### Cadence exercise types

1. Hear cadence → identify progression
2. See cadence on staff → identify progression
3. See chord symbols / Roman numerals → identify cadence type
4. Hear cadence → identify inversion
5. Mixed mock-exam questions

### Future cadence expansion

Architecture should allow:

- authentic cadence;
- imperfect authentic cadence;
- plagal cadence;
- half cadence;
- deceptive cadence;
- Phrygian half cadence;
- cadential 6/4;
- tonicization;
- secondary dominants.

These do not need to be in the first release unless desired.

---

# 10. Exercise Screen

The exercise screen is the heart of the product.

## Layout

### Desktop

Top:

- current lesson;
- question counter;
- XP/progress indicator;
- heart/life system only if later desired.

Center:

- staff OR listening illustration depending on mode;
- optional keyboard visualization;
- primary answer buttons.

Bottom:

- Repeat sound;
- Play reference note if enabled by lesson;
- Continue / Submit;
- keyboard shortcuts.

### Mobile

Vertical stack:

1. progress;
2. musical stimulus;
3. compact keyboard;
4. answer choices;
5. repeat / submit controls.

---

# 11. Functional Piano

A playable on-screen piano must be available in practice.

## Requirements

- mouse/touch interaction;
- computer keyboard bindings;
- responsive width;
- configurable octave span;
- visual key highlight;
- sustain toggle optional;
- usable as a learning reference;
- notes played by student must not accidentally submit answers.

### Exercise integration

For audio exercises:

- keyboard is visible as an optional learning aid;
- advanced/mastery levels may optionally hide it.

For visual piano exercises:

- specific keys are highlighted;
- user identifies the resulting interval/chord.

### Piano audio presets

User selects a piano sound under:

**Settings → Audio → Piano Sound**

Each instrument card includes:

- name;
- short description;
- preview button;
- selected state.

Example descriptions:

- Concert Grand — clear and neutral
- Warm Felt — soft and intimate
- Studio Upright — focused and slightly dry
- Bright Classical — defined upper register
- Soft Practice — gentle transient, reduced fatigue

---

# 12. Repeat Sound

Every listening question includes a prominent **Repeat** button.

Recommended behavior:

- first playback occurs automatically after the exercise loads;
- Repeat button available immediately after playback;
- number of repeats is unlimited in standard practice;
- repeat count is tracked analytically;
- mock exams may optionally have a configurable repeat limit.

Do not punish users for repeating during normal learning.

---

# 13. Pitch Range Controls

Students can customize the register in which exercises are generated.

Use two controls:

- Lowest allowed pitch
- Highest allowed pitch

Example:

- C2 → C6

Use a compact keyboard-range selector where practical.

## Constraints

Generation logic must ensure:

- entire interval/chord fits inside selected range;
- selected range is large enough for current exercise type;
- impossible settings are automatically prevented.

Optional presets:

- Low
- Middle
- High
- Full piano
- Custom

This setting can apply globally and be overridden per custom session.

---

# 14. Question Count

Before custom practice:

- standard: **10 questions**
- options:
  - 5
  - 10
  - 15
  - 20
  - 30
  - custom integer

Recommended upper bound for standard UI: 100.

Guided curriculum lessons should have a fixed pedagogical length unless configured otherwise by the curriculum.

---

# 15. Answer Interaction

Questions use large choice buttons.

After answer:

### Correct

- button turns positive;
- subtle animation;
- short success sound optional;
- display answer explanation;
- XP animation;
- Continue button.

### Incorrect

- selected wrong answer is marked;
- correct answer is shown;
- optionally play/replay the stimulus;
- show concise comparison guidance.

Example:

> You chose Minor 3rd.  
> Correct answer: Major 3rd.  
> The major third is one semitone wider.

Never immediately skip past mistakes.

---

# 16. Mock Exam Mode

Mock Exam is separate from guided learning.

Goal:

simulate broad recognition under exam-like conditions.

## Characteristics

- answer pool includes all concepts selected/unlocked for the exam;
- no gradual narrowing of options;
- configurable question count;
- configurable exercise families;
- configurable range;
- optional repeat limit;
- optional time limit;
- no correctness feedback until end, if “Exam Conditions” is enabled.

### Mock exam presets

- Intervals Only
- Triads Only
- Seventh Chords
- Cadences
- Visual Recognition
- Full Ear Training
- Custom

### Results

Show:

- total score;
- percentage;
- accuracy per concept;
- accuracy by direction;
- accuracy by register;
- average response time;
- most-confused pairs;
- recommended lessons to revisit.

---

# 17. XP, Levels, Unlocks, and Rewards

Progression should combine:

- XP;
- account level;
- curriculum unlock currency;
- mastery.

## 17.1 XP

Earn XP for:

- answering;
- correct answers;
- completing lessons;
- perfect lessons;
- difficult concepts;
- mock exams;
- PvP matches.

XP controls **profile/account level**.

Example:

- question attempted: +1 XP
- correct answer: +4 XP
- first-try perfect lesson: +20 bonus XP
- lesson completed: +10 XP
- battle win: +25 XP
- battle participation: +10 XP

Exact values live in configuration/database.

---

## 17.2 Unlock Currency

Use a separate progression resource called **Giacominos**.

Users earn Giacominos by practicing existing lessons.

They spend Giacominos to unlock new nodes.

This creates the requested loop:

> practice a level repeatedly → earn enough points → purchase next concept

This is better than spending XP because the player can retain their permanent XP/profile level.

### Example

Major vs Minor lesson:

- first completion: 15 Giacominos;
- subsequent qualified completion: 5 Giacominos;
- next chord-quality node costs: 40 Giacominos.

Anti-grind controls:

- reduced rewards for repeatedly farming trivial content;
- mastery bonuses;
- daily first-completion bonuses;
- harder lessons give better rewards.

---

## 17.3 Mastery

Each concept has its own mastery score, e.g. 0–100.

Mastery considers:

- correctness;
- recency;
- response time;
- repeated mistakes;
- answer confusion;
- difficulty;
- multiple sessions.

Suggested labels:

- New
- Familiar
- Practiced
- Strong
- Mastered

Avoid permanent “failure” labels.

---

# 18. Learning Path UI

The home screen centers on a vertical/branching lesson pathway.

Inspired by Duolingo but visually original.

Example path:

```text
        Major / Minor
             │
        + Augmented
             │
        + Diminished
        ╱           ╲
 Inversions      Open Harmony
        ╲           ╱
        Seventh Chords
```

Each node can be:

- locked;
- available to purchase;
- unlocked;
- in progress;
- mastered.

Clicking a locked-but-eligible node opens an unlock sheet:

> Unlock “Diminished Triads” for 40 Giacominos?

Prerequisites are shown clearly.

---

# 19. Daily Learning Experience

Dashboard should answer three questions immediately:

1. What should I practice?
2. What can I unlock next?
3. How am I improving?

Suggested dashboard cards:

- Continue Learning
- Recommended Review
- Current XP Level
- Giacominos Balance
- Daily Goal
- Recent Accuracy
- Friend Challenges
- Next Unlock

Avoid overwhelming dashboards full of analytics.

---

# 20. Streaks

Optional, but recommended only as a soft feature.

If implemented:

- never remove earned progress;
- missed streak does not affect unlocks;
- offer “practice days this month” as a healthier secondary metric.

---

# 21. Account and Authentication

Use **Supabase Auth**.

Required:

- email/password;
- magic link optional;
- password reset;
- email verification;
- persistent sessions;
- logout;
- account deletion.

Optional later:

- Google OAuth;
- Apple OAuth.

Profile creation:

- display name;
- username;
- avatar;
- skill level;
- preferred piano;
- default pitch range.

---

# 22. Friend System

Users can add friends.

## Required actions

- search by username;
- send friend request;
- accept;
- decline;
- remove friend;
- block user.

## Friend profile

Display:

- username;
- avatar;
- account level;
- selected public stats;
- mutual battle record.

Example:

> You vs. Clara  
> Wins: 8  
> Losses: 5  
> Draws: 1

Users should control profile visibility.

---

# 23. Multiplayer Battles

Battles are real-time competitive ear-training sessions.

Use **Supabase Realtime**.

## Initial battle format

1v1 friend battle.

### Flow

1. User opens friend profile.
2. Selects **Challenge**.
3. Chooses battle rules.
4. Friend accepts.
5. Server generates a deterministic question set.
6. Both players answer the same sequence.
7. Score updates live.
8. Final result is stored permanently.

### Battle rule presets

- Intervals
- Triads
- Seventh Chords
- Mixed
- Visual
- Cadences

Optional modifiers:

- 10 questions;
- 20 questions;
- timed;
- no-repeat;
- selected pitch range.

---

# 24. Multiplayer Fairness

Never trust browser-submitted scores.

The server should control:

- question seed;
- correct answers;
- timestamps;
- scoring;
- final winner.

Recommended:

- battle generated by Edge Function;
- client receives stimulus definition;
- answers submitted to server;
- server validates answer and timing;
- battle summary stored server-side.

This prevents simple client-side score manipulation.

---

# 25. Battle Scoring

Suggested scoring:

- correct answer: base points;
- speed bonus;
- streak bonus capped at a reasonable amount;
- incorrect answer: 0;
- no negative score.

Example:

```text
Correct             +100
Speed bonus         +0–50
3-answer streak     +10
5-answer streak     +20
```

Accuracy should matter more than raw speed.

---

# 26. Head-to-Head Statistics

Track per friendship/opponent:

- wins;
- losses;
- draws;
- total battles;
- average score;
- accuracy;
- current friendly streak.

Also retain individual match history.

Do not delete historical matches if users later unfriend each other unless required by account deletion/privacy rules.

---

# 27. Recommended Database Schema

Supabase PostgreSQL.

## profiles

```sql
id uuid primary key references auth.users(id)
username text unique not null
display_name text
avatar_url text
account_level int default 1
xp bigint default 0
giacominos bigint default 0
preferred_piano_id uuid
default_range_low smallint
default_range_high smallint
created_at timestamptz
updated_at timestamptz
```

Pitch can be stored as MIDI note numbers.

---

## piano_instruments

```sql
id uuid primary key
slug text unique
name text
description text
preview_audio_url text
sample_manifest jsonb
is_active boolean
sort_order int
```

---

## curriculum_nodes

```sql
id uuid primary key
slug text unique
title text
description text
category text
difficulty int
unlock_cost int
xp_reward int
config jsonb
is_active boolean
sort_order int
```

Category examples:

- interval
- chord
- visual_interval
- visual_chord
- cadence

---

## curriculum_prerequisites

```sql
node_id uuid
prerequisite_node_id uuid
primary key (node_id, prerequisite_node_id)
```

---

## user_unlocks

```sql
user_id uuid
node_id uuid
unlocked_at timestamptz
cost_paid int
primary key (user_id, node_id)
```

---

## user_mastery

```sql
user_id uuid
concept_key text
mastery numeric
attempts int
correct int
last_practiced_at timestamptz
confusion_map jsonb
primary key (user_id, concept_key)
```

---

## practice_sessions

```sql
id uuid primary key
user_id uuid
mode text
node_id uuid null
question_count int
correct_count int
xp_earned int
giacominos_earned int
settings jsonb
started_at timestamptz
completed_at timestamptz
```

---

## question_attempts

```sql
id uuid primary key
session_id uuid
user_id uuid
question_type text
stimulus jsonb
correct_answer jsonb
user_answer jsonb
is_correct boolean
response_time_ms int
repeat_count int
created_at timestamptz
```

For storage/analytics, consider retaining normalized concept IDs in addition to JSON stimulus.

---

## friendships

```sql
id uuid primary key
requester_id uuid
addressee_id uuid
status text
created_at timestamptz
updated_at timestamptz
```

Statuses:

- pending
- accepted
- declined
- blocked

Use database constraints to prevent duplicate reciprocal friend rows.

---

## battles

```sql
id uuid primary key
player_one_id uuid
player_two_id uuid
status text
rules jsonb
seed text
winner_id uuid null
player_one_score int
player_two_score int
created_at timestamptz
started_at timestamptz
completed_at timestamptz
```

---

## battle_questions

```sql
id uuid primary key
battle_id uuid
question_index int
stimulus jsonb
correct_answer jsonb
```

---

## battle_answers

```sql
id uuid primary key
battle_id uuid
question_id uuid
user_id uuid
answer jsonb
is_correct boolean
response_time_ms int
score_awarded int
submitted_at timestamptz
```

---

## achievements

```sql
id uuid primary key
slug text unique
name text
description text
icon_key text
criteria jsonb
```

---

## user_achievements

```sql
user_id uuid
achievement_id uuid
earned_at timestamptz
primary key (user_id, achievement_id)
```

---

# 28. Row Level Security

RLS is mandatory.

Principles:

- users can read/update only their own private profile fields;
- public profile fields can be read according to privacy settings;
- attempts can only be inserted/read by owner;
- battle participants can read their battle;
- battle scoring fields cannot be directly updated by clients;
- friendship actions require requester/addressee membership;
- curriculum content is read-only to normal users;
- unlock transactions must be validated server-side.

XP and Giacominos should not be client-writable arbitrary values.

Use secure RPC functions / Edge Functions for:

- lesson completion rewards;
- purchases/unlocks;
- battle score validation;
- achievement granting.

---

# 29. Music Theory Engine

Do not encode every question manually.

Create a deterministic theory engine.

Recommended domain types:

```ts
type Direction = "ascending" | "descending" | "harmonic";

type IntervalQuality =
  | "P1"
  | "m2" | "M2"
  | "m3" | "M3"
  | "P4"
  | "A4"
  | "P5"
  | "m6" | "M6"
  | "m7" | "M7"
  | "P8"
  | "m9" | "M9"
  | "m10" | "M10"
  | "P11"
  | "A11"
  | "P12"
  | "m13" | "M13"
  | "m14" | "M14"
  | "P15";

type TriadQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented";

type SeventhQuality =
  | "major7"
  | "dominant7"
  | "minor7"
  | "halfDiminished7"
  | "diminished7"
  | "minorMajor7"
  | "augmented7";

type TriadInversion = 0 | 1 | 2;
type SeventhInversion = 0 | 1 | 2 | 3;
```

**No `augmentedMajor7` type should exist.**

---

# 30. Question Generation

Each generated question contains sufficient information to reproduce it.

Example:

```ts
interface IntervalQuestion {
  id: string;
  type: "interval";
  interval: IntervalQuality;
  rootMidi: number;
  direction: Direction;
  notes: number[];
  answerChoices: IntervalQuality[];
  pianoInstrumentId: string;
}
```

Chord example:

```ts
interface ChordQuestion {
  id: string;
  type: "chord";
  quality: TriadQuality | SeventhQuality;
  rootMidi: number;
  inversion: number;
  voicing: "closed" | "open";
  presentation: "harmonic" | "melodicAscending" | "melodicDescending";
  notes: number[];
}
```

Question generation must be seedable for multiplayer.

---

# 31. Range-Safe Generation

Use MIDI internally.

Example piano range:

- A0 = 21
- C8 = 108

Before generating a question:

1. select concept;
2. calculate its note offsets;
3. determine all root pitches that keep every note inside selected range;
4. randomly choose from valid roots;
5. generate voicing/inversion;
6. validate again.

If no valid root exists:

- remove incompatible configuration option;
- explain why in custom-session UI.

---

# 32. Musical Spelling

Audio only requires pitch classes/MIDI notes.

Notation requires enharmonic spelling.

Create a note spelling layer supporting:

- key context;
- interval spelling;
- flats/sharps;
- chord theoretical spelling.

Example:

Do not spell C minor as:

- C D# G

Correct:

- C E♭ G

This matters strongly for serious music students.

---

# 33. Piano Audio Engine

The audio engine must schedule notes precisely.

Features:

- sample preload;
- velocity variation;
- pedal/release samples where available;
- harmonic chord playback;
- configurable arpeggiation speed;
- melodic-note timing;
- attack/release normalization across instruments.

Recommended defaults:

- melodic gap: 500–700 ms;
- chord duration: 1.2–1.8 seconds;
- short pause before playback after page transition;
- replay uses identical pitches and voicing.

---

# 34. Audio Selection Screen

Settings screen:

## Piano Sound

Each sound appears as a card:

```text
Warm Felt
Soft, intimate, darker tone.
[▶ Preview]   [Use this piano]
```

Preview plays the same short fixed phrase or chord sequence across every piano, enabling meaningful comparison.

Use the same MIDI pattern for all previews.

---

# 35. Practice Modes

## Guided Lesson

- fixed curriculum content;
- rewards;
- mastery update;
- unlock progression.

## Custom Practice

Student selects:

- concepts;
- number of questions;
- pitch range;
- direction;
- harmonic/melodic;
- piano;
- answer format.

## Smart Review

System prioritizes:

- weak concepts;
- recently missed items;
- confusion pairs;
- concepts approaching mastery decay.

## Mock Exam

Broad testing with exam-style results.

## Battle

Real-time 1v1.

---

# 36. Confusion Tracking

This is an important differentiator.

If a user frequently answers:

- M6 when correct is m6;
- m3 when correct is M3;

store those relationships.

Example:

```json
{
  "M6": {
    "m6": 12,
    "P5": 2
  }
}
```

Dashboard can say:

> You most often confuse Major 6ths with Minor 6ths.

Smart Review can preferentially contrast those concepts.

---

# 37. Progress Algorithm

Suggested mastery update approach:

Factors:

- correct/incorrect;
- first attempt;
- response time;
- repeat count;
- lesson difficulty;
- recency;
- concept exposure count.

Avoid making response time too important for beginners.

Pseudo-rule:

```text
correct fast      +4
correct normal    +3
correct repeated  +2
incorrect         -2
```

Then apply recency weighting and normalize 0–100.

The exact model can evolve later.

---

# 38. Level System

Account level is based on total XP.

Example curve:

```ts
xpForLevel(level) = 100 * level ** 1.5
```

Use a lookup table in production if precise control is preferred.

Profile level provides:

- cosmetic badges;
- titles;
- avatar frames;
- themes;
- profile rewards.

Curriculum unlocks should remain based on prerequisites + Giacominos, not raw account level alone.

---

# 39. Rewards

Reward types:

- profile titles;
- decorative badges;
- avatar frames;
- theme accents;
- profile banner motifs;
- piano-room decorations;
- achievement cards.

Avoid locking core educational accessibility behind cosmetics.

Possible titles:

- First Cadence
- Interval Apprentice
- Triad Scholar
- Seventh Specialist
- Golden Ear
- Conservatory Owl

---

# 40. Achievements

Examples:

- First Lesson
- 100 Correct Answers
- 10 Perfect Lessons
- Master Major vs Minor
- Master All Simple Intervals
- First Mock Exam
- First Battle
- Win 5 Friend Battles
- Practice Every Register
- Identify 100 Cadences

---

# 41. Home Navigation

Desktop sidebar:

- Home
- Learn
- Practice
- Mock Exam
- Battle
- Friends
- Progress
- Settings

Mobile bottom navigation:

- Home
- Learn
- Practice
- Battle
- Profile

Secondary pages accessible through profile/menu.

---

# 42. Key Screens

## Public

- Landing
- Login
- Sign Up
- Forgot Password
- Email Verification

## Authenticated

- Home Dashboard
- Learning Path
- Lesson Detail
- Exercise
- Session Results
- Custom Practice Builder
- Mock Exam Builder
- Mock Exam Results
- Friends
- Friend Requests
- Friend Profile
- Battle Lobby
- Active Battle
- Battle Results
- Progress & Analytics
- Achievements
- Audio Settings
- Account Settings

## Admin

- Curriculum Editor
- Node Ordering
- Unlock Cost Editor
- XP Reward Editor
- Piano Instrument Manager
- Achievement Manager
- User moderation tools
- basic analytics

---

# 43. Results Screen

At end of ordinary session:

```text
8 / 10 Correct
+52 XP
+9 Giacominos

Strongest:
Perfect 5th — 100%

Needs Review:
Minor 6th — 50%

[Practice Mistakes]
[Continue Path]
```

Show progress, not only score.

---

# 44. Session Review

Users can inspect mistakes.

For each question:

- replay sound;
- see notes on piano;
- optionally reveal staff notation;
- user answer;
- correct answer;
- concise explanation.

This turns mistakes into learning opportunities.

---

# 45. Adaptive Review

Recommended early implementation:

Use weighted random selection.

Weight increases when:

- concept accuracy is low;
- last answer was wrong;
- concept has not been practiced recently;
- concept is commonly confused with another concept.

Weight decreases when:

- mastery is high;
- concept was practiced heavily very recently.

Still include occasional mastered items.

---

# 46. Notifications

In-app notifications:

- friend request;
- battle challenge;
- challenge accepted;
- achievement earned;
- unlock affordable.

Optional email:

- account/auth;
- friend challenge digest;
- security alerts.

Do not spam engagement emails by default.

---

# 47. Realtime Battle Architecture

Supabase Realtime channel:

```text
battle:{battleId}
```

Broadcast/state examples:

- player_joined
- battle_ready
- question_started
- answer_received
- score_update
- player_disconnected
- battle_finished

Database remains source of truth.

Realtime events are presentation transport, not authoritative scoring.

---

# 48. Disconnect Handling

If a player disconnects:

- reserve their battle seat for a grace period;
- allow reconnect;
- restore current state;
- do not regenerate questions.

If timeout expires:

- mark battle as forfeited or abandoned according to rule configuration.

Track:

- win;
- loss;
- draw;
- forfeit separately internally.

---

# 49. Security

Required:

- Supabase RLS everywhere;
- server-side reward validation;
- rate limiting on friend requests;
- rate limiting on battle invitations;
- sanitize usernames;
- no arbitrary SQL exposure;
- validate all Edge Function payloads;
- Content Security Policy;
- secure cookies/session handling;
- input validation with Zod;
- never place service-role key in browser;
- signed/private storage URLs where needed.

---

# 50. Privacy

Users should be able to configure:

- profile visibility;
- whether friends can challenge them;
- whether accuracy stats are public;
- whether battle history is visible.

Account deletion should:

- remove personal/private data;
- anonymize shared competitive history where needed for relational integrity;
- remove avatar assets;
- comply with applicable privacy requirements.

---

# 51. Performance Requirements

Targets:

- fast first load;
- exercise transitions feel instant;
- audio begins with minimal latency after preload;
- no audio download during answer interaction;
- notation renders without visible layout shift;
- mobile-first responsive behavior;
- graceful reconnect in multiplayer.

Cache static curriculum aggressively.

---

# 52. Offline / Poor Connection

Full offline support is optional.

However:

- current lesson assets should preload;
- instrument samples should cache via browser;
- temporary answer state may remain local until sync;
- battle mode requires live connection.

Potential later PWA support.

---

# 53. Admin Curriculum Model

Important architectural decision:

**Curriculum should be data-driven rather than hardcoded.**

`curriculum_nodes.config` may contain:

```json
{
  "exerciseType": "chord-identification",
  "qualities": ["major", "minor", "augmented"],
  "presentation": ["harmonic"],
  "inversions": [0],
  "voicing": ["closed"],
  "pitchRange": {
    "min": 48,
    "max": 84
  },
  "questions": 10
}
```

This lets the curriculum evolve without rewriting the app.

---

# 54. Suggested Initial Curriculum

## World 1 — Foundations

- Major vs Minor triads
- Major vs Minor visual triads
- M2 vs m2
- M3 vs m3

## World 2 — Triad Expansion

- Add Augmented
- Add Diminished
- Mixed Triads
- Visual Mixed Triads

## World 3 — Perfect Intervals

- P4
- P5
- P8
- Mixed simple intervals

## World 4 — Direction

- ascending intervals
- descending intervals
- mixed melodic direction
- harmonic intervals

## World 5 — Triad Inversions

- Major inversions
- Minor inversions
- mixed quality + inversion
- visual inversion recognition

## World 6 — Open / Closed Harmony

- closed triads
- open triads
- contrast practice
- visual recognition

## World 7 — Sixths / Sevenths / Tritone

- m6 / M6
- m7 / M7
- tritone
- mixed simple intervals

## World 8 — Seventh Chords I

- Major 7
- Dominant 7
- Minor 7

## World 9 — Seventh Chords II

- Half-Diminished 7
- Diminished 7
- Minor-Major 7
- Augmented 7 if retained

## World 10 — Seventh Inversions

- first inversion
- second inversion
- third inversion
- mixed

## World 11 — Cadences

- IV–I
- V–I
- V7–I
- inversion recognition
- major/minor contexts

## World 12 — Compound Intervals

- 9ths
- 10ths
- 11ths
- 12ths
- 13ths
- 14ths
- 15ths

## World 13 — Advanced Mixed Recognition

- all unlocked intervals
- all triads
- all seventh chords
- inversions
- open/closed harmony
- cadences
- visual + audio

---

# 55. Mock Exam Curriculum Rules

Mock exams should be able to ignore guided lesson boundaries.

Examples:

### Interval Final

Answer pool:

- every interval up to 15th;
- ascending;
- descending;
- harmonic.

### Chord Final

Answer pool:

- all supported triads;
- all supported seventh chords;
- inversions;
- closed/open harmony;
- harmonic/melodic presentation.

### Full Final

Mix:

- interval listening;
- chord listening;
- staff visual;
- piano visual;
- cadences.

---

# 56. Route Structure

Suggested Next.js routes:

```text
/
 /login
 /signup
 /forgot-password

/app
 /app/home
 /app/learn
 /app/learn/[nodeSlug]
 /app/session/[sessionId]
 /app/practice
 /app/mock-exam
 /app/mock-exam/[sessionId]
 /app/progress
 /app/friends
 /app/friends/[username]
 /app/battle
 /app/battle/[battleId]
 /app/settings
 /app/settings/audio
 /app/profile

/admin
 /admin/curriculum
 /admin/instruments
 /admin/achievements
```

---

# 57. Suggested Project Structure

```text
src/
  app/
  components/
    audio/
    battle/
    curriculum/
    exercise/
    notation/
    piano/
    progress/
    ui/
  features/
    auth/
    friends/
    lessons/
    mock-exam/
    rewards/
  lib/
    audio/
    music-theory/
    question-generation/
    supabase/
    validation/
  server/
    rewards/
    battles/
    curriculum/
  types/
  styles/

supabase/
  migrations/
  functions/
    complete-lesson/
    unlock-node/
    create-battle/
    submit-battle-answer/
    finish-battle/
```

---

# 58. Exercise Component Architecture

Shared exercise shell:

```tsx
<ExerciseShell>
  <ProgressHeader />
  <StimulusArea />
  <PianoAid />
  <AnswerGrid />
  <ExerciseControls />
  <FeedbackPanel />
</ExerciseShell>
```

Stimulus implementations:

```text
AudioIntervalStimulus
AudioChordStimulus
AudioCadenceStimulus
StaffIntervalStimulus
StaffChordStimulus
StaffCadenceStimulus
PianoVisualIntervalStimulus
PianoVisualChordStimulus
```

All conform to a common question contract.

---

# 59. Keyboard Shortcuts

Desktop:

- `Space` — replay sound
- `1–9` — choose answer
- `Enter` — continue
- piano mappings — configurable

Avoid shortcut collisions between answer keys and playable piano keys.

---

# 60. UX Details That Matter

- do not play new audio while old playback is active;
- disable double-submit;
- prefetch next question;
- always show loading state before first audio sample is ready;
- never silently change piano instrument mid-session;
- preserve custom-practice settings between sessions;
- clearly distinguish “practice” from “mock exam”;
- give users an easy replay after mistakes;
- avoid giant answer grids on mobile;
- sort answer options consistently unless the lesson specifically trains random recognition.

---

# 61. Sound Feedback

Correct/incorrect UI sounds should be:

- optional;
- quieter than the musical stimulus;
- disabled during serious exam mode if desired.

Do not use musical feedback tones that could interfere with pitch memory immediately before the next question.

---

# 62. Analytics

Useful student analytics:

- overall accuracy;
- accuracy by concept;
- accuracy by register;
- ascending vs descending;
- harmonic vs melodic;
- inversion accuracy;
- chord-quality confusion;
- repeats per question;
- response time;
- mastery timeline.

Admin analytics:

- lesson completion rate;
- common drop-off nodes;
- concepts with highest error rate;
- battle usage;
- piano preference distribution;
- retention.

---

# 63. Testing Strategy

## Unit tests

Music theory engine:

- interval semitone maps;
- compound intervals;
- inversions;
- seventh construction;
- open voicing;
- range constraints;
- enharmonic spelling.

## Integration tests

- session completion;
- XP reward;
- Giacominos reward;
- unlock purchase;
- authentication;
- friend requests;
- battle creation;
- battle scoring.

## End-to-end

Use Playwright.

Critical journeys:

1. sign up → first lesson → XP
2. complete repeated lesson → earn Giacominos → unlock next node
3. custom interval practice
4. mock exam
5. change piano sound and preview
6. add friend
7. challenge friend
8. finish battle
9. see win/loss history

---

# 64. Seed Data

Development/production seed should include:

- all interval definitions;
- triad definitions;
- seventh definitions;
- cadence definitions;
- initial curriculum;
- achievements;
- piano instrument metadata;
- default app configuration.

Never generate curriculum only from frontend constants.

---

# 65. Environment Variables

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=

BATTLE_SIGNING_SECRET=

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

Service role key must only exist server-side.

---

# 66. Observability

Recommended:

- Sentry for frontend/server errors;
- structured server logs;
- Supabase logs;
- uptime monitor;
- audit trail for reward/unlock transactions.

Especially monitor:

- failed sample loads;
- battle disconnects;
- reward RPC failures;
- realtime channel errors.

---

# 67. Backups

Production requirements:

- automatic Supabase/Postgres backups;
- database migration history committed to git;
- piano samples backed up separately;
- restore process documented.

---

# 68. CI/CD

Recommended pipeline:

```text
push
→ lint
→ typecheck
→ unit tests
→ build
→ Playwright smoke tests
→ deploy
```

For VPS:

- GitHub Actions;
- build Docker image;
- push to registry;
- SSH/deploy or pull through deployment agent;
- run migrations safely;
- restart app.

---

# 69. Docker

Suggested services:

```yaml
services:
  web:
    build: .
    restart: unless-stopped

  caddy:
    image: caddy
    restart: unless-stopped
```

Supabase may remain hosted.

If self-hosted later, keep its infrastructure separate from the web app deployment configuration.

---

# 70. MVP Definition

A production-quality first version should include:

### Authentication

- Supabase signup/login/reset

### Learning

- interval curriculum through octave initially
- all triads
- selected seventh chords
- ascending/descending/harmonic
- visual staff identification
- visual piano identification
- guided learning path
- custom practice
- 10-question default
- configurable pitch range
- repeat audio

### Audio

- sample-based piano
- at least 3 piano options
- preview before selection

### Gamification

- XP
- account levels
- Giacominos
- unlockable curriculum nodes
- mastery
- achievements

### Social

- usernames
- friend requests
- friends list

### Battle

- 1v1 friend challenges
- realtime battle
- stored wins/losses/draws
- opponent-specific record

### Exam

- mock exam
- results breakdown

### Production

- RLS
- validation
- Docker deployment
- testing
- monitoring

---

# 71. Phase 2

After core system proves stable:

- richer cadence catalog;
- dictation;
- melodic dictation;
- rhythm training;
- chord progression recognition;
- solfège;
- key detection;
- singing exercises using microphone;
- classrooms;
- teachers assigning exercises;
- leaderboards limited to friends;
- custom teacher-made exam templates;
- native/PWA offline practice;
- additional instruments.

---

# 72. Important Product Rules

1. **Do not include Augmented Major Seventh.**
2. Piano sound must be sample-based and selectable.
3. Every piano sound must have a preview.
4. Audio exercises always support repeat in normal practice.
5. Visual identification must support both staff and piano.
6. Intervals extend through the 15th.
7. Interval practice supports ascending, descending, and harmonic.
8. Chord learning is progressively expanded rather than exposing every answer immediately.
9. Cadences include IV–I and V–I families, including inversions and sevenths.
10. Users may define a pitch/register range.
11. Default custom session is 10 questions.
12. Mock Exam uses a broad answer pool.
13. Supabase is the source of truth for accounts/progression/social data.
14. XP is permanent progression.
15. Giacominos are spent to unlock curriculum.
16. Players must practice to earn unlock currency.
17. Friend battles track wins/losses/draws against each opponent.
18. Competitive scoring must be server-validated.
19. Curriculum configuration must be data-driven.
20. The app should feel cozy, elegant, rewarding, and musically serious.

---

# 73. Recommended First Build Order

## Milestone 1 — Musical Core

Build:

- theory engine;
- interval generation;
- chord generation;
- sample playback;
- piano component;
- VexFlow notation;
- question engine.

No gamification until musical correctness is thoroughly tested.

## Milestone 2 — Single-Player App

Build:

- Supabase auth;
- profiles;
- learning path;
- guided lessons;
- custom practice;
- results;
- mastery.

## Milestone 3 — Economy

Build:

- XP;
- account levels;
- Giacominos;
- node unlock purchases;
- achievements.

## Milestone 4 — Advanced Curriculum

Build:

- sevenths;
- inversions;
- open harmony;
- cadences;
- compound intervals;
- mock exams.

## Milestone 5 — Social

Build:

- usernames;
- friend requests;
- friend profiles;
- privacy.

## Milestone 6 — Multiplayer

Build:

- realtime challenge flow;
- battle creation;
- deterministic question generation;
- server validation;
- battle stats;
- reconnect handling.

## Milestone 7 — Production Hardening

Build:

- admin tools;
- analytics;
- E2E testing;
- observability;
- Docker deployment;
- backups;
- security review.

---

# 74. Definition of Done

The product is ready for initial public use when:

- users can sign up and retain progress;
- generated music-theory questions are verified as correct;
- audio sounds like a believable piano;
- piano presets can be auditioned and selected;
- lessons introduce concepts progressively;
- intervals work up to the 15th;
- chords include the required triads and sevenths;
- Augmented Major Seventh is absent;
- inversions work correctly;
- closed/open harmony works correctly;
- listening modes support melodic/harmonic presentation;
- visual staff/piano exercises work;
- cadences work;
- pitch-range selection works;
- Repeat works reliably;
- mock exams work;
- XP/levels/Giacominos/unlocks work securely;
- friend requests work;
- users can challenge friends;
- multiplayer scoring is server-authoritative;
- wins/losses/draws are saved per opponent;
- RLS policies are tested;
- the app can be deployed reproducibly to a VPS.

---

# 75. Product Summary

EarGiacomo should feel like opening a beautiful little conservatory in the browser.

The student enters, sees a path of musical skills, practices small focused lessons, earns XP and Giacominos, unlocks increasingly complex concepts, reviews weak spots, experiments with a playable piano, studies both by ear and by notation, takes mock exams, and challenges friends.

The educational loop is:

```text
Learn
→ Practice
→ Improve mastery
→ Earn XP + Giacominos
→ Unlock new concepts
→ Mix concepts
→ Test yourself
→ Battle friends
→ Review weaknesses
→ Repeat
```

That loop should drive every architectural and UX decision in the app.
