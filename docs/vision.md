# Hidden Truths — Vision & Roadmap

_Captured verbatim from Seedorf's breakdown, 2026-07-27. This is a long-range vision document, not a locked spec — see the recommendations thread in project history for suggested sequencing._

## Vision

Hidden Truths is no longer just a proposal game. Version 2 transforms it into an interactive relationship platform that begins as a mystery adventure, becomes a proposal experience, evolves into a personalised date planner, and finally grows into a digital memory vault that couples can continue using long after the proposal.

The goal is to create an experience that feels closer to a premium narrative game than a traditional website.

Think of it as:
**Journey → Proposal → Date → Relationship Companion**

## Core Design Philosophy

The application should always feel: magical, mysterious, emotional, cinematic, premium, polished, relaxing, interactive.

Nothing should feel like a normal website. Everything should feel alive. Animations, transitions, sounds and interactions should work together to create emotion rather than simply display information.

## Current Version (V1)

Flow: Welcome Screen → Journey Map → Five Challenges → Transmission → Cabin Builder → Proposal → Journey Home → Ending

Features: save progress, animated transitions, background music, sound effects, puzzle progression, proposal reveal, cinematic ending.

## Version 2 Goal

After saying YES, the application becomes something entirely different. Instead of ending, the player unlocks an entire new world.

### New Home Screen — "Our Journey"

Main dashboard with cards: Memories, Adventures, Date Planner, Bucket List, Relationship Timeline, Milestones, Gallery, Messages, Settings.

### Memory Vault

Every memory becomes an artifact containing: title, description, location, date, emotions, photos, videos, music, voice recordings, notes.

Example: First Ice Cream → Photos → Video → Story → GPS Location → Favourite song from that day → Comments → Reaction.

### Gallery Improvements

Each memory supports: unlimited photos, videos, captions, slideshow, fullscreen mode, download, share.

### Timeline

Chronological relationship timeline: First Message → First Call → First Date → Official Relationship → First Christmas → First Birthday Together → Proposal → Wedding → Future milestones.

### Relationship Milestones

Automatic countdowns: Anniversary, Christmas, Valentine's, Birthdays, special traditions. E.g. "12 days until Anniversary," "48 days until Christmas," "3 years together."

### Adventure Generator

Generate adventures (coffee date, beach walk, museum, sunset drive, stargazing, movie night, road trip, picnic, escape room, bowling, camping) factoring in weather, distance, budget, available time, preferences.

### AI Date Planner

Asks: budget, weather, mood, morning or night, indoor or outdoor, driving distance, food, surprise — then builds a complete itinerary (e.g. lunch → botanical gardens → ice cream → sunset lookout → movie → home).

### Outfit Suggestions

Based on weather, season, location, activity, dress code, time of day.

### Restaurant Suggestions

Filter by cuisine, budget, rating, distance, reservations.

### Bucket List

Shared list (see Northern Lights, travel to Japan, skydive, watch sunrise together, road trip, escape room). Each item supports completion, photos, date completed, comments.

### Couple Challenges

Recurring challenges: 30-day challenge, photo challenge, cooking challenge, fitness challenge, Bible reading challenge, memory quiz. Rewards unlock badges.

### Memory Quiz

Randomly asks questions (where was our first kiss, first movie, favourite ice cream, what day did we meet). Correct answers unlock achievements.

### Shared Journal

Private journal: daily entries, photos, mood, voice notes, gratitude.

### Love Letters

Digital letters, schedule future letters (open on anniversary, birthday, in 5 years).

### Surprise Generator

Creates surprise ideas based on budget, season, time available, personality, weather.

### Travel Planner

Maps, itinerary, packing list, budget, photos afterwards.

### Interactive World Map

Pins every memory. Clicking a location opens photos, story, videos, date, weather from that day (where available).

### Achievement System

Unlock achievements: 100 Memories, First Road Trip, 10 Date Nights, 365 Days Together, Complete Every Challenge.

### Statistics Dashboard

