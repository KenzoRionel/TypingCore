# TODO: Fix Replay Text Not Displaying

## Problem Analysis
- Log shows `[RENDER] Index: X, Input: ""` - inputState is always empty
- Root cause: `keystrokesForReplay` in `js/game/game-logic.js` doesn't include `inputState` field
- The `typing-replay.js` expects `keystrokes[idx]?.inputState` but it's undefined

## Files to Fix

### 1. js/game/game-logic.js
- [x] Add `inputState` field to `keystrokesForReplay` mapping
- [x] Get `inputState` from `gameState.keystrokeDetails`

### 2. js/default-mode-script.js  
- [x] Fix `keystrokeDetails` to properly track and include `inputState`

## Progress
- [x] Analyzed the problem
- [x] Fix js/game/game-logic.js
- [x] Fix js/default-mode-script.js

## Summary of Changes

### js/game/game-logic.js
Added `inputState: keystroke.inputState || ''` to the keystrokesForReplay mapping so that replay data includes the full input state at each keystroke.

### js/default-mode-script.js
1. Changed keystrokeLog from simple timestamp array to objects with `timestamp` and `inputState`
2. Calculate full input state before logging each keystroke (including completed words + current input)
3. Updated calculateAndDisplayFinalResults to use the new keystrokeLog format with proper inputState

---

# TODO: Fix WPM, Accuracy, and Time Not Working in Replay

## Problem Analysis
- WPM, akurasi, dan waktu tidak berjalan saat replay
- Root cause: Data `wpm`, `accuracy`, dan `timeElapsed` tidak tersimpan di setiap keystroke di `keystrokesForReplay`
- Fungsi `updateLiveStats()` di `typing-replay.js` mencoba membaca data yang tidak ada

## Files to Fix

### 1. js/game/game-logic.js
- [x] Add `wpm`, `accuracy`, and `timeElapsed` fields to `keystrokesForReplay` mapping
- [x] Calculate real-time WPM and accuracy during keystroke logging
- [x] Calculate countdown time: `TIMED_TEST_DURATION - elapsedSeconds`

### 2. js/history/typing-replay.js
- [x] Update `updateLiveStats()` to properly read and display the stored data
- [x] Ensure time displays as countdown (mundur) from total duration

## Progress
- [x] Analyzed the problem
- [x] Fix js/game/game-logic.js - Add WPM, accuracy, time data to keystrokes
- [x] Fix js/history/typing-replay.js - Update stats display



## Expected Behavior
- Saat replay berjalan, WPM dan akurasi akan update real-time sesuai kondisi saat mengetik
- Waktu akan berjalan mundur (countdown) dari waktu total tes (misal: 60s → 0s)

## Additional Fix - Smooth Timer
- **Problem**: Waktu terlihat patah-patah karena hanya diupdate saat ada keystroke
- **Solution**: Menambahkan `startContinuousTimer()` yang berjalan independen setiap 100ms
- Timer countdown sekarang berjalan mulus seperti timer real, tidak bergantung pada timing keystroke
