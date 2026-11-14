# Task 2: flashcard scheduling

Write a JavaScript module that exports one function, `srsNext(e, g, d)`.

- `e` is the card's current entry, or `null` for a card never seen. An entry is an array `[dueDay, interval, ease, lapses]`: the day number it is due, the interval in days (0 means still learning), the ease multiplied by 100, and the number of lapses.
- `g` is the grade: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
- `d` is today's day number (an integer).
- A card never seen starts with interval 0, ease 250, lapses 0.
- Return the new entry `[dueDay, interval, ease, lapses]`.

Rules, applied in this order:

1. Grade 1 (Again): if the interval is greater than 0, add one lapse and lower the ease by 20, but never below 130. Return `[d, 0, ease, lapses]`.
2. If the interval is less than 1 (still learning): grade 2 returns `[d, 0, ease, lapses]`. Grade 3 gives a new interval of 1. Grade 4 gives a new interval of 4.
3. Otherwise (interval 1 or more):
   - Grade 2: new interval is the larger of `interval + 1` and `round(interval * 1.2)`; lower the ease by 15, never below 130.
   - Grade 3: new interval is the larger of `interval + 1` and `round(interval * ease / 100)`.
   - Grade 4: new interval is the larger of `interval + 2` and `round(interval * ease / 100 * 1.3)`; then raise the ease by 15.
   In each case the multiplication uses the ease from before this review.
4. The new interval is never more than 3650.
5. Return `[d + newInterval, newInterval, ease, lapses]`.

Rules for your reply:
- Reply with exactly one fenced code block containing the complete file, and nothing else.
- Plain JavaScript, ES modules (`export`), no imports, no dependencies, no TypeScript.
- Do not print anything and do not include usage examples.
