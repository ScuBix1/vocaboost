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

## Design v2

Source : `docs/03-design.md` v2 (validée par le client), maquettes `docs/design/maquettes.html`. Aucune nouvelle dépendance (`package.json` inchangé), aucune règle métier modifiée, aucune proposition hors spec (§9) implémentée. Rendu obtenu : `docs/design/rendu-app-v2.png` (captures Playwright 390×844 de l'export web).

**Tokens** (`theme/tokens.ts`) : palette Grape / Sun / Flame / Mint / Berry / Ink (§3.1), `categoryColors` (base, soft, ink, emoji des 10 catégories), `depth` (3 / 4 / 6), `motion`, typographie système 800-900 (`wordXL`, `score`, `wordL`, `overline`…), rayons v2. Les clés v1 (`text`, `textMuted`, `primaryPressed`, `warning*`…) sont conservées et pointent vers les valeurs v2.

**Composants**

| Composant | Fichier | Notes |
|---|---|---|
| Profondeur 3D | `components/Raised.tsx` | `Raised` (statique) et `PressableRaised` : lèvre pleine absolue décalée de `depth`, la face descend de `depth` à l'appui (60 ms) et remonte (120 ms) ; instantané si « Réduire les animations ». |
| Button | `Button.tsx` | Variantes `primary`, `sun`, `secondary`, `success`, `softDanger`, `danger` (+ désactivé) ; `tone="success"` reste accepté. Garde anti-double-tap 400 ms inchangée. |
| Card | `Card.tsx` | Tons `default`, `sun`, `success`, `primary` ; pressable : la face s'enfonce de 2 pt. |
| Flashcard | `Flashcard.tsx` | Chip catégorie colorée + badge niveau, recto `wordXL` + 🔊 56, verso traduction / exemple. Le 🔊 du recto reste hors de la zone tactile de la carte (positionné par `onLayout`), comme en v1. |
| ProgressBar / ProgressRing | `ProgressBar.tsx`, `ProgressRing.tsx` | Barre 10 / 16 avec reflet, minimum visible 6 %. Anneau sans SVG : deux demi-disques tournés dans deux fenêtres `overflow: hidden` (`ringAngles`), plein et `successBright` à ≥ 100 %. |
| Objectif | `GoalCard.tsx` | `GoalRing` (« x / objectif », `testID="goal-value"`), compteur animé optionnel. |
| Série | `Streak.tsx` | `StreakChip` (éteinte à 0) et `WeekStrip` compacte (Accueil) / large (Progrès). |
| Vobi | `Vobi.tsx` | Grille 120 en `View`, 8 humeurs (`hello`, `correct`, `oops`, `streak`, `win`, `retry`, `empty`, `search`), mise à l'échelle par `scale`, rebond d'entrée optionnel ; toujours décoratif. |
| Test | `OptionButton.tsx`, `FeedbackSheet.tsx` | Lettres A-D, pop / secousse ; bandeau bas vert ou rouge avec Vobi et bouton `success` / `danger`. |
| Célébrations | `Confetti.tsx`, `CountUp.tsx` | 24 confettis `Animated` (10 immobiles si « Réduire les animations »), fondu sur les 300 dernières ms ; compteurs 0 → valeur en 600 ms. |
| Autres | `StatTile`, `CategoryCard`, `Badge`, `Chip`, `SegmentedControl`, `IconButton`, `EmptyState` (Vobi), `Notice` (toast pill), `messages.ts` (micro-textes v2) | |

**Données** : les pastilles de la semaine viennent d'une nouvelle fonction pure `getWeekDays(activeDays, todayKey)` dans `domain/streak.ts` (semaine ISO locale lundi → dimanche, jours actifs RG-45/48, aujourd'hui, futur), exposée par le sélecteur `useWeekDays`. C'est le seul ajout dans `src/domain/` (tests : `domain/__tests__/weekDays.test.ts`).

**Écrans** : tous refondus selon §5 (Accueil avec hero Grape et bulle de Vobi, session avec compteur « n/N », résultat de session avec confettis si ≥ 50 %, Progrès avec hero et cartes de catégorie, test avec bandeau de feedback, résultat du test avec Vobi `win` / `retry`, onglets avec pastille active). Mécanismes conservés : verrou `useActionGuard` (BUG-01/02), gardes par carte / question, confirmation d'abandon, `testID`, libellés et annonces d'accessibilité. Libellés contractuels inchangés (« Session terminée » devient « Session terminée ! », §8.4).

