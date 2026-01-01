---
active: true
iteration: 2
max_iterations: 100
completion_promise: "DONE-DONE"
started_at: "2026-01-01T18:32:00Z"
---

Please make sure that http://localhost:3000/apps/tabletop-simulator is playable, so @docs/TABLETOP_SIMULATOR_SPEC.md fully implemented. Should be 100% unit and e2e testing coverage.
Boot & Join: Open the app, create a new room. Copy the URL. Open an Incognito window and join the same URL.

Basic Sync: On the main window, drag a deck of cards. Verify it moves instantly in the Incognito window.

Physics Check: Pick up a die and throw it. Verify it tumbles and lands flat. Verify the result is logged in the chat window on both screens.

Hand Interaction: Draw a card to your hand shelf. Verify it flips face up for you. Verify the Incognito window sees it move to your zone but stays face down.

UI Check: Open the settings menu. Verify it overlays correctly. Close it.

Also apart from that, open the app in playwright mcp and play if for yourself. When it is all done, and all bug fixed, and you didn't even menage to improve the code in this iteration, print <promise>DONE-DONE</promise>.

Make it cpu efficient, should run great on normal laptops, tablets, phones.
