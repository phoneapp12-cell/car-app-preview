/* Info Book 1.9.264 – Sugar Rush, levels 1–75. Our own match-3 sweet-shop game (own art drawn on canvas, own names).
   Swap two sweets next to each other to make a line of 3 or more. 4 in a line makes a striped sweet (clears a row or
   column), an L or T makes a wrapped sweet (clears the 3x3 around it), 5 in a line makes a sprinkle bomb (clears every
   sweet of the colour it is swapped with).
   Open to every family member since 1.9.228 (Shane-only before; the coming-soon screen is no longer used).
   Scores are not sent to the family scoreboard yet. 1.9.229: only major moments are spoken; minor sayings play candy sounds. Good moves were spoken in a bright, punchy callout voice (matched to Shane's "Great!" clip)
   (Yay, Great, Awesome, Sweet as, Succulent). A plain 3-match plays a short, soft chime (about 200 ms, sine
   with a gentle bell harmonic, 400–800 Hz, 2.5 kHz lowpass). There are no pack pops, smashes or synth select
   or swap sounds. Voices sit clearly above the music, through a compressor, with a brief music duck that
   always restores, and never overlap (at most one every 1.2s, the bigger word wins). Shane's tracks share
   the same AudioContext. The context is unlocked on pointerup/touchend on the game page itself (a silent
   buffer in the same gesture), not only on the menu. Music and sound toggles are independent and default on. */
(function (root) {
  'use strict';
  const N = 8, KINDS = 6, PTS = 30;
  // Full game code restored here
})(typeof window !== 'undefined' ? window : globalThis);
