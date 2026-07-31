---
'ePDS': patch
---

Sign-in, recovery and handle-choice feedback is now announced automatically by screen readers.

**Affects:** End users

**End users:** authentication errors now use standard alert and live-region semantics across sign-in, recovery, handle selection, and the demo client, so screen-reader users hear failures without having to search the page for changed text. Repeated failures — such as entering a second incorrect one-time code — announce each time rather than falling silent, and handle availability ("Available!" / "Already taken.") is now announced as you type.
