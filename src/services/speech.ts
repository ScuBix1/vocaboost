/**
 * Prononciation TTS (RG-80 → RG-82, US-09).
 * Toute erreur est avalée : aucun crash, aucun message bloquant.
 */
import * as Speech from 'expo-speech';

export const SPEECH_OPTIONS = { language: 'en-US', rate: 0.9 } as const;

/** Arrête la lecture en cours (changement de carte, RG-81). */
export function stopSpeaking(): void {
  try {
    Speech.stop().catch(() => undefined);
  } catch {
    // Échec silencieux (RG-82).
  }
}

/** Interrompt toute lecture puis lit `text` en anglais (RG-80, RG-81). */
export function speakEnglish(text: string): void {
  try {
    stopSpeaking();
    Speech.speak(text, { ...SPEECH_OPTIONS, onError: () => undefined });
  } catch {
    // Voix indisponible : échec silencieux (RG-82).
  }
}
