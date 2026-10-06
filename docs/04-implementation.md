# Implémentation — VocaBoost v1

> Rédigé selon `agents/developer/SKILL.md`. Entrées : `01-brief-client.md`, `02-spec-pm.md`, `03-design.md`. Destinataire : QA.

## Architecture

```
src/
  app/                 Routes expo-router (design §1.1)
    _layout.tsx          Stack racine + écran neutre tant que le store n'est pas réhydraté
    (tabs)/_layout.tsx   Onglets Accueil | Apprendre | Progrès | Test (pastille test dispo)
    (tabs)/index|learn|progress|test.tsx
    session.tsx, session-result.tsx, test-run.tsx, test-result.tsx, settings.tsx
  data/words.ts        Banque de 200 mots (id = mot anglais en minuscules, espaces → tirets)
  domain/              Logique PURE (aucun import React, dates et RNG injectés)
    types.ts             Types, catégories, niveaux, objectifs
    dates.ts             Date locale YYYY-MM-DD, semaine ISO locale, libellés
    random.ts            RNG déterministe (mulberry32), shuffle, tirages uniforme / pondéré
    leitner.ts           Boîtes, poids, maîtrise, évaluation
    session.ts           Composition de session
    filters.ts           Pool filtré, bascule avec verrou, résumés
    stats.ts             Vus / maîtrisés / % global et par catégorie
    streak.ts            Jours actifs, série, meilleure série, objectif du jour
    weeklyTest.ts        Statut, sélection, QCM + distracteurs, score, effet sur boîtes
    learnerState.ts      Transitions de l'état persisté + lecture défensive (sanitize)
  store/useLearnerStore.ts  zustand + persist + AsyncStorage (clé `vocaboost-store`, version 1)
  store/useResultsStore.ts  Résultats éphémères (récap session / test), non persistés
  components/          Button, Card, Flashcard, ProgressBar, StatTile, Chip, OptionButton,
                       EmptyState, Badge, SegmentedControl, GoalCard, Notice, Screen
  hooks/               useNow (focus + AppState), useReduceMotion, sélecteurs dérivés
  services/            speech.ts (expo-speech, échec silencieux), confirm.ts (Alert / web)
  theme/tokens.ts      Couleurs, espacements, rayons, typo, ombres (design §2)
```

Les écrans ne contiennent aucune règle métier : ils lisent le store et appellent des fonctions du domaine.

## Traçabilité US → fichiers

| US | Fichiers principaux | Tests |
|---|---|---|
| US-01 Session en 1 tap | `app/(tabs)/index.tsx`, `app/session.tsx`, `domain/session.ts` | `session.test.ts`, `flows.test.tsx` (AC-01.1) |
| US-02 Tirage pondéré | `domain/session.ts`, `domain/random.ts`, `domain/leitner.ts` | `session.test.ts` (AC-02.1→2.5) |
| US-03 Carte + auto-évaluation | `components/Flashcard.tsx`, `app/session.tsx`, `app/session-result.tsx`, `domain/leitner.ts` | `leitner.test.ts`, `components.test.tsx`, `flows.test.tsx` (AC-03.3/6/7/8) |
| US-04 Progression | `app/(tabs)/progress.tsx`, `domain/stats.ts` | `stats.test.ts` (AC-04.2→4.5) |
| US-05 Série + objectif | `domain/streak.ts`, `domain/learnerState.ts`, `components/GoalCard.tsx`, `app/settings.tsx` | `streak.test.ts`, `learnerState.test.ts` (AC-05.1→5.6) |
| US-06 Filtres (P1) | `domain/filters.ts`, `app/settings.tsx`, `app/(tabs)/learn.tsx` | `filters.test.ts`, `session.test.ts` (AC-06.1), store (AC-06.3) |
| US-07 Test hebdo | `domain/weeklyTest.ts`, `app/(tabs)/test.tsx`, `app/test-run.tsx`, `app/test-result.tsx` | `weeklyTest.test.ts` (AC-07.1→7.11), `flows.test.tsx` |
| US-08 Historique | `app/(tabs)/test.tsx`, `domain/weeklyTest.ts` (`sortHistory`), `domain/dates.ts` | `weeklyTest.test.ts`, `dates.test.ts`, store (AC-08.3) |
| US-09 TTS (P2) | `services/speech.ts`, `components/Flashcard.tsx` | `components.test.tsx` (AC-09.1) |
| US-10 Persistance / reset | `store/useLearnerStore.ts`, `domain/learnerState.ts`, `app/settings.tsx` | `useLearnerStore.test.ts`, `learnerState.test.ts` (AC-10.1→10.4) |
| RG-01→06 Banque | `data/words.ts` | `words.test.ts` |

## Décisions techniques

- **Pureté et injection** : toutes les fonctions du domaine reçoivent `now: Date` et `rng: () => number`. Seuls le store (`new Date()` par défaut) et les écrans (`Math.random`) fournissent les valeurs réelles.
- **Semaine ISO en heure locale** : calcul fait sur la date calendaire locale reportée en UTC (pas d'effet DST). `lastSeenAt` reste un horodatage ISO ; sa semaine est évaluée en heure locale.
- **Persistance** : seul l'état de l'apprenant est persisté (`partialize`) ; la banque vient du code. Lecture validée champ par champ (`sanitizePersistedData`) dans `merge` et `migrate` ; un JSON illisible ou un AsyncStorage indisponible (y compris le rendu statique web) donne un état vierge, sans crash.
- **Hydratation** : `hasHydrated` (non persisté) passe à `true` en succès comme en échec ; avant, un écran neutre recouvre la navigation.
- **Meilleure série** stockée et mise à jour à chaque jour actif (max de l'historique), conservée jusqu'à la réinitialisation.
- **Test** : questions tirées au montage de `test-run` et gardées en mémoire de composant ; l'abandon ou la fermeture n'écrit rien. Un second test la même semaine est refusé par le domaine (`applyTestCompletion`).
- **Anti-double-tap** : garde de 400 ms dans `Button`, plus des gardes par carte / question dans les écrans.
- **Confirmations** : `Alert.alert` natif ; repli `window.confirm` sur le web, où `Alert` est sans effet.
- **Tests** : la config Jest est dans `package.json` (alias `@/`, mocks AsyncStorage et expo-speech dans `jest.setup.js`). `tsconfig.json` déclare `types: ["jest"]`, car TypeScript 6 n'inclut plus les `@types` par défaut.

## Vérifications

- `npx tsc --noEmit` : OK, 0 erreur.
- `npx jest` : 12 suites, 111 tests verts.
- `npx expo export --platform web` : bundle et 15 routes statiques exportés (dossier `dist/` supprimé ensuite).

## Limites connues

- **Lint** non exécuté : ESLint n'est pas installé et ne peut pas l'être (réseau npm restreint).
- **Pool vide (RG-22)** : avec la banque actuelle, ce cas est impossible, car chaque catégorie contient les 4 niveaux et un groupe de filtres ne peut pas être vide. L'état vide est quand même implémenté (Session, Apprendre).
- **Vibration** au tap d'évaluation non implémentée, car elle est optionnelle et demande une permission Android.
- **Web** non optimisé (hors périmètre) : la carte s'anime avec `rotateY` ; `accessibilityLanguage` n'a d'effet que sur iOS.
- **Validation sur appareil** : Android / iOS en mode avion, redémarrage forcé et lecteur d'écran restent à faire par le QA. Les tests automatisés simulent le redémarrage par une réhydratation depuis AsyncStorage.
