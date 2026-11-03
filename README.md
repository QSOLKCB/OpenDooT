# OpenDooT
OpenDooT - The Email Checker That Updates Your Email And Tells You About IT - Even When You Didn't Ask For It.


For example >>>

"Did you just sign in? Just checking, not that I was looking or anything :-)."

"You haven't paid your  AwSssCORP Bill for $3.00, YOu poor prick! Did you plan to pay it this year or what?"

"Did you just sign in? I could smell it across the cloud computer while playing Solitaire and looking at your Emails"

"Did you want your subscription to "I_LIKE_MY_LATINAS_THICK_N_BIG(dot)com? Still? or are you just going to rub one out in the shower tonight?"

"Did you just sign in? I swear you did this time! I mean.... not that I was watching or looking at your degenerate emails"

"Did you just sign in?  *Some one signing in from a different device on a new location* Where are you? Please turn on GPS so I can track you :-)"

"Head's up I did that research all night for you and found jack and his shit."

"Did you just sign in? or am I looking at your emails?"

"Heads up new sign-in from an "Android" DEVICE!!! WARNING IPHONE USERS! ANDROID DEVICE DETECTED!!!"

"I know you just Approved, but could you approve just 3 more times and then put in your user/pass anyway! , Cheers! :-)"

"Did you just sign in? or yeah I told yo to! NEvermind, I wasn't looking at your private personal emails or anything"

"Heads up I know your inbox has like 20 failed github runs, but have you seen the $10 you owe on your latest unpaid bill?"

DOT deleted. Reason, maybe I would be rolling in cash if it actually helped, instead of reading my fucking emails all the fucking time? how about that?  


---

## OpenDooT: the interactive satirical website

**Play:** https://qsolkcb.github.io/OpenDooT/

The original premise above inspired a ridiculous fictional assistant control centre with fake notifications, sign-in obsession, imagined billing commentary, recursive approvals, and nine-hour research that achieves precisely nothing.

### 🎮 DooT Escape — mini 2D platformer

You're a tiny purple character running from intrusive notification monsters. **Collect seven quiet tokens and reach the UNSUBSCRIBE door.** Side-scrolling level, platform jumping, moving hazards, checkpoints, three lives, elapsed-time timer, optional original synthesised sound effects, and a retry screen. A fully mathematical, opt-in looping soundtrack joins the chaos.

- **Desktop:** A/D or left/right arrows to move; W/up/space to jump; P/Escape to pause.
- **Touchscreens:** On-page movement, jump, and pause buttons.
- **Progress:** No server-side saves or tracking. Level progress is temporary and resets on reload.

### Respecting boundaries (the joke is on the software)

**This website does not access email, authentication, GPS, personal finances, or any other account.** Every alert and amount is fictional. It never makes background network requests, uses cookies, or stores data. Automatic simulated notifications are **off by default**, require explicit opt-in, and can be disabled at any time; the FIRE DOOT button turns them off. The game automatically pauses if the tab is hidden.

Static HTML, CSS, SVG and vanilla JavaScript. **No build chain, NPM, frameworks, backend, analytics, tracking pixels or external assets.** Apache-2.0 licence.

### Develop and deploy

Open `index.html` locally in a modern browser (no local server required).

Run the dependency-free Python smoke checks with `python3 tests/smoke.py`. JavaScript syntax checks can be run with `node --check site.js && node --check music.js && node --check game.js`, but Node is not required to run or develop the site.

GitHub Pages is configured with **Source: GitHub Actions**. On a push to `main`, `.github/workflows/pages.yml` validates the files and deploys a minimal static artifact. Pull requests perform validation only. No production deployment takes place until the change is merged.

This is an independent fictional parody, not affiliated with OpenAI or any assistant provider.


### 🎼 The Doot Song — mathematical robot speech synthesiser

The original nine-line score is derived **directly from the lyrics supplied by the project author**:

```text
Doot. Doot. Doot. Doot.
Doot. Doot. Doot. Email.
Doot. Doot. Doot. Doot.
Doot. Doot. Doot. Doot.
Email. Doot. Doot. Doot.
Doot. Doot. Doot.
Doot. Doot.
Doot.
Weee. Weee.  Weee. Weee.. Doooooooot.
```

This is not a recording or a text-to-speech API call. `music.js` generates an **original 142 BPM arcade tune** using only the Web Audio API and mathematics:

- Three resonant formants (F1/F2/F3) applied to mathematical oscillator waveforms produce robot-like `Doot`, two-part `Email`, rising `Weee`, and an elongated final `Doooooooot`.
- A seeded pseudo-random noise signal generates plosive consonants and hi-hats. Triangle oscillators generate the bassline. There are **no imported samples, audio files, audio fonts, speech APIs, CDNs, or network calls**.
- A bounded lookahead sequencer schedules the original phrase, then loops it. It cancels scheduled voices and the interval on pause, game over, or music off, and restarts at the beginning on resume.
- **Music defaults to off**, separate from sound effects. Click **♫ Doot Song off** to opt in, while the game is running or before starting. It plays only during active gameplay and stops automatically on pause, loss, victory, tab hiding, or browser blur.
- Missing Web Audio support disables the music button gracefully, without breaking the game.
- The music engine is lightweight and requires no NPM packages or cloud compute.

Verification: `node tests/music.test.cjs` checks the exact lyric lines, opt-in, scheduler start/stop, and unsupported Web Audio fallback. `node tests/game-input.test.cjs` continues checking keyboard focus and button activation. The static privacy checks also cover `music.js`.

The point of this soundtrack is to be aggressively silly without becoming the thing it parodies: an unwanted interruption.
