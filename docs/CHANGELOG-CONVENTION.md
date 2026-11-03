# Auto-Logging Changelog Convention

Every completed build request gets logged to the changelog automatically. This is a
standing convention followed at the end of each task — there is no separate feature
to configure, no new entity field, and no workflow.

## The rule

Always set `change_date` (ISO timestamp of when the change was made) on every entry.

At the end of every build request that changed the app, create exactly **one**
`ChangelogEntry`:

```js
const entry = await base44.entities.ChangelogEntry.create({
  title,        // short, past-tense, product-facing (see below)
  description,  // 1–2 sentences: what changed and why
  category,     // feature | fix | design | content | backend | other
  source: 'auto',
});

// Best-effort Featurebase draft — never block on failure.
try {
  await base44.functions.invoke('pushChangelogToFeaturebase', { entry_id: entry.id });
} catch (_e) {}
```

One entry per user request — not per file, not per session.

**Always log, no exceptions.** Every change gets an entry the moment the work is
done, whether or not the app is published afterward — this includes data imports,
fixes, design tweaks, backend changes, and doc/config changes. Never skip or batch
entries for later.

## Writing the title and description

- **Title**: short and past-tense, describing the outcome the user can see
  (e.g. "Simplified the Explore location filters"). No file names, no code terms.
- **Description**: 1–2 plain sentences covering what changed and why it matters.
- Written for a reader of the public changelog, since these entries feed the
  nightly email and the Featurebase drafts.

## Choosing the category

| Category  | Use when the work was…                                        |
|-----------|---------------------------------------------------------------|
| `feature` | new user-facing capability                                    |
| `fix`     | something broken now works                                    |
| `design`  | layout, styling, spacing, visual polish                       |
| `content` | copy, blog, email or static text changes                      |
| `backend` | functions, workflows, entities, integrations, automation      |
| `other`   | nothing above fits                                            |

## When to skip

Skip logging when a request produced no change to the app — pure questions,
investigations, or a plan that wasn't built yet.

## What consumes these entries

- **Admin → Changelog** page, grouped by day
- **Nightly changelog email** at 10pm (`sendDailyChangelogEmail`)
- **Featurebase changelog drafts** (`pushChangelogToFeaturebase`)

Entries created this way carry `source: 'auto'`; entries typed into the admin form
carry `source: 'manual'`. Both flow through the same email and Featurebase path.