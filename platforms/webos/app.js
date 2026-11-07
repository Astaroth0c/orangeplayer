// ORANGE Player — LG webOS Magic Remote integration
(function() {
  'use strict';

  // webOS Magic Remote key codes
  const WEBOS_KEYS = {
    13: 'Enter',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    33: 'PageUp',     // CH_UP
    34: 'PageDown',   // CH_DOWN
    412: 'ArrowLeft',     // REWIND
    417: 'ArrowRight',    // FAST FORWARD
    415: 'Space',     // PLAY
    19: 'Space',      // PAUSE
    413: 'Escape',    // STOP
    461: 'Escape',    // BACK
    10109: 'Escape',  // EXIT
  };

  document.addEventListener('keydown', (e) => {
    if (WEBOS_KEYS[e.keyCode]) {
      e.key = WEBOS_KEYS[e.keyCode];
    }
  });
})();
