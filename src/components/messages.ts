/**
 * Micro-textes v2 non contractuels (design §2.4) : messages de Vobi et sous-titres.
 * Fonctions d'affichage pures, sans règle métier.
 */
import { dayUnit, plural } from '@/domain/format';
import type { GoalStatus } from '@/domain/streak';

/** Message de Vobi sur l'Accueil, par priorité décroissante (design §5.1). */
export function homeMessage(seen: number, goal: GoalStatus, streak: number): string {
  if (seen === 0) return 'Salut ! Prêt pour tes 10 premiers mots ?';
  if (goal.reached) return 'Objectif atteint ✅ Chaque carte en plus compte !';
  if (goal.done === 0 && streak > 0) return `🔥 ${streak} ${dayUnit(streak)} ! Une carte aujourd'hui et la flamme continue.`;
  return `Encore ${goal.remaining} ${plural(goal.remaining, 'carte')} et l'objectif du jour est dans la poche 💪`;
}

/** Sous-titre du résultat de session selon la part de « Je savais » (design §5.4). */
export function sessionResultSubtitle(known: number, total: number): string {
  return total > 0 && known / total >= 0.5
    ? "Excellent rythme, tes mots s'accrochent."
    : 'Bel effort ! Chaque carte te rapproche du but.';
}
