# Typing Replay Fix - TODO List

## Problem
Only the beginning text runs and changes when replay types, while other texts are only displayed without being updated during replay.

## Root Cause
In game-logic.js, keystrokeDetails stores inputState which is DOM.hiddenInput.value - this only contains the CURRENT WORD being typed, not all accumulated text.

## Solution Plan

### 1. Fix game-logic.js
- Modify keystrokeDetails storage to include FULL accumulated text (all completed words + current word)
- This ensures each keystroke records complete typing state up to that point

### 2. Fix typing-replay.js  
- Update renderReplayText() function to properly use full inputState from keystrokeDetails
- Ensure display updates correctly for all words during replay

## Implementation Steps:

- [ ] Edit js/game/game-logic.js - update keystrokeDetails storage in initGameListeners()
- [ ] Edit js/history/typing-replay.js - update renderReplayText() function logic