Days together, countries visited, cities visited, photos, videos, letters written, dates completed, bucket list progress.

### AI Assistant

Answers: what should we do today, suggest a date, recommend a gift, find a restaurant, plan a trip, generate anniversary ideas.

## Version 3 Ideas

Wear OS / Apple Watch, mobile app, Apple Health integration, shared calendar, Spotify integration, Google Photos sync, Instagram memory import, AI-generated photo albums, voice conversations, AR treasure hunts, location-based surprise quests, wedding planner, family timeline, children milestones.

## Proposed Technical Stack

- **Framework:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion
- **Database:** PostgreSQL
- **Auth:** NextAuth/Auth.js
- **Storage:** Cloudinary or Supabase Storage
- **Maps:** Google Maps API
- **Weather:** OpenWeather API
- **AI:** OpenAI API
- **Notifications:** Firebase Cloud Messaging
- **Hosting:** Vercel
- **Analytics:** PostHog or Vercel Analytics

## UX Principles

Every interaction should feel smooth, magical, emotional, have subtle animations, use ambient audio, never feel abrupt.

Every page should have: loading transitions, page transitions, background ambience, micro-interactions, beautiful typography, consistent colour palette, responsive layout.

## Recommended Improvements

1. **Save System** — multiple save slots, cloud sync, automatic saves, checkpoints
2. **Accessibility** — subtitles, reduced motion mode, colour-blind support, keyboard navigation, screen reader compatibility
3. **Performance** — preload images, preload music, lazy load videos, optimise animations, cache API requests
4. **Security** — authenticated access after the proposal, encrypted private memories, secure media uploads, role-based permissions if sharing with others
5. **Polish** — dynamic weather effects, seasonal themes (Christmas, Valentine's, birthdays), richer sound design, ambient particles, optional haptic feedback, subtle camera/parallax movement, cinematic cut-scenes between major sections

## Success Criteria

Version 2 should not feel like "more pages." It should feel like a living, evolving relationship experience that the couple continues to use for years. Every feature should strengthen the core purpose: preserving memories, encouraging shared experiences, and making everyday moments feel meaningful through thoughtful design, storytelling, and interaction.

## Recommended Sequencing (agreed 2026-07-27)

Decisions going in: build starts **after** the proposal, not before. Data model designed multi-couple-ready from day one, but only the two of them will actually use it at first. Small monthly budget is acceptable (paid API tiers okay in moderation). Build order follows the phases below, one at a time, rather than attempting the full vision at once.

**Phase 0 — Foundation.** Introduce the first real backend the project has ever had: Supabase (Postgres + Auth + Storage in one vendor, generous free tier). Data modeled around a `couple_id`/`household_id` so multi-couple support later is a config/signup change, not a rewrite. Simple auth gate — invite-only for now, no public signup yet.

**Phase 1 — Our Journey dashboard + Memory Vault.** Replaces the current post-proposal stub screen. One `memories` data model (title, description, date, location, photos, videos, notes, music) with a list view, detail/"artifact" view (reusing V1's existing cinematic reveal pattern for visual consistency), and an add/edit form. This single phase also yields the Gallery (photos per memory, fullscreen/slideshow) and the Timeline (memories sorted chronologically) essentially for free, since they're just different views over the same data — no separate build needed for either.

**Phase 2 — Milestones/countdowns.** Pure computation off dates already known (relationship start date is already tracked in V1) plus a small table of important dates (anniversary, birthdays, Christmas, Valentine's). No new infrastructure beyond the foundation.

**Phase 3 — Date/Adventure Generator.** Builds on the plan already scoped earlier: curated pool of real places/activities as the backbone, AI-generated flavor text and pairing logic, weather-aware, budget estimate, music pairing, outfit tailored to weather/venue formality with style presets as a fallback.

**Deferred, prioritized one at a time after the core is live:** Bucket List, Shared Journal, Love Letters (high emotional value, low complexity — good early candidate once Phase 1 exists), Couple Challenges, Memory Quiz, Achievement System, full Statistics Dashboard, Surprise Generator, Travel Planner, Interactive World Map, AI Assistant, Outfit/Restaurant recommendation APIs.

**Deliberately pushed to the back of the line:** AI Assistant, Outfit Suggestions, Restaurant Suggestions, and historical weather-by-date on the map — each depends on a paid third-party API and adds real ongoing cost/maintenance, so they come after the free-tier-friendly core is proven out.

## The "Uber" Ambition — Scoped (agreed 2026-07-27)

Long-term goal: many separate couples independently using this platform, not just the two of us — but clarified as **existing couples signing up together**, not a matching/discovery product. This rules out the trust-and-safety, verification, and moderation machinery a real dating platform needs, and keeps the existing phased roadmap above as the right foundation rather than a wrong turn. "Uber-like" here means ubiquity and habit, not literal marketplace/matching mechanics.

Other decisions: revenue is explicitly not the focus yet — validate the core experience and see its real potential before building any monetization. Ambition/resourcing is still being figured out (not committed to solo-forever, a real launch, or seeking funding) — revisit this question once the core is live and it's clearer whether it has real legs.

### The core risk to "world class at scale"

Uber works because it has an obvious, frequent trigger — you need to get somewhere, now. A couples app's core actions (plan a date, log a memory) don't naturally happen often. If the app only gets opened when someone remembers it exists, it never becomes a habit. The single highest-leverage question for this whole vision is: **why would someone open this on a random Tuesday when nothing's planned?** Everything below is partly an answer to that.

### Differentiation

Existing couple apps (Between, Paired, Lasting) are competent but generic — shared calendar, private chat, canned quizzes, to-do-app aesthetics. They compete on feature checklists, which is a losing game against funded teams. What V1 already proves this project can do, and what none of the competitors do, is make the product feel made specifically for the couple using it — cinematic reveals, real narrative voice, genuine vulnerability in the writing instead of generic prompts. That texture is the actual moat, and it's hard to copy because it comes from care, not a roadmap.

The recommended positioning: "the most beautifully made relationship app that exists," not "the one with the most features." Concretely, this means carrying V1's visual language forward literally into V2 — new memories get the same artifact-reveal treatment the fragments got, milestones "unlock" the way artifacts did, the date generator feels like drawing a card, not filling out a form.

### AI Assistant — the real spectrum of options

"Build our own AI assistant" can mean four different things, with very different cost/complexity:

1. **A branded wrapper around Claude or GPT with a custom system prompt.** What almost every consumer app's "AI assistant" actually is under the hood. No training involved — send the user's message plus relevant context to an API with a system prompt defining personality and boundaries. Cheap, fast to build, the right starting point.
2. **Retrieval-augmented generation (RAG) — the assistant that actually knows the relationship.** Before answering, it pulls real context from the couple's own Memory Vault (past dates, what they loved, what they haven't done in months), so suggestions are informed by real history instead of being generic. Still the same underlying model, just a smarter retrieval layer in front — a database + prompt-engineering problem, not a machine-learning one. Naturally depends on Memory Vault having real data first, which is exactly why AI Assistant is sequenced late.
3. **Fine-tuning a model on the couple's own data.** Possible but not recommended here — needs a large dataset, expensive, and mostly helps teach a specific *style* at scale. RAG gets ~90% of the personalization value for a fraction of the cost, and updates instantly instead of needing retraining.
4. **Training a model from scratch.** Not realistic, ruled out — enormous compute/data requirements and would perform worse than just using Claude or GPT for conversation.

**Recommendation:** start with option 1, evolve into option 2 (RAG) once Memory Vault has enough real data to make retrieval meaningful. Give it a name and personality consistent with the Hidden Truths mythology rather than a generic "AI Assistant" label — a small in-universe voice, reinforcing craft-as-differentiator.

### Additional improvements identified

- **"On this day" resurfacing** — an old memory quietly resurfaces on its anniversary, unprompted (like Facebook Memories/Timehop). The best concrete answer to the "why open it on a Tuesday" problem; cheap once Memory Vault exists.
- **Design for two-way participation, not one person maintaining a database.** V1 is a monologue by design, which was right for a proposal. V2 needs both partners adding memories, proposing/accepting date ideas, and real notifications when the other person does something — otherwise it becomes one person's chore.
- **Speed and reliability over feature count, especially in the moment.** If a couple is actually on a date checking the itinerary or adding a photo, a slow or flaky app kills the magic instantly. Treat performance and offline-friendliness as core, not polish.
- **Data export/ownership.** Letting couples download everything they've put in builds real trust for something this personal. Not hard to build, worth doing early.
- **Onboarding as its own real design problem.** Everything built so far is a scripted, single-use surprise. A new couple signing up cold, with no proposal narrative to carry them, is a completely different first-run experience that hasn't been designed yet — deserves as much care as the proposal sequence.
- **Take reliability seriously once real memories are at stake.** Losing photos or corrupting months of entries is a much worse failure mode than a bug in a one-time experience. Backups and careful data handling matter a lot more starting in Phase 1 than they did in V1.

---

## In-app messaging, and the path beyond established couples (agreed 2026-08-27)

Captured after V2's foundation shipped: auth, `couple_id`-scoped RLS, the
Memory Vault, and the date generator writing to `date_plans`.

### 1. Sharing should happen inside the app

Today, sharing a date plan hands off to the OS share sheet — it leaves the
app and lands in WhatsApp or Messages. That made sense when there was no
backend and no notion of a partner. It doesn't any more: both people are
already linked by `couple_id`, so the natural thing is to send the plan
*to them*, in here.

This is the messaging layer deliberately deferred during Phase 1.

**Implementation is mostly already paid for.** A `messages` table keyed to
`couple_id`, with RLS written exactly like `memories`, inherits all the
privacy work already done — one couple can never read another's thread.
A shared date should be a message *referencing* `date_plans.id` rather
than a copy of the text, so that when the plan gains a pickup time or a
location the conversation reflects it instead of going stale.

Worth deciding when building: whether messaging is general chat, or
strictly attached to plans and memories ("here's the idea", "we did
this"). The narrower version is more useful and far less work — nobody
needs another general-purpose chat app, and competing with iMessage is
not a fight worth picking.

### 2. Generalising "couple" to "two people going on a date"

The current model assumes an established relationship. The intent is to
widen it: two people going on a date who aren't a couple yet should be
able to link profiles the same way.

**The schema already supports this.** Nothing in `couples`, `date_plans`,
`memories` or the RLS policies encodes anything romantic or permanent —
it's just a container two profiles belong to. What's misleading is the
*name*. If this generalises, `couples` should become something neutral
(`connections`, or a `couples` row with a `type` and `status`), because a
table name that lies about its contents is how data models rot.

Also worth thinking through before it ships:
- What happens when a connection ends? Memories were created jointly.
  Who keeps them? This needs an answer before, not after, someone asks.
- Two strangers linking accounts is a materially different trust problem
  from two people already in a relationship. It's the point where
  consent, blocking, and reporting stop being optional.

### 3. Self-serve signup and partner linking

Right now invites are created by hand in SQL, which works for exactly two
people. To grow, a person needs to sign up on their own and then link the
other half.

Most of this exists. `/join` already redeems a token, creates the account,
and attaches the profile to the right container. What's missing is an
in-app screen to *generate* an invite instead of writing SQL, plus the
handling for the second person accepting. The invite mechanism itself is
proven and doesn't need redesigning.

### 4. Profiles: interests, background, and accessibility

At signup, ask for interests, background, and things they'd like to try,
then feed those into generation so ideas reflect who they actually are
rather than just mood and budget.

**Accessibility is the part to get right, and it needs more than a prompt
line.** If someone is a wheelchair user, has limited mobility, is deaf or
blind, or has any other access need, the generated date must genuinely
work for them.

Three things follow from that:

- **Structured, not free text.** A sentence buried in a notes field is
  something a model can quietly drop. Discrete fields can be enforced.
- **A hard constraint, not a preference.** Mood and budget are things the
  model balances. Access needs are not negotiable, and the output should
  be *validated* against them rather than trusted. An LLM told "wheelchair
  user" can still cheerfully suggest a clifftop walk; the fix is a check
  after generation, not louder wording in the prompt.
- **Sensitive data.** Health and disability information deserves more care
  than a favourite cuisine: explicit about why it's collected, easy to
  edit or delete, and shared with a partner only if the person chooses.
  It should never leak into anything public-facing.

Done properly this is also a genuine differentiator. Most date-idea tools
assume an able-bodied user and quietly exclude everyone else.

### Sequencing note

None of this blocks the proposal. The order that makes sense: in-app
sharing of plans (small, high value, schema already supports it) →
profile attributes feeding generation → self-serve signup and invites →
generalising beyond couples, which is the largest change and the one
carrying real trust-and-safety weight.

---

## Product thinking: what would make this worth keeping (2026-08-27)

### The real problem is frequency, not features

Date planning is episodic — weekly at best, often monthly. Apps with low
natural frequency die regardless of quality. The question isn't "what else
can it do", it's **why would someone open this on a Tuesday when they
aren't planning anything?**

The answer isn't the generator. Generating a date idea is a utility used
rarely and roughly replaceable with a web search. Memories accumulate:
the more there are, the more the app is worth and the less anyone would
leave. **That's the moat, and it deserves the investment.**

### Highest-leverage additions

**Close the plan → memory loop.** The single most valuable thing here.
There's a gap between "saved a plan" and "logged a memory" that most
people will never cross unaided. A nudge a day later — _"you saved Bondi
coastal walk for Saturday, how did it go?"_ — converts intention into
memory at near-zero effort, and produces the content everything else
feeds on.

**On-this-day resurfacing.** Cheap, and the one thing that gives a reason
to open the app with no task in mind.

**Solve the cold start.** A new couple opens an empty app and feels
nothing. Ask for three memories from _before_ they joined during
onboarding. The app becomes theirs immediately rather than in six months.

**Make it genuinely two-player.** If one person does the work it dies. But
full chat is a big build competing with iMessage. Small interactions beat
conversation: react to a memory, vote between the two generated options
(a tap each is a better fit for that decision than a thread), get notified
when the other person adds something.

**Anticipation.** Half the pleasure of a date is looking forward to it.
`scheduled_for` already exists; a shared countdown creates value before
anything happens.

### The sharpening question

What is this app the **best** place for — not what can it contain?

Couples already have WhatsApp, a photo library and a calendar. What none
of those do is **connect intention to memory**: we planned this, we did
it, here's what it became. That loop is the genuinely defensible thing.
Sharpening toward it matters more than breadth — the journal, bucket list
and world map in the V3 list would each dilute it.

The accessibility idea deserves treating as strategy, not a feature.
Nearly every date app assumes an able-bodied user. Being the best option
for people with access needs is underserved, defensible, and worth doing
regardless.

### Honest risks

**This category is a graveyard.** Between, Couple and others had real
funding and mostly failed. Not a reason to stop — a reason to stay narrow.

**Video storage doesn't scale for free.** Photos are cheap; video isn't.
At any real user count, unlimited video is a per-user loss. That's an
architecture decision to make early, not a pricing decision to make late.

**The generator will feel same-y by the tenth use.** Needs suggestion
history to avoid repeats, ratings so it learns, and weather/season
awareness so it feels alive rather than a static prompt.

---

## Date lifecycle, rituals and play (agreed 2026-08-27)

### A date has a lifecycle, not just a row

Dates get planned and then don't happen, or happen differently. The model
should record that honestly:

`planned → started → completed → rated`, with `cancelled` and `modified`
as first-class outcomes rather than missing data.

This also solves the plan → memory gap above: a completed date is the
natural trigger for "how was it?" and for creating the memory.

**Start/end, Uber-style — with one reservation.** The idea is a start
button when the date begins and an end initiated by one person and
confirmed by the other, auto-ending by the close of the next day.

The reservation: the point of a date is being present with each other,
and this asks people to pull out their phones at the two moments they
least should. Uber needs it because billing depends on it; nothing here
does.

Suggested compromise — keep the states, drop the ceremony:
- Starting is **optional**. If someone taps it, good; otherwise the
  scheduled time implies it.
- Either person can mark it done. The other is invited to rate, but the
  date advances regardless — never leave it stuck waiting on someone.
- Auto-complete at the end of the next day, then ask.

Note the auto-end is the important part, because forgetting is the common
case, not the exception.

### Rating — and a caution worth taking seriously

Each person rates the date independently. Two design points that matter
more than they look:

**Rate the date, never the partner's effort.** "3 stars" on something your
partner planned is a landmine. Frame it around the experience — _would we
do this again?_ — not the performance.

**Consider hiding each rating until both are in.** Otherwise the second
person anchors on the first, and the data is worth less as well as being
socially awkward.

A soft scale ("loved it / good / not for us") is likely better than stars,
both for feelings and for feeding the generator.

### Categories

Indoor/outdoor, activity/dinner/experience, cost band, energy level, plus
outcome (happened / cancelled / changed). Enables the stats view, better
generation ("we haven't done anything outdoors in two months"), and makes
the archive genuinely browsable.

For dates that changed, record **planned vs actual**. The gap between them
is often the better story.

### Recurring rituals

Couples pick a slot — Tuesday 5pm, or the first Sunday of the month — for
a recurring shared moment. This directly attacks the frequency problem:
it's appointment-based rather than waiting for someone to remember.

Two formats to start:
- **Relationship trivia** (below)
- **The monthly five** — five things you loved, and five that didn't
  work, from the past month

On the monthly five: capturing the bad alongside the good is a genuinely
good instinct — highlight-reel-only apps feel fake. Worth being careful
that "hated" is framed at the month or at life, not at each other, or it
becomes a grievance log. Possibly let each couple choose the framing.

### Games and trivia, carried from V1

V1's mechanics port well, and the best of them is the Final Key format:
_which would I choose?_ — guessing your partner's answer. It generalises
directly into "how well do you know each other".

**The strongest version generates trivia from their own memories.** _Where
were we on 11 Feb? Which of these three did we do first?_ That's
impossible for any competitor to copy, gets better the longer they use the
app, and turns the archive from storage into play. The V1 timeline puzzle
maps onto it almost unchanged.

### Notifications

Required for the nudges, rituals and two-way moments above — none of them
work without a way to reach people.

Technically: this is a web app, so web push via a service worker (PWA),
with email as the fallback and probably the better starting point. A
native app is the real answer eventually, but not a step to take yet.

Restraint matters. The reasons to interrupt someone are: your partner did
something, your ritual is due, and a date needs closing. Anything beyond
that trains people to disable notifications.

### Further ideas worth considering

- **Rain check.** A cancelled date shouldn't just die — offer to
  reschedule it. Turns a failure into a future date.
- **Year in review.** Annual recap of everywhere you went and everything
  you kept. High emotional value, and the one genuinely shareable
  artefact — a growth loop, if opt-in and deliberate.
- **Date roulette.** Can't decide? Pick at random from your saved ideas.
- **Weather-triggered prompts.** "It's clear on Saturday — here are the
  outdoor ideas you saved."
- **Balance, handled gently.** Who's been planning lately. Useful as a
  nudge, dangerous as a scoreboard.

### Deliberately avoid

- **Streaks.** They drive engagement in other apps by manufacturing guilt.
  Guilt about breaking a *relationship* streak is a genuinely bad thing to
  introduce into someone's relationship.
- **Points or leaderboards between partners.** Competitive dynamics
  between two people who are meant to be on the same side.
- **Public or social features.** This is private data. Sharing should be
  an export the couple chooses, never a feed.