**Tests** : 17 suites, 174 tests (150 → 174, aucun supprimé). Adaptés sans affaiblir la vérification : « Session terminée ! », bulle « Salut ! Prêt pour tes 10 premiers mots ? », compteur de test « i/N » (contenu exact + libellé « Question i sur N »), scores animés attendus avec `waitFor` sur la valeur exacte. Nouveaux : `components/__tests__/v2-components.test.tsx` (Vobi, anneau, bouton 3D, série, feedback, confettis, micro-textes) et `weekDays.test.ts`.

**Écarts restants vs maquettes**
- Police système au lieu de Nunito (décision client) : textes un peu plus larges (« ✗ Je ne savais pas » : corrigé, voir « Corrections recette v2 »).
- Cartes de catégorie : le « {pct} % » est placé à droite de la barre (et non sur la ligne du nom) pour éviter qu'un nom long (« Nourriture », « personnalité ») soit coupé en plein mot avec la police système.
- (Corrigé, voir « Corrections recette v2 ».) Le rendu web montrait une erreur d'hydratation React (#418) au chargement direct de `/test-run` (rendu statique = redirection, client = test) ; React refait le rendu côté client, sans effet visible. Ce comportement vient du tirage du test au montage (inchangé), pas de la v2 ; hors périmètre mobile.
- Non implémenté (optionnel en §6) : reflet qui traverse la barre après « Je savais », pop 🎯 de l'anneau, vibration (permission Android, cf. limites v1).

## Corrections recette v2

Source : `docs/05-rapport-qa.md` §8. Aucune règle métier modifiée, aucune dépendance ajoutée, aucun test supprimé.

