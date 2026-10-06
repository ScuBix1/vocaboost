# Implémentation — VocaBoost v1

> Rédigé selon `.claude/agents/developer.md`. Entrées : `01-brief-client.md`, `02-spec-pm.md`, `03-design.md`. Destinataire : QA.

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
- `npx jest` : 12 suites, 111 tests verts (après les corrections post-QA : 15 suites, 145 tests).
- `npx expo export --platform web` : bundle et 15 routes statiques exportés (dossier `dist/` supprimé ensuite).

## Limites connues

- **Lint** non exécuté : ESLint n'est pas installé et ne peut pas l'être (réseau npm restreint).
- **Pool vide (RG-22)** : avec la banque actuelle, ce cas est impossible, car chaque catégorie contient les 4 niveaux et un groupe de filtres ne peut pas être vide. L'état vide est quand même implémenté (Session, Apprendre).
- **Vibration** au tap d'évaluation non implémentée, car elle est optionnelle et demande une permission Android.
- **Web** non optimisé (hors périmètre) : la carte s'anime avec `rotateY` ; `accessibilityLanguage` n'a d'effet que sur iOS.
- **Validation sur appareil** : Android / iOS en mode avion, redémarrage forcé et lecteur d'écran restent à faire par le QA. Les tests automatisés simulent le redémarrage par une réhydratation depuis AsyncStorage.

## Corrections post-QA

Source : `docs/05-rapport-qa.md`. Les 4 tests `test.failing` des fichiers `qa-*` sont devenus des `test` normaux et passent. Aucun test n'a été supprimé.

| Bug | Correction | Fichiers | Tests |
|---|---|---|---|
| BUG-01 (majeur) — double tap sur « Retourner » | Retournement et évaluation non réentrants. Un verrou commun à l'écran (`useActionGuard`, 300 ms, aligné sur l'animation) est posé au retournement. Pendant ce verrou, « Je savais » / « Je ne savais pas » sont désactivés et tout tap est ignoré (vérification synchrone sur `Date.now()`). Le garde par index de carte est conservé. | `hooks/useActionGuard.ts`, `app/session.tsx` | `qa-flows` BUG-01 ; `flows.test.tsx` (boutons désactivés puis actifs) |
| BUG-02 — double tap sur « Je savais » | Le même verrou est posé après chaque évaluation : un 2e tap ne retourne pas la carte suivante. | `app/session.tsx` | `qa-flows` BUG-02 |
| BUG-03 — lecture en échec qui efface les données | Aucune écriture tant qu'une lecture n'a pas réussi (`persistenceEnabled`). La lecture est retentée jusqu'à 3 fois. Si elle échoue encore, l'app démarre vierge en mémoire **sans rien écrire** ; le disque reste intact pour le lancement suivant. Un JSON corrompu (lecture réussie, contenu illisible) est toujours remplacé par un état vierge (RG-93). | `store/useLearnerStore.ts` | `qa-store` BUG-03 ; `useLearnerStore.test.ts` (échecs répétés) |
| BUG-04 — retour après abandon du test | L'abandon ferme les écrans empilés et ouvre l'onglet Test, quel que soit le point d'entrée. | `app/test-run.tsx` | `qa-flows` BUG-04 |
| BUG-05 — bandeau de réinitialisation invisible | Le bandeau « Progression réinitialisée » est rendu hors du `ScrollView`, en haut de l'écran. | `app/settings.tsx` | `qa-flows` (bandeau) |
| OBS-01 — décision PM | La semaine ISO est fixée au démarrage du test (`startedAt`) et réutilisée à la fin, pour le `weekId` et la règle « 1 test par semaine ». La date de fin et le jour actif restent ceux de la fin. La note a été ajoutée sous RG-60 dans `02-spec-pm.md`. | `domain/weeklyTest.ts`, `domain/learnerState.ts`, `store/useLearnerStore.ts`, `app/test-run.tsx` | `learnerState.test.ts` (OBS-01) |

**Banque de mots** (la répartition 200 / 10 × 20 / 50-60-50-40 est inchangée, tests d'intégrité verts) :
- `journey → trajet` a été remplacé par `sightseeing → tourisme` (B1, Voyage), pour lever l'ambiguïté avec `trip → voyage`.
- `friendly → sympathique` a été remplacé par `polite → poli` (A2, Émotions), pour lever l'ambiguïté avec `kind → gentil`.
- `storm` se traduit désormais par « tempête » au lieu de « orage ».
- Deux exemples ont été rendus plus naturels : « Broccoli is my favourite vegetable. » et « She passed her maths exam easily. » (ce dernier supprime le mélange *grade* / *mark*).
- Je n'ai pas touché aux mots transparents de niveau A1 (`train`, `hotel`…) ni à l'orthographe britannique : ce sont des choix assumés.

**Tests** :
- Avec `renderRouter`, les faux timers de Jest sont actifs. Les parcours qui enchaînent volontairement « Retourner » puis une évaluation avancent donc l'horloge de 320 ms entre deux taps (`waitGuard`).
- Pour cette raison, 3 tests QA existants ont été adaptés sans changer ce qu'ils vérifient : « double tap sur Je savais », « Nouvelle session » et BUG-02, dont le 1er « Je savais » est délibéré.

**Limite restante** : le verrou n'est pas posé à l'ouverture de la session. Un double tap sur « Commencer une session » peut donc encore retourner la 1re carte. Ce cas est sans effet sur les données, car l'évaluation reste verrouillée 300 ms après le retournement.


## Dépendances : avertissements npm et vulnérabilités

`jest-expo@57` embarque encore Jest 29 (glob 7, inflight, jsdom 20…), d'où de nombreux paquets
`deprecated` à l'installation. Le bloc `overrides` de `package.json` aligne toute la chaîne de test sur
Jest 30 (`babel-jest`, `jest-environment-jsdom`, `jest-watch-typeahead`…), force `test-exclude@8`
(glob 13) et `jsdom@27`, et passe `uuid` à 11.1.1 sous `xcode` (correctif de sécurité).
`test-renderer` est épinglé en `~1.2.0` (react-reconciler 0.33, compatible React 19.2) pour supprimer
le conflit de peer dependency de `@testing-library/react-native`.
Résultat : `npm install` sans aucun avertissement, 66 → 48 vulnérabilités signalées.

Les vulnérabilités restantes viennent de 4 paquets transitifs **sans version corrigée publiée**
(ou incompatibles) : `braces` (Metro), `node-forge` (@expo/cli, signature de code), `sprintf-js`
(outillage de couverture), `decode-uri-component` (expo-router ; la version corrigée est ESM-only).
Toutes concernent l'outillage de build/dev ou des entrées non contrôlées par l'utilisateur, pas le
bundle de l'app. **Ne pas lancer `npm audit fix --force`** : il propose de rétrograder vers Expo 44 /
React Native 0.72, ce qui casserait le projet. Elles disparaîtront en suivant les mises à jour d'Expo
(SDK 58+).
