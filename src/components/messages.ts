/**
 * Micro-textes v2 non contractuels (design §2.4) : messages de Vobi et sous-titres.
 * Fonctions d'affichage pures, sans règle métier.
 */
import { dayUnit, plural } from '@/domain/format';
import type { GoalStatus } from '@/domain/streak';

/** Message de Vobi sur l'Accueil, par priorité décroissante (design §5.1). */
export function homeMessage(seen: number, goal: GoalStatus, streak: number): string {
  if (seen === 0) return 'Salut ! Prêt pour tes 10 premiers mots ?';
  if (goal.reached) return 'Objectif atteint ✅ Chaque carte en plus compte !';
  if (goal.done === 0 && streak > 0) return `🔥 ${streak} ${dayUnit(streak)} ! Une carte aujourd'hui et la flamme continue.`;
  return `Encore ${goal.remaining} ${plural(goal.remaining, 'carte')} et l'objectif du jour est dans la poche 💪`;
}

/** Sous-titre du résultat de session selon la part de « Je savais » (design §5.4). */
export function sessionResultSubtitle(known: number, total: number): string {
  return total > 0 && known / total >= 0.5
    ? "Excellent rythme, tes mots s'accrochent."
    : 'Bel effort ! Chaque carte te rapproche du but.';
}

/** Message unique « réviser n'a pas d'effet » (design v1.1 §v1.1.7). */
export const REVIEW_NOTE = "Réviser est un bonus\u00A0: ça ne change ni ton objectif, ni ta série, ni ton rythme de révision.";
export const REVIEW_NOTE_HARD = 'Les mots à revoir encore sont juste signalés ici.';

/** « 1 mot étudié aujourd'hui » / « 12 mots étudiés aujourd'hui » (RG-105). */
export function dailyCountLabel(n: number): string {
  return n === 1 ? "1 mot étudié aujourd'hui" : `${n} mots étudiés aujourd'hui`;
}
