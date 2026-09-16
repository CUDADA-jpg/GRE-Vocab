# 词间 · Wordloom

Interactive static vocabulary-app prototype using the 58 collected learning cards. Browse, search, navigate, and edit mnemonic stories. Full cards are the default. An optional spaced-recall mode conceals card details until reveal, offers text/image hints, and schedules words from explicit recalled / hint / forgot ratings. No quiz, typed answer, or automatic mastery inference. Five mnemonic illustrations are included (purloin, apoplectic, wend, enjoin, diaspora).

Edited stories and review events remain in the current browser's localStorage. Review data uses `wordloom-reviews-v1`, independently of existing `wordloom-memories-v1` mnemonic edits. A failed review save keeps the current card. Invalid review data is not overwritten. New-word AI generation and cross-device synchronization are not connected.

`dist/review.js` holds the deterministic initial scheduler: unaided recalls advance through 1, 3, 7, 14, 30, 60 days, hints retry in 10 minutes and step down one stage, forgotten cards retry in 1 minute and reset. This is a transparent starter rule, not an empirically personalized forgetting model. New cards are due immediately. The optional review queue only includes due cards.

The canonical vocabulary content comes from the parent workspace's vocabulary-app-design.md. Only the extracted word cards are included in this site. `dist/` contains the authored public files; no build or dependencies are required.

Checkpoint: a manual progress dialog and automatic pauses at every 10 first-time word ratings or 10 completed reviews per round. Shows latest self-rating distribution, share rated 4–5 out of all words, due count, and today’s saved recall count. No inferred mastery or time estimates.

## Run locally

Requires Python 3. From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8765 in your browser. No installation or build step is needed.

The repository contains the app and vocabulary content. Personal familiarity ratings, review history, and edited mnemonics stay in browser storage and are not uploaded to GitHub.
