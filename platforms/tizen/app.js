// ORANGE Player — Tizen TV integration
// Maps Samsung TV remote control keys to keyboard events the web app understands.

(function() {
  'use strict';

  // Tizen TV key codes (from Samsung Tizen Web API)
  const TV_KEYS = {
    13: 'Enter',
    10009: 'Escape',      // RETURN
    415: 'Space',         // PLAY
    19: 'Space',          // PAUSE
    413: 'Escape',        // STOP
    412: 'ArrowLeft',     // REWIND
    417: 'ArrowRight',    // FAST FORWARD
    10252: 'Space',       // PLAY_PAUSE
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    10109: 'Escape',      // EXIT
  };

  document.addEventListener('keydown', (e) => {
    if (TV_KEYS[e.keyCode]) {
      // Translate to standard key event the web app handles
      e.key = TV_KEYS[e.keyCode];
    }
  });

  // Register keys with Tizen
  if (typeof tizen !== 'undefined') {
    try {
      tizen.tvinputdevice.registerKey('MediaPlay');
      tizen.tvinputdevice.registerKey('MediaPause');
      tizen.tvinputdevice.registerKey('MediaStop');
      tizen.tvinputdevice.registerKey('MediaRewind');
      tizen.tvinputdevice.registerKey('MediaFastForward');
      tizen.tvinputdevice.registerKey('Return');
      tizen.tvinputdevice.registerKey('Exit');
    } catch (err) {
      console.warn('[Tizen] key registration failed:', err);
    }
  }
})();