| Point | Correction | Fichiers |
|---|---|---|
| **V2-01 (majeur)** double tap « Suivant » | `next()` pose le verrou `useActionGuard` (300 ms) ; `choose()` l'ignore tant qu'il est actif. Les options sont non interactives pendant le verrou **sans changement d'apparence** (un grisé de 300 ms clignoterait à chaque question). Le `test.failing` QA est devenu un test normal. | `app/test-run.tsx`, `components/OptionButton.tsx` (prop `locked`) |
| V2-01, symétrie | Session « Je savais » → carte suivante : déjà protégé (verrou + « Retourner » désactivé). **Nouveau cas trouvé sur le web** : double clic sur le dernier « Je savais » → le 2e clic actionnait « Accueil » du résultat (résultat sauté) ; idem « Voir le résultat » → « Retour à l'accueil ». `useArrivalGuard` : les boutons des deux écrans de résultat ignorent les taps des 300 premières ms (sans effet visuel). « Nouvelle session » → session : aucun défaut (carte non retournée). | `hooks/useActionGuard.ts`, `app/session-result.tsx`, `app/test-result.tsx` |
| V2-02 confettis | Le calque n'est plus en fond d'écran : il remplit la zone de Vobi (pleine largeur) et laisse libre une colonne centrale (Vobi + 24). Animés ou immobiles (« Réduire les animations », 10 confettis conservés), ils restent de part et d'autre de Vobi et ne croisent jamais titre, score ni sous-titre. Les 24 valeurs animées sont toujours allouées (le réglage peut changer après montage). | `components/Confetti.tsx`, écrans de résultat |
| « Réduire les animations » (obs. §8.4) | Dernière valeur mise en cache au niveau du module : un écran monté ensuite démarre avec le bon réglage. | `hooks/useReduceMotion.ts` |
| V2-03 « ✗ Je ne savais pas » | Libellé contractuel conservé. Largeur des deux boutons selon leur libellé (`flexGrow 1, flexShrink 1, flexBasis auto`) : une ligne à 390 et 360 pt (largeurs mesurées 141/205 et 126/190 px). Sous ~340 pt, retour possible sur 2 lignes (inchangé). | `app/session.tsx` |
| V2-04 contraste | Tuiles du hero Progrès : `onPrimaryTile` blanc 10 % (au lieu de 16 %) → texte blanc ≈ 4,9:1. | `theme/tokens.ts`, design §5.5 |
| V2-05 ponctuation | Espace insécable U+00A0 avant « ! ? : ; » dans **tous** les textes (affichés, libellés d'accessibilité, annonces, titres d'alerte), et avant 🎯 dans « Objectif du jour atteint ». Garde-fou systématique : `__tests__/typographie.test.ts` analyse (compilateur TypeScript) chaque chaîne, gabarit et texte JSX de `src/` hors tests. Attentes de tests mises à jour en conséquence. | 18 fichiers source |
| V2-06 | Aucun mot à revoir : « Continue tes sessions pour garder ce niveau. » au lieu de « Ces mots reviendront… ». | `app/test-result.tsx`, design §5.8 |
| Accessibilité web | `aria-hidden` sur Vobi et sur le calque de confettis (react-native-web ignore `accessibilityElementsHidden`). | `components/Vobi.tsx`, `components/Confetti.tsx` |
| V2-07 / RT-03 (#418 web) | Cause : le HTML statique contient un tirage fait au build (store vide, `Math.random`) ; le client tirait au 1er rendu une autre session / un test (store déjà réhydraté). `useClientReady` : session et test affichent un écran neutre tant que le store n'est pas réhydraté et, sur le web, jusqu'au 1er rendu client ; le tirage se fait ensuite. Mobile : le tirage ne part plus d'un store encore vide. Vérifié : 0 erreur d'hydratation au chargement direct et au rechargement de `/session` et `/test-run`. | `hooks/useClientReady.ts`, `app/session.tsx`, `app/test-run.tsx` |

**Tests** : `qa-design-v2` (V2-01 en test normal), nouveaux `corrections-v2.test.tsx` (verrou d'arrivée, V2-06, géométrie des confettis, `aria-hidden`) et `typographie.test.ts`. Les parcours de test qui répondent juste après « Suivant » attendent désormais la fin du verrou (`waitGuard`), comme en session.

**Vérification web** (export statique, Chromium/Playwright, 390×844 et 360×740, avec et sans `prefers-reduced-motion`) : double clic au centre de « Suivant » → 0 réponse à l'aveugle sur 10 (390×844, 360×740, 360×640, 320×568) ; double clic sur le dernier « Je savais » → reste sur le résultat ; « Je ne savais pas » sur une ligne ; confettis autour de Vobi uniquement ; aucune erreur console. Rendu régénéré : `docs/design/rendu-app-v2.png`.

---

# v1.1 — Mots du jour

Source : `docs/02-spec-pm.md` §10 à §15, `docs/03-design.md` « v1.1 », `docs/design/maquettes-revision.html`. **Aucune migration** (`STORAGE_VERSION = 1`, `PersistedData` et `sanitizePersistedData` inchangés), **aucune dépendance**, aucune règle existante modifiée, aucun test supprimé ni affaibli (aucun test existant n'a dû être modifié).

## Décisions de code
- **Lecture seule par construction** : `domain/dailyWords.ts` est pur (date et RNG injectables) ; la passe vit dans `store/useReviewStore.ts`, un store zustand **sans `persist`** (comme `useResultsStore`) qui n'importe ni n'appelle jamais `useLearnerStore.evaluateCard` / `completeTest`. Les écrans de révision ne font que **lire** `progress`.
- **Instantané figé** (RG-102) : au démarrage, `startDaily` copie la liste de mots et la progression (immuable) ; la passe, « Refaire tous les mots » (même instantané, nouvel ordre ; y compris après une passe « difficiles », point 2 du design §v1.1.13) et la passe « difficiles » travaillent dessus. La liste, elle, est recalculée au focus (`useNow` + `useTodayWords`, clé = date locale → vide à minuit).
- **Définition RG-100** : `seenCount ≥ 1` et `toLocalDateKey(lastSeenAt) === toLocalDateKey(now)` ; `lastSeenAt` invalide, `null` ou id inconnu ignorés. Statut dérivé de `box` (0 = « À revoir »).
- **Hydratation web** : `useClientReady` sur la liste, la passe et la carte Accueil / entrée Apprendre (compte à 0 tant que le store n'est pas prêt), comme `session.tsx`. Résultat : 0 erreur d'hydratation sur `/review`, `/review-run`, `/review-result` (chargement direct).
- **Fin de passe** : `review-result` garde en `useRef` la passe terminée affichée, pour que « Refaire … » (qui remplace le store avant le démontage) ne redirige pas vers la liste. La dernière carte déclenche un seul `router.replace` (effet sur `finished` + verrou `useActionGuard`).
- Garde-fous : `useArrivalGuard` sur liste, vide, fin, boutons de navigation ; `useActionGuard` sur « Retourner » / « Retenu » / « À revoir encore » / « Réviser ces mots » / « Refaire … » (silencieux, pas de grisé).
- Réduire les animations : slide de carte remplacé par un fondu (comme la session) ; Flashcard et Vobi gèrent déjà le réglage ; aucune animation propre aux écrans de liste et de fin.
- Libellés avec U+00A0 avant `! ? : ;`, y compris `accessibilityLabel` (`typographie.test.ts` vert).

## Traçabilité US → fichiers
| US / RG | Implémentation | Tests |
|---|---|---|
| US-11 (RG-100 → 107, AC-11.1 → 11.8) | `domain/dailyWords.ts` (`getTodayWords`, `isDailyWord`, `sortDailyWords`, `dailyStatus`), `hooks/useLearnerSelectors.ts` (`useTodayWords`), `app/review.tsx`, `components/DailyWordRow.tsx`, `components/InfoNote.tsx`, `components/Badge.tsx` (`review`), `components/messages.ts` | `domain/__tests__/dailyWords.test.ts`, `__tests__/review-flows.test.tsx`, `components/__tests__/review-components.test.tsx` |
| US-12 (RG-110 → 115, AC-12.1 → 12.8) | `domain/dailyWords.ts` (`buildReviewQueue`, `startReviewPass`, `answerReviewCard`), `store/useReviewStore.ts`, `app/review-run.tsx`, `app/review-result.tsx`, `app/_layout.tsx` (routes) | idem |
| US-13 (RG-114, AC-13.1 → 13.3) | `hardWords`, `useReviewStore.startHard`, `app/review-result.tsx` | idem |
| US-14 (RG-120 → 122, AC-14.1 → 14.5) | architecture ci-dessus ; aucune écriture `useLearnerStore` | `review-flows.test.tsx` : état persisté sérialisé identique avant/après 3 passes, 0 appel `AsyncStorage.setItem`, tirage de session et sélection du test identiques (même graine), `STORAGE_VERSION === 1`, store sans `persist` |
| US-15 (RG-130 → 134, AC-15.1 → 15.4) | `app/(tabs)/index.tsx` (carte + « Revoir »), `app/(tabs)/learn.tsx` (entrée), `app/session-result.tsx` + `components/Button.tsx` (variante `link`), état vide dans `app/review.tsx` | `review-flows.test.tsx` |
| US-16 (RG-116, AC-16.1) | `services/speech.ts` réutilisé ; `SpeakButton` exporté de `components/Flashcard.tsx` ; arrêt au changement de carte, à « Quitter » et au démontage | `review-flows.test.tsx` |

## Vérifications
- `npx tsc --noEmit` : 0 erreur. `npx jest` : 23 suites, 241 tests verts (191 → 241 : +18 domaine, +26 parcours/intégrité, +6 composants ; aucun supprimé).
- `npx expo export --platform web` OK ; Playwright (Chromium) à 390×844 et 360×740, état pilote injecté dans `localStorage` (`vocaboost-store`) : Accueil avec carte, liste, recto, verso, fin de passe (4 / 7 retenus), état vide, Accueil sans carte ; aucune erreur console hors l'avertissement `useNativeDriver` déjà présent en v2. Rendu : `docs/design/rendu-revision.png` (ligne 1 : 390×844, ligne 2 : 360×740).

## Écarts restants vs maquettes
- Le fondu au-dessus de « Réviser ces mots » est un aplat translucide de 16 pt (pas de dégradé : aucune dépendance) ; léger bord visible sur les lignes qui défilent dessous.
- À 360×740, la fin de passe avec 3 mots à revoir fait défiler la carte « À revoir encore » sous les boutons fixés (contenu défilant, comportement prévu au design pour N grand).
- La barre de progression d'une passe n'a le minimum visible de 6 % qu'à partir de 50 cartes (à N petit elle part vide, comme en session).
- Non vérifié sur appareil réel (iOS / Android, TTS) : seulement Jest (expo-speech simulé) et Chromium.
