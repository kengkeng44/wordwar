/**
 * Browser-native text-to-speech via the Web Speech API.
 * v1.7.11 — used in listening mode to speak each cloze sentence.
 *
 * Why this works for free:
 *   - speechSynthesis is built into every modern browser
 *   - iOS Safari uses Siri voices, Android uses Google voices,
 *     Chrome/Edge desktop use OS voices
 *   - No API key, no backend, no rate limit
 *
 * Caveats:
 *   - Voice quality varies by device. Most are acceptable for A2 vocab.
 *   - iOS sometimes needs a user-gesture-triggered call before allowing
 *     subsequent speak()s — we trigger from button taps so it works.
 *   - We strip cloze blanks like "___" before speaking (the user fills
 *     them with their ears, not by hearing "underscore underscore").
 */

export function speak(text: string, lang = 'en-US'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel(); // stop any prior utterance
    // v1.7.14: do NOT speak "[blank]" or underscores. Caller is now
    // responsible for filling the cloze gap with the correct word
    // (or whatever it wants the listener to hear). We just say what
    // we're given, cleaned of any leftover underscores.
    const cleaned = text.replace(/_{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    const u = new SpeechSynthesisUtterance(cleaned);
    u.lang = lang;
    u.rate = 0.92;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore — failure here shouldn't break the game
  }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}
