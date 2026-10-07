# Rapport QA — VocaBoost v1

> Rédigé selon `.claude/agents/qa.md`. Entrées : `02-spec-pm.md` (les critères d'acceptation font référence), `03-design.md`, `04-implementation.md` et le code de `src/`. Destinataires : Développeur, Chef de Projet, Designer, Client.
> Date : 06/10/2026. Build testé : arbre de travail courant, non commité.

---

## 1. Résumé

| Élément | Résultat |
|---|---|
| Suite Jest | **15 suites, 142 tests verts**, dont 31 tests QA ajoutés. 4 d'entre eux sont marqués `test.failing` : ils reproduisent les bugs BUG-01 à BUG-04 et passeront au rouge une fois chaque bug corrigé (il faudra alors retirer `.failing`). |
| `tsc --noEmit` | OK, 0 erreur (tests QA compris). |
| Lint | Non exécuté : ESLint n'est pas installé (limite déjà signalée par le Développeur). |
| Fuseaux horaires | Les tests de dates, de série et du test hebdomadaire passent sous `UTC`, `Europe/Paris`, `Pacific/Auckland`, `America/Santiago`, `America/Sao_Paulo` (changement d'heure à minuit), `Pacific/Kiritimati` (UTC+14) et `America/St_Johns` (décalage d'une demi-heure). |
| Web (export statique + Chromium/Playwright, 375×667) | Parcours principaux passés **sans aucune erreur console**. **Aucune requête réseau externe**. La persistance survit au rechargement de la page. Les dossiers `dist/` et temporaires ont été supprimés. |
| Appareil Android / iOS, mode avion, arrêt forcé | **Non testable ici** (pas d'émulateur). Reste à faire avant la validation client (DoD §8.1 et §8.5). |

**Bilan** : la logique métier est solide. La semaine ISO a été comparée à une implémentation de référence sur chaque jour de 1995 à 2045. Les autres points vérifiés sont la série aux frontières de jour et les changements d'heure, toutes les combinaisons nouveaux/révisions de la session, les distracteurs sur les 200 mots, la migration et la lecture défensive des données. **Aucun bug critique.**

Il y a **1 bug majeur**, au niveau de l'interface : un double tap sur « Retourner » évalue la carte à l'aveugle. Les autres bugs sont **mineurs** : 4 bugs, 1 observation et des retours d'usabilité.

---

## 2. Matrice critères d'acceptation → statut

Légende : **OK** = vérifié (test Jest existant ou QA, et/ou parcours web) · **KO** = non conforme · **Non testable ici** = exige un appareil réel.

| AC | Statut | Preuve / remarque |
|---|---|---|
| AC-01.1 Session en 1 tap | OK | `flows.test.tsx` ; web : recto affiché directement. |
| AC-01.2 10 cartes distinctes | OK | `session.test.ts`, `qa-domain` : toutes les combinaisons de 0 à 13 nouveaux × 0 à 13 révisions. |
| AC-01.3 Pool k < 10 / pool vide | OK (k < 10) / non atteignable (k = 0) | Web : filtre Voyage + A1 → « Carte 1 / 5 ». Avec la banque actuelle, un pool vide est impossible ; l'état vide est codé mais n'est pas atteignable par l'interface. |
| AC-01.4 Mode avion | Non testable ici | Web : 0 requête externe ; données embarquées. |
| AC-02.1 → 02.3 Proportions | OK | Tests existants + combinaisons exhaustives (`qa-domain`). |
| AC-02.4 Pondération ≈ 97 % | OK | `session.test.ts`. |
| AC-02.5 Ordre mélangé | OK | `session.test.ts`. |
| AC-03.1 / 03.2 Recto / verso | OK | `components.test.tsx` ; captures web conformes. |
| AC-03.3 Boutons après retournement | OK, avec réserve **BUG-01** | Les boutons sont bien absents avant le retournement, mais un double tap les déclenche aussitôt. |
| AC-03.4 / 03.5 Boîtes | OK | `leitner.test.ts`. |
| AC-03.6 Pas de retour | OK | Retour Android = « Quitter » ; geste iOS désactivé (code). |
| AC-03.7 Quitter après 4 cartes | OK | `flows.test.tsx` ; `qa-flows` : quitter sans évaluer ne change rien. |
| AC-03.8 Récap | OK | Jest + web (« 5 / 10 », « Objectif du jour atteint 🎯 »). |
| AC-04.1 → 04.5 Progression | OK | `stats.test.ts` ; web (onglet Progrès, 10 catégories). |
| AC-05.1 → 05.3 Série | OK | `streak.test.ts` ; `qa-domain` : série de 400 jours à travers les changements d'heure, et cartes à 23:59:59 puis 00:00:00. |
| AC-05.4 Test = jour actif | OK | `learnerState.test.ts`. |
| AC-05.5 Meilleure série | OK | `streak.test.ts`. |
| AC-05.6 Objectif 10/20/30, remise à 0, 15/10, test non compté | OK | Jest ; web. |
| AC-06.1 Voyage + A1 | OK | Jest + web. |
| AC-06.2 Dernier élément verrouillé | OK | Jest + web (aide « Garde au moins un élément sélectionné. »). |
| AC-06.3 Persistance des filtres | OK | Store + rechargement web. |
| AC-06.4 Filtres sans effet sur test et stats | OK | `weeklyTest.test.ts`, `stats.test.ts`. |
| AC-06.5 Indicateur sur l'accueil | OK | Web : « Filtres : Voyage, A1 ». |
| AC-07.1 9 vus → verrouillé, 10 → 10 questions | OK | Jest ; web (« Question 1 / 10 »). |
| AC-07.2 50 vus → 20 sans doublon | OK | Jest + `qa-domain` (de 10 à 200 vus). |
| AC-07.3 / 07.4 Mots de la semaine | OK | Jest ; `qa-domain` : frontière lundi 00:00 locale. |
| AC-07.5 Alternance EN→FR / FR→EN | OK | Jest ; web (11 questions alternées). |
| AC-07.6 4 options, distracteurs de la même catégorie | OK | `qa-domain` : 200 mots × 20 graines, libellés FR et EN distincts sans tenir compte de la casse. |
| AC-07.7 Pas de « passer », feedback | OK | Jest ; web (vert ✓ / rouge ✗, « Suivant »). |
| AC-07.8 Score / seuil | OK | `weeklyTest.test.ts`. |
| AC-07.9 Effet sur les boîtes, mots ratés | OK | Jest ; web (« Mots à revoir (9) »). |
| AC-07.10 Un test par semaine, de nouveau dispo le lundi | OK | Jest ; web (accès direct à `/test-run` après un test terminé → redirection vers `/test`). Voir l'observation **OBS-01**. |
| AC-07.11 Abandon | OK | `qa-flows` (« Continuer le test », puis « Abandonner ») ; web via `window.confirm`. Voir **BUG-04** (écran de retour). |
| AC-08.1 → 08.4 Historique | OK | Jest ; web (« Semaine 41 – 2026 · 06/10/2026 · 2/10 · 20 % · À retravailler »). |
| AC-09.1 Boutons 🔊 | OK | `components.test.tsx`. |
| AC-09.2 / 09.3 Pas de superposition, pas de crash | Non testable ici (audio) | Le code appelle `stop()` avant `speak()` et à chaque changement de carte ; les erreurs sont avalées. |
| AC-10.1 Persistance après arrêt de l'app | OK (simulé) / non testable ici (arrêt forcé réel) | Réhydratation Jest + rechargement de la page web. |
| AC-10.2 / 10.3 Réinitialiser / annuler | OK | `qa-flows` (Alert natif) ; web (confirm). Voir **BUG-05** (bandeau invisible). |
| AC-10.4 Données corrompues | OK | Jest existant + `qa-store` (versions 0 et 2, `null`, `42`, `[]`). Voir **BUG-03** (erreur de lecture). |
| AC-10.5 Aucune requête réseau | OK (web) | 0 requête hors origine pendant tout le parcours. |

---

## 3. Bugs

### BUG-01 — Un double tap sur « Retourner » évalue la carte sans que l'utilisateur ait vu le verso — **majeur**

- **Fichiers** : `src/app/session.tsx:176-199` (la zone d'actions remplace « Retourner », en pleine largeur, par les deux boutons d'évaluation au même endroit) et `src/components/Button.tsx:25-49` (la garde anti-double-tap de 400 ms est propre à chaque instance de bouton, donc inopérante quand le bouton change).
- **Reproduction** (web, reproduite avec Playwright) :
  1. Accueil → « Commencer une session ».
  2. Faire un double tap sur la moitié droite du bouton « Retourner ».
- **Attendu** : la carte est retournée, un seul effet est pris en compte et l'utilisateur choisit ensuite « Je savais » ou « Je ne savais pas » (design §5.4 « Double tap rapide… Une seule action prise en compte » ; RG-32).
- **Obtenu** : le 2e tap tombe sur « ✓ Je savais », qui vient d'apparaître. La carte est évaluée « connue » à l'aveugle, son compteur est incrémenté et l'écran passe à la carte suivante. Sur la moitié gauche, la carte est marquée « Je ne savais pas » et renvoyée en boîte 0.
- **Impact** : fausse l'auto-évaluation, donc les boîtes, le nombre de maîtrisés et l'objectif du jour. C'est très probable sur mobile avec un geste rapide.
- **Test** : `src/__tests__/qa-flows.test.tsx`, « BUG-01 » (`test.failing`).
- **Piste de correction** : ignorer les taps d'évaluation pendant environ 300 à 400 ms après le retournement, au niveau de l'écran. On peut aussi décaler la disposition des boutons, ou les désactiver tant que l'animation de retournement n'est pas terminée.

### BUG-02 — Un double tap sur « Je savais » retourne immédiatement la carte suivante — **mineur**

- **Fichiers** : `src/app/session.tsx:176-199` (même cause que BUG-01).
- **Reproduction** : retourner une carte, puis faire un double tap sur « ✓ Je savais ».
- **Attendu** : une seule action ; la carte suivante s'affiche côté recto.
- **Obtenu** : le 2e tap tombe sur « Retourner » de la carte suivante. Sa traduction est révélée avant que l'utilisateur ait cherché, ce qui biaise l'exercice. Reproduit sur le web : les boutons d'évaluation sont visibles d'emblée sur la carte suivante. Le même effet existe avec « Commencer une session » ou « Nouvelle session » suivis de la 1re carte (le 2e tap la retourne).
- **Test** : `qa-flows.test.tsx`, « BUG-02 » (`test.failing`).

### BUG-03 — Une erreur transitoire de lecture d'AsyncStorage efface définitivement la progression — **mineur** (rare, mais conséquence lourde)

- **Fichiers** : `src/store/useLearnerStore.ts:212-217` (`getItem` renvoie `null` en cas d'exception) et `:310-313` (`setState({ hasHydrated: true })` déclenche l'écriture de l'état vierge).
- **Reproduction** (Jest) : des données valides sont stockées, `AsyncStorage.getItem` est rejeté une fois, puis on réhydrate.
- **Attendu** : l'app démarre sans crash (RG-93) **sans** détruire les données présentes sur le disque. Une simple erreur de lecture n'est pas une donnée corrompue.
- **Obtenu** : l'état vierge est réécrit sous `vocaboost-store` ; la meilleure série passe de 7 à 0 et tout l'historique est perdu.
- **Test** : `src/store/__tests__/qa-store.test.ts`, « BUG-03 » (`test.failing`).
- **Piste de correction** : distinguer « aucune donnée » (`null`) et « erreur de lecture ». En cas d'erreur, ne pas persister, ou réessayer la lecture.

### BUG-04 — L'abandon d'un test lancé depuis l'Accueil ramène à l'Accueil, pas à l'onglet Test — **mineur**

- **Fichiers** : `src/app/test-run.tsx:30-33` (`router.back()`) ; point d'entrée `src/app/(tabs)/index.tsx:106`.
- **Reproduction** : Accueil (≥ 10 mots vus) → « Passer le test » → « Quitter » → « Abandonner ».
- **Attendu** : retour à l'onglet Test (design §1.2 et §4.7 : « retour onglet Test, test toujours disponible »).
- **Obtenu** : retour à l'Accueil. Le test reste disponible : aucune perte de données.
- **Test** : `qa-flows.test.tsx`, « BUG-04 » (`test.failing`).

### BUG-05 — Le bandeau « Progression réinitialisée » s'affiche hors de l'écran — **mineur**

- **Fichiers** : `src/app/settings.tsx:456` (`Notice` placé en tête du contenu défilant, alors que le bouton « Réinitialiser ma progression » est en bas).
- **Reproduction** (web, 375×667) : Réglages → descendre jusqu'à « Réinitialiser ma progression » → confirmer.
- **Attendu** : bandeau de succès visible 3 s « en haut de l'écran » (design §4.9).
- **Obtenu** : le bandeau est rendu à y = −357 px, hors de la zone visible. L'utilisateur n'a aucun retour visible après une action irréversible ; il peut douter que la réinitialisation ait eu lieu.
- **Piste de correction** : placer le `Notice` hors du `ScrollView` (en superposition ou fixé en haut), ou remonter le défilement en haut après la réinitialisation.

### OBS-01 — Un test commencé le dimanche soir et terminé après minuit compte pour la nouvelle semaine — **mineur / à arbitrer par le PM**

- **Fichiers** : `src/app/test-run.tsx:23-27` (tirage avec la date de début) et `:93` → `src/domain/learnerState.ts:75-78` (enregistrement avec la date de fin).
- **Reproduction** (Jest, `qa-domain` « [observation] ») : test disponible le dimanche à 23:58, terminé le lundi à 00:01.
- **Obtenu** : l'entrée est enregistrée en `2026-W42`, ce qui bloque le test de la nouvelle semaine, alors que ses questions portaient sur les mots étudiés en W41. La semaine W41 n'a pas d'entrée.
- C'est conforme à la lettre de RG-60 (test « terminé » dans la semaine), mais c'est surprenant pour l'utilisateur. **Décision PM** : faut-il rattacher le test à la semaine de son début ?

---

## 4. Retours d'usabilité et qualité linguistique

**Banque de mots** : j'ai relu les 200 entrées. La qualité est bonne : traductions justes, exemples naturels et courts, niveaux cohérents. Points à corriger ou arbitrer :

- **Ambiguïtés dans les QCM** :
  - Catégorie Voyage : `trip → voyage` et `journey → trajet`. À la question FR→EN « voyage », l'option *journey* est défendable.
  - `kind → gentil` et `friendly → sympathique` : *friendly* se traduit aussi couramment par « gentil ».
  - Suggestion : préciser certaines traductions, par exemple « voyage (excursion) », ou éviter ces paires comme distracteurs.
- **Traduction approximative** : `storm → orage`. *Orage* correspond plutôt à *thunderstorm* ; *storm* se traduit par « tempête ».
- **Questions triviales au test** : mots identiques ou quasi identiques (`train/train`, `promotion/promotion`, `hotel/hôtel`, `passport/passeport`). Acceptable au niveau A1, mais ces questions ne mesurent rien.
- **Exemple peu naturel** : « Carrot is my favourite vegetable. » → plutôt « Carrots are my favourite vegetable. »
- **Variété d'anglais** : la banque est en anglais britannique (*favourite*, *neighbour*, *fortnight*, *maths*, *a good mark*) alors que la synthèse vocale utilise `en-US`. Par ailleurs, `grade` (américain) côtoie *mark* (britannique) dans un exemple. À harmoniser, ou à assumer.

**Interface** :

- Le double tap reste le principal risque d'usage (BUG-01 et BUG-02). Il est d'autant plus probable que « Retourner », « Je savais » et la carte suivante se succèdent au même endroit de l'écran.
- Sur le web (hors périmètre), les libellés de la barre d'onglets sont légèrement rognés en bas. Rien à corriger pour la v1 mobile.
- Les textes et libellés sont conformes au récapitulatif du design §5.5. Les pluriels sont corrects (« 1 mot », « Encore 1 carte », « 0 jour »). Aucune faute relevée.

---

## 5. Tests QA ajoutés

| Fichier | Contenu |
|---|---|
| `src/domain/__tests__/qa-domain.test.ts` | Semaine ISO comparée à une référence indépendante (1995 → 2045, 00:00 / 12:00 / 23:59:59 locales) ; frontières lundi 00:00 et changement d'année ; `addDaysToKey` sur 20 ans ; série de 400 jours ; cartes à 23:59:59 / 00:00 ; composition de session exhaustive ; filtre restrictif ; générateur aléatoire aux bornes ; distracteurs sur les 200 mots ; N = min(20, vus) de 10 à 200 ; identifiants obsolètes ; OBS-01 ; lecture défensive champ par champ. |
| `src/store/__tests__/qa-store.test.ts` | Migration v0 et v2 ; JSON non objet ; réinitialisation puis redémarrage ; **BUG-03** (`failing`). |
| `src/__tests__/qa-flows.test.tsx` | Abandon du test (continuer / abandonner) ; accès direct à `/test-run` après un test terminé ; double tap sur une option et sur « Voir le résultat » ; double tap sur le même bouton « Je savais » ; quitter sans évaluer ; « Nouvelle session » ; réinitialiser (annuler / confirmer, bandeau) ; écran de chargement avant hydratation ; **BUG-01, BUG-02, BUG-04** (`failing`). |

Une fois un bug corrigé, le test `failing` correspondant passe au rouge. Il faut alors retirer `.failing` pour qu'il protège contre une régression.

---

## 6. Verdict

**Non prêt en l'état, mais proche.** Aucun bug critique, et toutes les règles P0, P1 et P2 sont fonctionnellement en place. En revanche, **BUG-01 (majeur)** fausse l'auto-évaluation, qui est au cœur de la promesse produit. Il doit être corrigé et re-testé avant la livraison au client.

Conditions pour passer à « prêt » :

1. Corriger BUG-01, et idéalement BUG-02, qui a la même cause.
2. Exécuter le parcours DoD §8.4 sur un appareil Android **et** un appareil iOS en mode avion, avec un arrêt forcé (AC-01.4, AC-09.2/09.3, AC-10.1).
3. Faire arbitrer OBS-01 par le PM.

BUG-03, BUG-04, BUG-05 et les retours linguistiques peuvent suivre dans une version corrective sans bloquer la livraison.

---

## 7. Re-test post-corrections

Commit re-testé : `53c78eb`, « Corrections post-QA ». Re-test fait selon `.claude/agents/qa.md`, étape 7.

### 7.1 Exécution

| Élément | Résultat |
|---|---|
| Suite Jest | **15 suites, 150 tests verts.** Les 4 anciens `test.failing` (BUG-01 à BUG-04) sont devenus des tests normaux et passent. **1 nouveau `test.failing`** reproduit RT-01. |
| `tsc --noEmit` | OK. |
| Fuseaux horaires | Tests du domaine verts sous `Pacific/Auckland`, `America/Sao_Paulo` et `Pacific/Kiritimati`. |
| Web (export statique + Playwright, 375×667) | Parcours complet : session, test lancé depuis l'Accueil puis abandonné, test complet, réinitialisation, rechargement de la page. **0 requête externe.** Une erreur console est apparue (voir RT-03) ; elle est antérieure aux corrections. |
| Nouveaux tests QA | `qa-flows` : bloc « re-test » sur le verrou. `qa-domain` : OBS-01 selon la décision PM, avec le passage d'année. `qa-store` : risque résiduel de BUG-03. |

### 7.2 Statut des bugs

| Bug | Statut | Vérification |
|---|---|---|
| BUG-01 (majeur) double tap « Retourner » | **Corrigé** | Web : un double clic sur la moitié droite, puis sur la moitié gauche, ne fait plus aucune évaluation. « Je savais » et « Je ne savais pas » sont désactivés pendant 300 ms (`aria-disabled=true`), puis actifs. Test Jest vert. |
| BUG-02 double tap « Je savais » | **Corrigé** | Web : une seule évaluation, et la carte suivante reste côté recto. Le tap direct sur la carte pendant le verrou est aussi ignoré (nouveau test). |
| BUG-03 lecture en échec | **Corrigé**, avec un risque résiduel | Le disque reste intact après 3 lectures en échec. **Risque résiduel** : l'app tourne alors en mémoire et les évaluations de la session ne sont **pas** persistées, sans aucun signal. C'est un cas très rare et un compromis acceptable, mais à connaître. Couvert par un test `qa-store` qui décrit ce comportement. |
| BUG-04 retour après abandon | **Corrigé** | Web et Jest : un test lancé depuis l'Accueil puis abandonné ramène sur `/test`. Le test reste disponible et l'historique est vide. |
| BUG-05 bandeau invisible | **Corrigé** | Web : bandeau visible à y = 84 px même après défilement, et masqué au bout de 3 s. |
| OBS-01 semaine du test | **Appliqué** (décision PM) | Un test démarré le dimanche à 23:58 et terminé le lundi est enregistré en W41. Le test de W42 reste disponible le lundi, et un second test rattaché à W41 est refusé. Si le test démarre le 03/01/2027, il est enregistré en `2026-W53`. La date de fin et le jour actif sont ceux du lundi. |
| Banque de mots | **OK** | `journey`→`sightseeing`, `friendly`→`polite`, `storm → tempête`, et 2 exemples reformulés. Tests d'intégrité verts (200 mots, unicité, 10 × 20, 50/60/50/40). |

### 7.3 Le verrou de 300 ms gêne-t-il un usage rapide normal ?

**Non pour l'usage normal.** Un enchaînement retourner → évaluer → retourner à 350 ms d'intervalle se fait sans perdre aucun tap, dans Jest comme sur le web ; il est déjà plus rapide qu'une lecture réelle du verso. Deux effets de bord mineurs :

- **RT-01 (mineur), tap « avalé » deux fois** : `src/app/session.tsx:86-90` et `src/components/Button.tsx:45-49`.
  - Si l'utilisateur appuie sur « Retourner » pendant le verrou (moins de 300 ms après une évaluation), le tap est ignoré par l'écran. Il arme pourtant la garde de 400 ms propre au `Button`.
  - Un 2e tap légitime à +450 ms, alors que le verrou est expiré, est donc lui aussi ignoré. La carte ne se retourne qu'à partir d'environ 650 ms.
  - Reproduit sur le web, et dans `qa-flows` « RT-01 » (`test.failing`). Ressenti possible : « le bouton ne répond pas ».
  - Piste : désactiver « Retourner » pendant le verrou (`disabled={guard.locked}`), comme les boutons d'évaluation, ou ne pas armer la garde du Button quand l'action est refusée.
- **RT-02 (cosmétique)** : à chaque retournement, les deux boutons d'évaluation apparaissent en gris « désactivé » pendant 300 ms avant de prendre leurs couleurs. Ce flash est visible. Piste : garder les couleurs avec une opacité réduite, ou faire un fondu.
- **Limite connue (signalée par le Développeur)** : un double tap sur « Commencer une session » peut encore retourner la 1re carte. Je confirme que c'est sans effet sur les données.

### 7.4 Autres constats

- **RT-03 (mineur, web uniquement, hors périmètre, antérieur aux corrections)** : ouvrir ou recharger directement `/session` sur le web provoque l'erreur React #418 (écart d'hydratation). Le HTML statique contient une session tirée au moment du build, différente de celle tirée par le client. React se rétablit et la session reste utilisable. Ça n'a aucun impact sur mobile.
- **Ids retirés** (`journey`, `friendly`) : une progression déjà enregistrée pour ces ids devient orpheline. Elle est ignorée sans erreur (comptes et test non affectés, test `qa-domain`). C'est sans conséquence avant la 1re livraison, mais à éviter après : changer un id fait perdre la progression du mot.
- **Aucune régression** sur les parcours déjà validés : accueil, session, récap, progression, test, historique, réglages, filtres, persistance.

### 7.5 Verdict final

**Prêt** pour la validation client côté logiciel : aucun bug critique ni majeur ouvert. Restent ouverts des points **mineurs** non bloquants, à traiter dans une version corrective :

- RT-01 et RT-02 (verrou anti-double-tap) ;
- RT-03, web uniquement ;
- le risque résiduel de BUG-03.

**Réserve** : le passage sur un appareil Android **et** un appareil iOS (mode avion, arrêt forcé, lecteur d'écran, TTS ; DoD §8.1 et §8.5) reste **non testable dans cet environnement**. Il doit être fait avant la remise au client.

### RT-01 — corrigé
Le bouton « Retourner » est désactivé pendant le verrou (`src/app/session.tsx`), il n'arme donc plus la garde de 400 ms du `Button`. Le test RT-01 est passé de `test.failing` à `test` : 150/150 tests verts.

---

## 8. Recette design v2

Commit recetté : `778466e`, « Intègre la direction artistique v2 ». Références : `03-design.md` v2, `design/maquettes.html` et `apercu-ecrans.png` (cible), `design/rendu-app-v2.png`, `02-spec-pm.md` (règles inchangées) et la section « Design v2 » de `04-implementation.md`.

### 8.1 Exécution

| Élément | Résultat |
|---|---|
| Suite Jest | **18 suites, 182 tests verts**, soit les 174 tests du Développeur et 8 tests QA ajoutés dans `src/__tests__/qa-design-v2.test.tsx`. **1 `test.failing`** reproduit V2-01. |
| `tsc --noEmit` | OK. |
| Fuseaux horaires | Tests du domaine (dont `weekDays`) verts sous `Pacific/Auckland` et `America/Sao_Paulo`. |
| Web (export statique + Chromium/Playwright) | Parcours complets à **390×844** et **360×740**, plus des mesures à 375×667, 360×640 et 320×568, avec et sans `prefers-reduced-motion`. Parcours couverts : accueil vide, session (recto, verso, < 50 % et ≥ 50 %), test réussi et raté, test déjà fait, accès direct aux routes, filtres restrictifs (Voyage + A1, k = 5), dernier élément verrouillé, réinitialisation. **0 requête externe.** Les seules erreurs console sont celles de RT-03 (voir V2-07). `dist/` et les temporaires (Playwright, build v1 de comparaison) ont été supprimés. |
| Appareils réels | Toujours **non testable ici** : police système iOS/Android réelle, TalkBack/VoiceOver, « Réduire les animations » natif. |

### 8.2 Non-régression fonctionnelle (relecture adversariale du diff)

- **Règles métier** : `src/domain/` ne reçoit qu'un ajout pur, `getWeekDays` et `countActiveDaysThisWeek`, qui ne fait que de l'affichage. Le tirage, les boîtes, la série, le test et la persistance sont inchangés. Le store et les sélecteurs existants sont intacts ; seul `useWeekDays` est ajouté.
- **Verrous** : `useActionGuard`, `handledIndex`, `answeredIndex`, `finished` et la garde de 400 ms du `Button` sont conservés. Vérifié à nouveau sur le web :
  - BUG-01 : un double clic sur la moitié droite puis sur la moitié gauche de « Retourner » ne déclenche aucune évaluation ; le compteur reste à 1/10.
  - BUG-02 : un double clic sur « Je savais » donne une seule évaluation, et la carte 2 reste au recto.
  - RT-01 : la carte se retourne au 2e tap une fois le verrou expiré.
  - BUG-04 : l'accès direct à `/test-run` quand le test est déjà fait redirige vers `/test`.
  - BUG-05 : le toast « Progression réinitialisée » est visible en haut, hors du défilement.
  - Persistance : OK après rechargement.
- **Libellés contractuels** (§8.4 du design) : présents. Le compteur du test devient « i/N », lu « Question i sur N » ; le changement est autorisé par le design §5.7.
- **Nouveau défaut introduit par la refonte** : V2-01, ci-dessous.

### 8.3 Bugs

#### V2-01 — Sur petit écran, un double tap sur « Suivant » répond à l'aveugle à la question suivante du test — **majeur** (régression v2)

- **Fichiers** :
  - `src/app/test-run.tsx:173-184` : le `FeedbackSheet` n'est rendu qu'après une réponse et disparaît au tap sur « Suivant ». La zone de pied de 76 pt, réservée en permanence en v1, n'existe plus. Le `ScrollView` reprend donc la place, et les options C/D remontent sous le doigt.
  - `src/app/test-run.tsx:81-92` : `choose()` n'a aucun verrou après `next()`. Les gardes existantes (`answeredIndex`, la garde de 400 ms du `Button`) protègent la même question et le même bouton, pas la question suivante.
- **Reproduction** (web, Playwright) : 10 mots vus → Test → répondre à une question → double clic au centre de « Suivant ».
- **Attendu** : la question suivante s'affiche sans réponse (RG-66 : réponse délibérée et non modifiable ; design §5.4 : « une seule action prise en compte »).
- **Obtenu** : le 2e clic tombe sur l'option C ou D de la question suivante, qui est enregistrée.

  | Viewport | v2 | v1 (même scénario) |
  |---|---|---|
  | 320×568 | 5 questions répondues à l'aveugle sur 5 | 0 sur 9 |
  | 360×640 | 1 sur 9 (questions à libellé long) | 0 sur 9 |
  | 375×667 et 390×844 | 0 sur 9 | 0 sur 9 |

- **Impact** : une réponse fausse est enregistrée dans le test hebdomadaire, qui n'a **qu'un essai par semaine**. Elle compte dans le score et dans « Mots à revoir », et fait **redescendre le mot en boîte 0** (RG-69). C'est la même classe de défaut que BUG-01, déjà classé majeur. 360×640 est un format Android courant.
- **Test** : `qa-design-v2.test.tsx`, « V2-01 » (`test.failing`). Le test encode la correction par verrou ; si la correction passe par la mise en page, il faudra l'adapter.
- **Piste de correction** : poser le verrou `useActionGuard` (300 ms) dans `next()` et le vérifier dans `choose()`, comme `evaluate()` en session. On peut aussi réserver la hauteur du bandeau sous les options après « Suivant ».
- **Effet de bord de la même mise en page (mineur)** : à 360×640, le bandeau masque l'option C/D colorée en vert. La bonne réponse reste écrite dans le bandeau, mais le retour visuel « bonne réponse en vert » (RG-66) n'est visible qu'en faisant défiler.

#### V2-02 — « Réduire les animations » : 10 confettis fixes restent en permanence derrière les textes — **mineur**

- **Fichiers** : `src/components/Confetti.tsx:42` et `:93-95` (positions finales `fall × hauteur + 40`, sans fondu en mode réduit), `src/app/test-result.tsx:41`, `src/app/session-result.tsx:178`.
- **Reproduction** (web, `prefers-reduced-motion: reduce`) : réussir le test, ou finir une session avec ≥ 50 % de « Je savais ».
- **Attendu** : une célébration statique qui ne gêne pas la lecture (design §4.12 et §7).
- **Obtenu** : les confettis restent indéfiniment derrière « Semaine 41 – 2026 », derrière le score « 10 / 10 » (un rectangle Grape sous le « 0 ») et derrière le sous-titre « Excellent rythme… ». Contrastes calculés à ces endroits : `ink` sur `primary` **2,91:1** ; `inkMuted` sur `flame` **2,48:1**, sur `successBright` **3,12:1**, sur `#1C8CEB` **1,99:1**. Sans réduction, le même recouvrement existe mais ne dure qu'environ 1,5 s (2 à 5 confettis passent sur le titre entre 300 et 1 500 ms), ce qui est cosmétique.
- **Qualification de l'écart signalé par le Développeur** (« les confettis semblent recouvrir le titre ») : l'ordre de dessin est **correct**, puisque le calque est en `zIndex 0` et le contenu en `zIndex 1` (vérifié dans le DOM). Les confettis passent donc **derrière** le titre. Cependant, le texte n'a pas de fond, si bien qu'ils traversent visuellement les lettres. C'est acceptable en mode animé, mais pas avec « Réduire les animations ».
- **Piste de correction** : en mode réduit, placer les 10 confettis dans la bande au-dessus de Vobi ou sur les bords (x < 12 % ou x > 88 %), ou les fondre après 1,5 s.

#### V2-03 — « ✗ Je ne savais pas » passe sur 2 lignes, avec « pas » seul sur la 2e — **mineur** (écart signalé par le Développeur, confirmé)

- **Fichiers** : `src/app/session.tsx:216-224` et `src/components/Button.tsx:115` (`numberOfLines={2}`, 17 pt 900, padding horizontal 10 + bordure 2).
- **Mesure** (web) :
  - à 390 pt, le texte demande 157 px sur une seule ligne, pour 149 px disponibles ;
  - à 360 pt, il reste 134 px disponibles ; le passage à la ligne est quasi certain aussi avec Roboto Black sur Android ;
  - sur iPhone, avec SF Pro Heavy, le passage à la ligne à 390 pt est probable, mais à confirmer sur appareil.
- **Impact** : visuel uniquement. Les deux boutons gardent la même hauteur (60), et la cible ainsi que le libellé d'accessibilité sont intacts. C'est un écart avec la maquette, où le texte tient sur une ligne. Le libellé est contractuel et ne peut pas être raccourci.
- **Piste de correction** : boutons d'évaluation en `size="md"` (16 pt) avec `paddingHorizontal: 6`, ou `adjustsFontSizeToFit` avec `minimumFontScale: 0.85` et `numberOfLines={1}` sur ce seul bouton.

#### V2-04 — Texte blanc des mini-tuiles du hero Progrès sous le seuil AA — **mineur**

- **Fichiers** : `src/app/(tabs)/progress.tsx:151-154` et `src/theme/tokens.ts:50`.
- **Constat** : texte blanc sur `onPrimaryTile` (blanc à 16 % sur `primary`, soit `#835BF7`) = **4,37:1**, pour « Mots vus », « Mots maîtrisés » (12 pt) et « / 200 » (13 pt). Le minimum AA pour du texte normal est 4,5:1.
- **Piste de correction** : réduire l'opacité de la tuile à 0,10 (environ 4,9:1), ou utiliser `primaryLip` comme fond de tuile.

#### V2-05 — Ponctuation française : « ! » et « ? » isolés en début de ligne — **cosmétique**

- **Fichiers** : `src/app/(tabs)/index.tsx:87-91`, où l'espace avant « ! » est un `{' '}` ordinaire, et `src/app/test-run.tsx:143`.
- **Constat** : la tuile Objectif affiche « Plus que 10 cartes » puis « ! » seul sur la ligne suivante (390 et 360 pt). À 360 pt, la consigne affiche « …de ce mot » puis « ? » seul.
- **Piste de correction** : espace insécable ` ` (ou ` `) avant « ! », « ? » et « : », dans ces chaînes et dans `messages.ts`.

#### V2-06 — Résultat du test sans erreur : « Ces mots reviendront plus souvent… » — **cosmétique**

- **Fichier** : `src/app/test-result.tsx:101-103`.
- **Constat** : la phrase s'affiche sous « Mots à revoir (0) » / « Aucune erreur, bravo ! 🎉 » alors qu'il n'y a aucun mot.
- **Piste de correction** : masquer la phrase quand `missed.length === 0`. C'est conforme au design §5.8 point 6, qui suppose k > 0.

#### V2-07 — Erreur React #418 au chargement direct de `/test-run` sur le web — **mineur, web uniquement, antérieure à la v2** (écart signalé par le Développeur, qualifié)

- **Comparaison v1 / v2** : j'ai reconstruit la v1 (`HEAD~1`) pour comparer, avec le même scénario (10 mots vus, puis chargement direct). L'erreur #418 apparaît **à l'identique en v1 et en v2**, sur `/test-run` comme sur `/session`. Toutes les autres routes chargées directement (`/`, `/test`, `/progress`, `/settings`, `/test-result`, `/session-result`) se chargent sans erreur, avec redirection vers `/` pour les écrans de résultat.
- **Qualification** : même famille que RT-03 (tirage aléatoire au montage, rendu statique différent du client). Ce n'est pas une régression v2, et il n'y a aucun impact sur mobile. Il suffit d'étendre RT-03 à `/test-run`.

### 8.4 Accessibilité

| Point | Statut | Preuve |
|---|---|---|
| Vobi décoratif | OK (natif) | `accessible={false}` + `no-hide-descendants` + `accessibilityElementsHidden` (`Vobi.tsx`). Test QA : le Vobi du bandeau du test est absent de l'arbre accessible. Les messages de Vobi sont du vrai texte (bulle). **Web** : les emoji de Vobi (« ✦ 👋 ») apparaissent dans l'arbre d'accessibilité de Chromium, car react-native-web n'applique pas `accessibilityElementsHidden`. Hors périmètre mobile ; `aria-hidden` en plus réglerait le cas. |
| Confettis non annoncés | OK | Masqués aux lecteurs d'écran (test QA et test du Développeur), `pointerEvents="none"`. |
| Annonces v1 du test | OK | « Bonne réponse ! » et « La bonne réponse était : … » sont toujours annoncées, 10 annonces sur 10 (test QA). Score du résultat lu en entier : « Score : 7 sur 10, 70 pour cent, Réussi ». |
| « Réduire les animations » | OK, avec la réserve V2-02 | Web en mode réduit : 10 confettis immobiles ; retournement en fondu ; bandeau en fondu ; score final affiché directement (« 10 / 10 » dès 130 ms) ; pas de pop ni de secousse ; rebond de Vobi et des onglets coupé. **Observation** : `useReduceMotion` vaut `false` jusqu'à la résolution asynchrone de `isReduceMotionEnabled()`. Au tout premier rendu, `CountUp` affiche 0 et le rebond de Vobi démarre, pendant 1 à 2 images, avant de basculer. C'est imperceptible en pratique ; une mise en cache du réglage au niveau du module supprimerait ce flash. |
| Cibles ≥ 44 pt | OK, avec 1 réserve antérieure | Tous les boutons, chips, onglets, ⚙️, 🔊, options et « ✕ Quitter » (68 × 44) font au moins 44 pt. Liens texte : « Tout sélectionner » mesure 22 pt de haut + `hitSlop` 12, soit 46 pt. « Modifier » (Accueil) mesure 18 pt + 12, soit **42 pt**, comme en v1 : réserve antérieure, à passer à `hitSlop` 14. |
| Lecteur d'écran, carte « Test disponible » de l'Accueil | Observation, antérieure | La carte pressable (rôle bouton) contient le bouton « Passer le test ». Sur iOS, VoiceOver ne voit que la carte, qui mène à l'onglet Test, d'où l'on peut lancer le test. Même structure en v1 ; à valider sur appareil. |

### 8.5 Contrastes des couples texte/fond réellement utilisés (WCAG 2.1, calculés)

| Couple | Ratio | Couple | Ratio |
|---|---|---|---|
| `ink` / `bg` · `surface` | 15,77 · 17,02 | blanc / `primary` (boutons, hero) | 5,85 |
| `inkMuted` / `surface` · `bg` · `surfaceAlt` | 6,98 · 6,46 · 5,96 | blanc / `success` (« Je savais », « Suivant ») | 4,99 |
| `inkMuted` / `sunSoft` · `successSoft` | 6,37 · 6,29 | blanc / `danger` (« Suivant », « Réinitialiser ») | 4,59 |
| `danger` / blanc (« ✗ Je ne savais pas ») | 4,59 | `primary` / `primarySoft` (onglet actif) | 4,95 |
| `successInk` / `successSoft` (bandeau, badge) | 5,63 | `dangerInk` / `dangerSoft` | 6,78 |
| `sunInk` / `sunSoft` (test verrouillé) | 7,74 | `ink` / `sun` (bouton Sun) | 11,01 |
| `flameInk` / `flameSoft` · blanc (série) | 5,17 · 5,73 | `primaryInk` / `primarySoft` (badges) | 9,66 |
| `ink` de catégorie / `soft` (10 catégories) | 6,90 à 9,31 | blanc / `ink` (toast info) | 17,02 |
| **blanc / tuile du hero Progrès** | **4,37 (V2-04)** | `disabledText` / `disabledBg` | 4,34 (exempté : inactif) |
| `inkMuted` à 75 % (options après réponse) | 3,85 (exempté : inactif, conforme au design §4.10) | | |

**Éléments graphiques** :

- Les barres de catégorie (`base` sur blanc, 3,34 à 5,59) respectent le seuil de 3:1.
- Les pastilles de jours actifs (`flame` : 2,82 sur blanc, 2,41 sur `surfaceAlt`) et l'anneau atteint (`successBright` : 2,24) sont **sous 3:1**. L'information est doublée par du texte (« 1 jour de suite », « 10 / 10 ») et par le libellé d'accessibilité : acceptable, mais à noter pour le Designer.

### 8.6 Conformité visuelle aux maquettes

Conforme sur l'ensemble des écrans et des états :

- **Couleurs et formes** : tokens Grape, Sun, Flame, Mint et Berry ; boutons et cartes 3D (lèvre, enfoncement) ; hero Grape avec bulle.
- **Accueil** : anneau d'objectif (« 15/10 » plein), série éteinte à 0 (flamme grise, « Lance ta série aujourd'hui »), pastilles de la semaine, carte « Test de la semaine » dans ses trois états (verrouillé, disponible, terminé), filtres actifs dans le hero (« 🎛️ Filtres : Voyage, A1 · Modifier »).
- **Session** : chip de catégorie colorée, verso conforme, indices de Vobi.
- **Session et test, les deux résultats** : Vobi `correct`/`hello`/`win`/`retry`, compteurs animés.
- **Progrès** : hero et cartes de catégorie.
- **Test** : bandeau vert ou rouge, options A à D.
- **Réglages** : chips avec emoji, aide « Garde au moins un élément sélectionné. » sur le dernier niveau, toast.
- **États limites** : Progrès vide, historique vide et Apprendre avec k = 5 (« Ta session contiendra 5 cartes. »).

Écarts restants :

- V2-02, V2-03 et V2-05 ci-dessus.
- Police système au lieu de Nunito : décision client, rendu plus large ; à 360 pt, « OBJECTIF DU JOUR » passe sur 2 lignes.
- « % » des cartes de catégorie à droite de la barre : écart assumé par le Développeur, lisible et sans coupure de mot.
- Le pool vide (Apprendre et session) reste inatteignable avec la banque actuelle, comme en v1 ; le code est revu.

### 8.7 Verdict

**Non prêt en l'état, mais la correction est courte.** La refonte ne modifie aucune règle métier et ne rouvre aucun des bugs BUG-01 à BUG-05 ni RT-01. La qualité visuelle est au niveau des maquettes. En revanche, **V2-01 (majeur)** réintroduit, dans le test hebdomadaire et sur petit écran, le défaut « double tap = réponse à l'aveugle ». Sa conséquence est irréversible pour la semaine : un seul essai, et le mot repasse en boîte 0.

Conditions pour passer à « prêt » :

1. Corriger V2-01, retirer `.failing` du test correspondant, puis re-tester à 320×568 et 360×640.
2. Idéalement dans le même lot : V2-02 (« Réduire les animations ») et V2-03 (bouton sur 2 lignes).

V2-04 à V2-07 et les observations peuvent suivre dans une version corrective. La réserve « appareils réels » (§7.5) reste valable ; il faut y ajouter la vérification de V2-03 avec SF Pro et Roboto.

### 8.8 Re-test v2

Commit re-testé : `2edae16`, « Corrections recette design v2 (V2-01 à V2-07) ». Re-test fait selon `.claude/agents/qa.md`, étape 7.

**Exécution**

| Élément | Résultat |
|---|---|
| Suite Jest | **20 suites, 191 tests verts.** Aucun `test.failing` restant : le test V2-01 est devenu un test normal. |
| Tests modifiés par le Développeur | Relus : rien n'a été affaibli. Les ajouts de `waitGuard` modélisent une réponse délibérée après le verrou. Les autres changements sont les espaces insécables dans les chaînes attendues. |
| `tsc --noEmit` | OK. |
| Fuseaux horaires | Tests du domaine verts sous `Pacific/Auckland` et `America/Sao_Paulo`. |
| Web | Export statique + Chromium/Playwright à **390×844, 360×740 et 320×568, avec et sans `prefers-reduced-motion`** (6 combinaisons, parcours complet à chaque fois). **0 erreur console, 0 requête externe.** `dist/` et les temporaires ont été supprimés. |

**Statut des corrections** (résultat identique dans les 6 combinaisons, sauf mention)

| Point | Statut | Vérification |
|---|---|---|
| **V2-01 (majeur)** | **Corrigé** | Double clic au centre de « Suivant » à chaque question : **0 réponse à l'aveugle sur 15**, dans les 6 combinaisons (5 sur 5 à 320×568 avant correction). Les options gardent leur apparence pendant le verrou, donc sans clignotement. |
| Garde d'arrivée (nouveau) | **OK** | Un double clic sur le dernier « Je savais » ou sur « Voir le résultat » laisse l'écran de résultat affiché. Un tap normal sur « Accueil » environ 410 ms après l'arrivée fonctionne. |
| V2-02 confettis | **Corrigé** | Les confettis ne recouvrent **aucun** texte (titre, sous-titre, semaine, score, seuil) : 0 sur 24 en mode animé, 0 sur 10 en mode réduit, à chaque échantillon entre 0 et 2 s. Ils restent de part et d'autre de Vobi. Cosmétique : ceux du haut sont légèrement rognés par le bord supérieur de la zone de Vobi. |
| V2-03 « ✗ Je ne savais pas » | **Corrigé à 390 et 360 pt** | Une seule ligne : 205 / 141 px à 390 pt, 190 / 126 px à 360 pt. À 320 pt, voir RT2-01. |
| V2-04 contraste | **Corrigé** | Fond de tuile mesuré `rgba(255,255,255,0.1)`, soit un contraste blanc de **4,90:1**. |
| V2-05 ponctuation | **Corrigé** | « 10 cartes ! » et « en anglais ? » ne se coupent plus avant la ponctuation (vérifié à 320 et 360). Un garde-fou automatique existe : `typographie.test.ts`. |
| V2-06 | **Corrigé** | Test à 10/10 : « Continue tes sessions pour garder ce niveau. » ; avec des erreurs, le texte reste « Ces mots reviendront… ». |
| V2-07 / RT-03 (#418) | **Corrigé** | Chargement direct puis rechargement de `/session` et `/test-run` : 0 erreur d'hydratation. |
| Accessibilité web | **Corrigé** | Plus aucun emoji de Vobi dans l'arbre d'accessibilité de Chromium (`aria-hidden`). |
| « Réduire les animations » | **OK** | Le réglage est mis en cache au niveau du module ; les confettis immobiles, le fondu et le score final direct sont vérifiés en mode réduit. |

**Non-régression et usage rapide normal**

- **Verrous existants** : BUG-01 (double clic sur « Retourner », moitié droite et moitié gauche : compteur 1/10, aucune évaluation) et BUG-02 (une seule évaluation, carte suivante au recto) tiennent toujours, dans les 6 combinaisons.
- **Usage rapide de la session** : retourner puis évaluer toutes les 350 ms, sur 8 cartes : **0 tap perdu**.
- **Usage rapide du test** : 10 questions avec « Suivant » puis réponse à +320 ms : **aucune réponse perdue**.
- **Écran neutre avant tirage** :
  - navigation dans l'app (Accueil → session, « Nouvelle session », onglet Test → test) : **0 image neutre observée**, le contenu s'affiche en 53 à 101 ms ;
  - chargement direct d'URL sur le web : fond uni pendant environ 60 ms, puis contenu à environ 140 ms, sans aucun saut de contenu ;
  - le clignotement n'est donc **pas gênant**.

**Nouveaux constats** (aucun bloquant)

- **RT2-01 (cosmétique, 320 pt seulement)** : la largeur des boutons suit maintenant le libellé (`src/app/session.tsx`, `evalButton`). À 320 pt, « ✗ Je ne savais pas » (167 px) **et** « ✓ Je savais » (109 px) passent tous deux sur 2 lignes. Avant la correction, seul le premier passait sur 2 lignes. Les cibles restent à 60 pt de haut. C'est un format rare (iPhone SE de 1re génération, petits Android). Piste : revenir à `flex: 1` sous 340 pt.
- **RT2-02 (mineur, dans la lignée de RT-01)** : un tap ignoré par la garde d'arrivée arme quand même la garde de 400 ms du `Button` (`useArrivalGuard` est appelé dans `onPress`, après la garde du bouton). Exemple : double clic sur le dernier « Je savais », puis un tap délibéré sur « Accueil » environ 350 ms plus tard ; ce tap est ignoré. Reproduit sur le web : un tap à +100 ms puis un autre à +450 ms laissent l'écran sur le résultat, alors que des taps à +100 ms puis +600 ms fonctionnent. C'est rare, puisqu'il faut le double clic plus un tap immédiat, et sans effet sur les données. Piste : laisser la garde d'arrivée passer avant celle du bouton.
- **Cosmétique, 320 pt** : la 7e pastille de la semaine déborde de la tuile « Série » de l'Accueil, et l'onglet « Apprendre » est tronqué en « Appren… ».

**Verdict final : prêt.** Aucun bug critique ni majeur ouvert. V2-01 à V2-07 sont corrigés, sans régression fonctionnelle ni gêne pour un usage rapide normal. RT2-01, RT2-02 et les points cosmétiques à 320 pt peuvent suivre dans une version corrective.

**Réserve maintenue** (§7.5) : le passage sur appareil Android **et** iOS reste non testable ici (mode avion, arrêt forcé, VoiceOver/TalkBack, « Réduire les animations » natif, rendu de V2-03 avec SF Pro et Roboto). Il doit être fait avant la remise au client.

---

# Recette v1.1 — Mots du jour

Commit testé : `8fb7c76` (« Ajoute « Mots du jour »… »). Références : spec §10 à §15 (RG-100+, US-11 à US-16, D-01 à D-08), design « v1.1 », `docs/design/maquettes-revision.html`, `apercu-revision.png`, `rendu-revision.png`. Aucun code applicatif modifié ; un seul fichier ajouté : `src/__tests__/qa-review.test.tsx` (5 tests dont 1 `test.failing`).

## 1. Méthode

| Élément | Résultat |
|---|---|
| Jest | 24 suites, **246 tests verts** (241 + 5 QA, dont 1 `test.failing` pour V11-01). Idem sous `TZ=Pacific/Auckland`, `America/Sao_Paulo`, `Europe/Paris`. |
| `tsc --noEmit` | 0 erreur. |
| Lint | **Non testable** : `expo lint` ne trouve pas de config ESLint et tente d'installer des paquets (réseau refusé). `package.json` intact. |
| Web réel | `expo export --platform web` (sortie hors projet), Chromium/Playwright à **390×844, 360×740, 320×568** (+ 360×740 avec `prefers-reduced-motion`), état injecté dans `localStorage`, horloge pilotée par `page.clock`. 0 erreur console (hors l'avertissement `useNativeDriver` existant), 0 erreur d'hydratation, **0 requête réseau externe** (seuls `/`, favicon et les assets locaux). `dist/` et temporaires supprimés. |
| Code | Relecture adversariale de `dailyWords.ts`, `useReviewStore.ts`, `review.tsx`, `review-run.tsx`, `review-result.tsx`, des points d'entrée et de `Button`. |

## 2. Intégrité (point critique) : **conforme**

Le store de révision (`useReviewStore`) n'a pas de `persist` et n'appelle jamais une action de `useLearnerStore` ; les trois écrans ne font que lire `progress`. Preuve par observation sur le web (390×844, état : 7 mots du jour de boîtes 0 à 5, 2 mots d'hier, historique de test, série 2, objectif 7/10) : `localStorage` comparé octet par octet à l'état de base après chaque scénario, et espion sur `Storage.setItem/removeItem/clear`.

| Scénario | `localStorage` identique | Écritures dues à la révision |
|---|---|---|
| Passe complète 100 % « Retenu » (depuis l'Accueil) | oui | 0 |
| « Refaire tous » en mixte (3/7) puis « Refaire les difficiles » x3 (4, 1, 1 mot) | oui | 0 |
| « Quitter » en cours de passe | oui | 0 |
| Rechargement en cours de passe (retour sur `/review`, pas de reprise) | oui | 0 |
| Chargement direct de `/review-run` et `/review-result` (redirigés vers `/review`) et `/review` | oui | 0 |
| Session réelle de 10 cartes, récap, liste, passe 0/10, refaire, quitter, retour navigateur | oui | 0 |

Texte de l'Accueil (objectif « 7 / 10 », série, maîtrisés, état du test) identique avant/après ; après la session réelle, « 10 / 10 » et série 1 inchangés par la révision. La seule écriture observée est celle de l'hydratation au chargement (contenu identique, comportement v1.0). Côté Jest : progression gelée en profondeur (`Object.freeze`) acceptée par `getTodayWords`, `startReviewPass`, `answerReviewCard`, `hardWords`, `buildReviewQueue` (aucune mutation) ; tirage de session, sélection du test, `STORAGE_VERSION = 1` vérifiés par les tests du Développeur (relus : valides, aucun affaibli).

## 3. Matrice des critères d'acceptation

| AC | Verdict | Preuve |
|---|---|---|
| 11.1 | OK | Web : 7 mots du jour + 2 d'hier → 7 ; doublons impossibles (une entrée par id) ; Jest Dev. |
| 11.2 | OK | `qa-review` : un test sur un mot vu hier ne change pas `lastSeenAt` ; liste inchangée. |
| 11.3 | OK | Bornes 23:59:59.999 / 00:00:00.000 (Jest) ; fuseaux Auckland, Los Angeles, Paris vérifiés à la main sur le web (1, 1, 2 mots attendus et obtenus). Changement d'heure : tests du Dév. verts sous 3 TZ. |
| 11.4 | OK | Web : EN, FR, exemple, catégorie, niveau, badge « Su » ou « À revoir » (glyphe + mot). |
| 11.5 | OK | Tests du Dév. ; liste web : « À revoir » en tête. |
| 11.6 | OK | Web : filtres Voyage + B2 actifs → les 6 mots du jour sont listés. |
| 11.7 | OK | `lastSeenAt` invalide/futur, `seenCount` 0, id inconnu : ignorés (Jest). |
| 11.8 | OK | Web : réinitialisation par Réglages → état vide, progression vide. |
| 12.1 | OK | Première carte au recto, sans écran intermédiaire. |
| 12.2 | OK | Boutons de choix absents avant retournement (arbre d'accessibilité web). |
| 12.3 | OK | Tests du Dév. (boîtes {0,0,3,5}). |
| 12.4 | OK | Passes de 7 et 200 cartes : « n / N » exact ; un mot une fois. |
| 12.5 | OK | « 160 / 200 retenus » et 40 mots listés (200 cartes, 1 sur 5 « à revoir encore ») ; « 3 / 7 », « 0 / 10 ». |
| 12.6 | OK | N = 1 : « 1/1 » puis « Bravo, tout est retenu ». N = 200 : liste prête en 0,4 s (18 lignes montées, virtualisée), défilement fluide, passe complète en 142 s de clics, 0 erreur ; barre à 6,0 % au départ. |
| 12.7 | OK | « Quitter » sans confirmation, retour à `/review`, stockage inchangé. |
| 12.8 | OK | Horloge pilotée : passe démarrée à 23:58 terminée après minuit (5/5), « Refaire tous » reprend l'instantané (1/5) ; au retour sur la liste, état vide. |
| 13.1 | OK | Passes de 4, 1, 1 mots = sous-ensemble précédent. |
| 13.2 | OK | « Bravo, tout est retenu », pas de bouton difficiles, « Refaire tous » primaire. |
| 13.3 | OK | 3 passes enchaînées ; rien de persisté (rechargement : retour liste). |
| 14.1 à 14.5 | OK | Section 2. |
| 15.1 | OK | Carte absente à n = 0 (nouvel utilisateur et mots d'hier seulement), « Commencer une session » en 1 tap. |
| 15.2 | OK | « Mots du jour (0) », état vide, bouton fonctionnel (double clic : une seule session). |
| 15.3 | OK | Récap : « Revoir les mots du jour » ouvre les 10 mots ; « Retour » et « Quitter » reviennent au récap ; « Nouvelle session » et « Accueil » inchangés. |
| 15.4 | OK (partiel) | Aucune requête réseau observée ; mode avion réel non testable ici. |
| 16.1 | Partiel | Jest (en-US, 0,9, exemple) vert ; boutons présents sur ligne et carte. Lecture réelle non testable (pas de voix en Chromium headless). |
| 16.2 | Partiel | Arrêt au changement de carte, au « Quitter » et au démontage vérifié en Jest ; appui répétés et absence de voix non testables sur appareil. |

## 4. Cas limites

- **Minuit** : passe figée OK ; liste recalculée au focus et au retour au premier plan OK ; mais voir V11-02 (écran resté ouvert).
- **Mot évalué hier seulement** : absent (OK). **Évalué plusieurs fois** : une seule ligne (OK). **Test hebdomadaire** : ne crée aucun mot du jour (`applyTestAnswers` ne touche pas `lastSeenAt`, test `qa-review`).
- **Filtres actifs, réinitialisation, 1 mot, 200 mots, tous « Retenu », état vide** : OK (voir matrice).
- **Navigation** : chargement direct de `/review-run` et `/review-result` : redirection propre vers `/review`, sans erreur d'hydratation. Retour navigateur depuis la liste : Accueil.
- **Double clic** (délais 0, 60, 120, 200, 280 ms ; 3 tailles) : « Revoir » (Accueil) et carte « Mots du jour » (Apprendre) : une seule entrée dans l'historique ; « Retourner », « Retenu », « Refaire tous », « Accueil » du résultat, « Commencer une session » de l'état vide : OK. **« Réviser ces mots » et « Refaire les mots difficiles » : voir V11-01.** À 280 ms, le 2e clic sur « Retenu » peut retourner la carte suivante (la garde dure 300 ms ; comportement identique à la session, sans conséquence).

## 5. Non-régression

BUG-01 à BUG-05, RT-01, V2-01 à V2-07 : tests existants verts (23 suites inchangées) ; double clic sur « Retourner » et sur le dernier « Retenu » (garde d'arrivée) tiennent ; 0 erreur d'hydratation sur `/review*` ; session de 10 cartes puis récap fonctionnent (objectif 10/10, série 1) ; `typographie.test.ts` vert (espaces insécables). Le test hebdomadaire n'a pas été rejoué dans le navigateur (graine d'état insuffisante) : couvert par Jest.

## 6. Conformité visuelle et accessibilité

- **Maquettes** : liste, recto, verso, fin de passe, état vide, carte Accueil conformes (écarts mineurs de rendu police système, connus). Aucun débordement horizontal aux 3 tailles ; « Retenu » à droite, « À revoir encore » en secondaire, pas de rouge.
- **Contrastes AA** (calculés sur les tokens) : « À revoir » 7,74:1 ; « Su » 5,63:1 ; texte atténué sur fond 6,46:1 ; Grape sur fond 5,42:1 (« Quitter », « Retour », « Revoir les mots du jour ») ; note 9,66:1 ; blanc sur « Retenu » 4,99:1 ; blanc sur Grape 5,85:1 ; chips de catégorie 6,9 à 7,2:1. Tous conformes (AA 4,5:1).
- **Indicateur** « Su / À revoir » : glyphe + mot + couleur, jamais la couleur seule (OK).
- **Accessibilité** : Vobi absent de l'arbre d'accessibilité web sur les 4 écrans ; barre de progression nommée ; boutons « Retenu », « À revoir encore », « Écouter le mot bed » correctement nommés ; carte retournée désactivée. Réserve web (V11-04). « Réduire les animations » : fondu seul, pas de glissement ; écrans sans animation propre ; OK.
- **Écarts signalés par le Développeur** : (1) fondu translucide au-dessus de « Réviser ces mots » : **accepté** (aplat 16 pt à 85 %, léger bord sur les lignes qui passent dessous, purement cosmétique) ; (2) carte « À revoir encore » sous les boutons : **qualifié V11-03** ; (3) barre à 6 % minimum seulement à partir de 50 cartes : **accepté** (mesuré 13,3/221,7 px = 6,0 % à N = 200 ; à N petit la barre part vide comme en session, cohérent).

## 7. Bugs

### V11-01 — Mineur (limite majeur) : le double tap sur « Réviser ces mots » (et « Refaire les mots difficiles ») retourne la 1re carte
- **Repro** : `/review` avec ≥ 1 mot, double clic rapide au centre de « Réviser ces mots » (0 à 280 ms entre les clics) ; idem « Refaire les mots difficiles » sur l'écran de fin. Constaté à 390×844, 360×740, 320×568.
- **Attendu** : la carte 1 s'affiche au recto (AC-12.1 ; esprit des verrous BUG-01/BUG-02 et de la garde d'arrivée V2).
- **Obtenu** : le 2e clic tombe sur « Retourner » de l'écran qui vient d'apparaître au même endroit : la traduction est révélée sans effort, ce qui annule le rappel actif de la 1re carte de chaque passe. Aucun effet sur les données. « Refaire tous » n'est pas touché à ces tailles (bouton à un autre emplacement), mais la géométrie reste fragile.
- **Cause** : `src/app/review-run.tsx` (`flip`, ~l. 78-82) n'a ni garde d'arrivée ni verrou posé au montage ; `Button` et `useActionGuard` de l'écran précédent ne protègent pas le nouvel écran.
- **Piste** : `useArrivalGuard` dans `flip` (ou `lock()` au montage de `ReviewRun`), sans effet visuel.
- **Test** : `qa-review.test.tsx` « le 2e tap d'un double tap sur « Réviser ces mots »… » (`test.failing`, à passer en test normal après correction).

### V11-02 — Mineur : écran « Mots du jour » laissé ouvert à minuit
- **Repro** : ouvrir `/review` à 23:58 (5 mots étudiés à 23:50), laisser passer minuit sans changer d'écran ni quitter l'app.
- **Attendu** : liste recalculée (RG-102, « à chaque affichage »), « Réviser » indisponible.
- **Obtenu** : « 5 mots étudiés aujourd'hui » reste affiché ; « Réviser ces mots » lance une passe de 5 mots d'hier. La liste se met à jour au focus et au retour au premier plan (OK). Même limite sur le compteur de l'Accueil.
- **Fichier** : `src/hooks/useNow.ts` (aucun minuteur), `src/app/review.tsx` `start` (~l. 62).
- **Piste** : dans `start`, recalculer `getTodayWords(…, new Date())` avant de lancer ; ou un minuteur jusqu'au prochain minuit. Risque faible (aucune donnée touchée).

### V11-03 — Mineur : la liste « À revoir encore » est masquée sous les boutons fixés (petits écrans)
- **Repro** : fin de passe avec 3 mots à revoir à 360×740 : le 3e mot est caché sous « Refaire les mots difficiles » ; à 320×568, la zone défilante ne fait que ~376 px et la carte entière est sous la ligne de flottaison (Vobi, titre, score et note occupent l'espace).
- **Attendu** : le bilan (mots à revoir) lisible ou signalé comme défilant ; maquette : liste visible.
- **Obtenu** : contenu atteignable en défilant, aucun indice (pas de fondu, pas de coupure franche).
- **Fichier** : `src/app/review-result.tsx` (Vobi 120, note, `footer` fixe).
- **Piste** : Vobi 80 quand la liste existe et hauteur < 760, ou boutons dans le flux défilant sous 640 pt de haut.

### V11-04 — Observation (non testable sur appareil) : accessibilité web des lignes
Sur react-native-web, `importantForAccessibility`/`accessibilityElementsHidden` sont ignorés : l'arbre web lit puces, traduction et exemple séparément et n'applique pas le libellé d'ensemble de la ligne. Mobile (VoiceOver/TalkBack) non vérifié. Même limite que la v2 pour Vobi (corrigée par `aria-hidden`).

### V11-05 — Observation : `useReviewStore.clear()` n'est appelé nulle part dans l'application
Une passe abandonnée ou terminée reste en mémoire jusqu'à la fermeture. Conséquence limitée (Web : « Suivant » du navigateur pourrait rouvrir une passe ; la réinitialisation de la progression ne vide pas l'ancien résultat). Rien de persisté. Non reproduit dans le navigateur.

## 8. Verdict v1.1

**Prêt**, sous réserve. Aucun bug critique ni majeur. L'exigence centrale (lecture seule) est démontrée : stockage identique octet pour octet après passe complète, difficiles x3, abandon, rechargement, chargements directs et session réelle ; 0 écriture ; tests gelés en profondeur. Tous les AC de US-11 à US-15 sont OK ; US-16 partiel faute de voix.

À corriger si possible dans le même lot : **V11-01** (3 lignes de code) ; V11-02 et V11-03 peuvent suivre. Réserves inchangées (§7.5) : appareils Android et iOS, mode avion réel, TTS, lecteurs d'écran natifs, rendu avec SF Pro et Roboto, lint (config ESLint absente).


---

# Recette v1.2 — 15 cartes par session et traduction des exemples

Commit testé : `3e24ee2` (« v1.2 : sessions de 15 cartes et traduction française des exemples »). Références : spec §16 à §22 (RG-140 → 164, US-17 à US-23, D-09 à D-18), design « v1.2 », `docs/design/apercu-v12.png` et `rendu-v12.png`. Aucun code applicatif ni `words.ts` modifié ; deux fichiers de test ajoutés : `src/domain/__tests__/qa-v12-session.test.ts` (grille complète RG-142) et `src/domain/__tests__/qa-v12-traductions.test.ts` (1 `test.failing`, V12-01).

## 1. Méthode

| Élément | Résultat |
|---|---|
| Jest | 29 suites, **331 tests verts** (327 du Développeur + 3 QA verts + 1 `test.failing` pour V12-01). |
| `tsc --noEmit` | 0 erreur. Lint : non testable (config ESLint absente, comme en v1.1). `package.json` et `package-lock.json` intacts (md5 vérifié). |
| Web réel | `expo export --platform web` servi hors projet ; Chromium/Playwright à 390×844, 360×740, 320×568 (+ 360×640, 375×667 et un proxy « police agrandie » 246×437). État injecté dans `localStorage` (`vocaboost-store`). 0 erreur de page. `dist/` et temporaires supprimés. |
| Tirage | Formule RG-142 réécrite indépendamment et comparée à `composeSession` sur **toute la grille n = 0..40 × r = 0..40** (1 681 cellules × 3 graines) : taille, unicité, comptes nouveaux/révisions, tous conformes. Les 9 lignes du tableau de la spec passent. |
| Relecture | 200 `exampleFr` relues une à une, avec le mot, le champ `fr` et la phrase anglaise ; contrôles typographiques automatiques en plus (voir §6). |

## 2. Matrice des critères d'acceptation

OK = observé sur le web ou démontré par un test relu ; (J) = couvert par les tests Jest du Développeur, relus, non rejoués dans le navigateur.

| AC | Résultat | Preuve |
|---|---|---|
| 17.1 | OK | Session de 15 cartes distinctes, compteur « 1/15 » à « 15/15 » (web, 9 états différents). |
| 17.2 | OK | 12 vus / 40 vus / 195 vus : 5 nouveaux + 10 révisions (classement par `id` dans le navigateur). |
| 17.3 | OK | Grille complète ci-dessus ; web : 3 vus → 12 + 3, 198 vus → 2 + 13, 200 vus → 0 + 15. |
| 17.4 | OK | Aucun mot vu : 15 nouveaux, 0 révision (web). |
| 17.5 | OK | Pool 11 → 11 cartes « 8 / 11 » ; pool 5 → 5 cartes « 4 / 5 » ; texte « Ta session contiendra 11 cartes. » ; k = 0 : (J). |
| 17.6 | OK | Invariants sur grille QA ; poids RG-24 et mélange inchangés (code non modifié, tests du Dév. relus). |
| 17.7 | OK | Accueil « Prêt pour tes 15 premiers mots ? », Apprendre « 15 cartes tirées au hasard… ». Grep ciblé : aucun « 10 » codé en dur dans les textes de `src/` hors tests (`messages.ts` et `learn.tsx` utilisent `SESSION_SIZE`). Les « 10 » restants du code sont des styles (px) et `TEST_MIN_SEEN` (RG-152, voulu). Tests : seuls restent des 10 légitimes (props de composants, test hebdomadaire, `sessionResultSubtitle(5, 10)`), plus un titre de test périmé (V12-02). |
| 17.8 | OK | Récap « 10 / 15 mots que tu savais » après 15 cartes ; « 8 / 11 » en pool réduit. |
| 18.1 | OK | Installation neuve : `dailyGoal` 15, version 2 écrite, Réglages 10/15/20/30 avec 15 actif (rendu 320 px : segments 67 pt de large) ; 10 choisi conservé après relances. |
| 18.2 | OK | Session complète sur jour vierge : « 15 / 15 », « Objectif atteint ✅ » ; « 10 / 15 » et « Encore 5 cartes » : (J) `v12-textes`. Pool 11 : « 11 / 15 », « Encore 4 cartes ». |
| 18.3 | OK (J) | Dépassement 20 / 15, test et révision n'incrémentent pas ; révision réelle : stockage identique octet pour octet. |
| 18.4 à 18.8 | OK | Voir §3 (migration prouvée sur le web). |
| 18.9 | OK (J) | `migration-v2` / Réglages : réinitialisation conserve l'objectif. Non rejoué sur le web. |
| 18.10 | OK | Store v1 avec 10 cartes du jour et objectif 10 → Accueil « 10 / 15 ». |
| 19.1 | OK | Web : 9 vus → « Étudie encore 1 mot » ; 10 vus → 10 questions ; 15 vus → 15 ; 50 vus → 20. |
| 19.2 | OK | Après une première session de 15 nouveaux, le test est disponible, « 15 questions », compteur 1/15 (web). |
| 19.3 | OK | Accueil « Mots du jour : 15 » après la session ; liste 200 mots sans doublon (200/200 lignes vues en défilant) ; suites v1.1 vertes sans modification. |
| 20.1 | OK | 200/200 versos : traduction visible sans action, dans l'encart sous la phrase anglaise ; avant retournement le texte français n'existe pas dans le DOM (0/200). |
| 20.2 | OK | Passe de révision (200 mots étudiés, 25 cartes à 390 px et 25 à 320 px) : même verso, FR correct, absent avant retournement. |
| 20.3 | OK | Espion `speechSynthesis` sur le web : verso = 2 énoncés (mot, phrase) en `en-US`, débit 0,9 ; liste idem ; aucun bouton dans le bloc français (0/200 versos, 0/200 lignes). |
| 20.4 | OK, réserve | 320×568 : 200/200 versos, bouton « Je savais » et « Je ne savais pas » dans la fenêtre et atteignables (`elementFromPoint`), FR atteignable au bas du défilement, 0 texte tronqué, 0 débordement horizontal. Réserve UX V12-03. Police agrandie réelle : non testable sur le web (`fontScale` = 1) ; proxy 246×437 : boutons atteignables, 2 débordements horizontaux (mots de 9 et 10 lettres dans la ligne du mot au verso, en dessous de 320 pt, hors périmètre). |
| 20.5 | OK | Test hebdomadaire complet à 10, 15 et 20 questions (réponses, retours, résultat, mots ratés) : 0 occurrence d'un `exampleFr` ni d'une phrase d'exemple. |
| 20.6 | OK web | Hors ligne simulé : verso et traduction affichés, **0 requête réseau**. Mode avion réel : non testable. |
| 20.7 | OK (J) | `exemple-fr.test.tsx` (ligne et carte sans bloc, sans plantage) ; relu. |
| 21.1 | OK | 200 lignes : exemple EN puis traduction dessous ; ordre, badges, virtualisation inchangés. |
| 21.2 | OK | 2 boutons 🔊 par ligne, lisent le mot et l'exemple anglais. |
| 22.1 | OK | `lang="fr-FR"` sur 200/200 versos et lignes ; annonce « Traduction de l'exemple : … » (J). |
| 22.2 | OK web | `aria-label` de la ligne contient la traduction sur 200/200 lignes. Limite V11-04 inchangée (arbre web lu en plusieurs morceaux, mobile non vérifié). |
| 22.3 | OK | `primaryInk`/`primarySoft` 9,66:1 ; `primaryInk`/blanc 11,41:1 ; libellé `inkMuted`/`primarySoft` 5,90:1. |
| 23.1 | OK | Contrôles RG-157 verts 200/200, test négatif présent (J). |
| 23.2 | OK | `typographie.test.ts` vert. |
| 23.3 | **KO** | Relecture : 1 contresens probable (V12-01) ; critère « 0 contresens » non atteint tant que non corrigé. |

Non-régression : test hebdomadaire inchangé (seuil 10, N = min(20, vus), formules 9/10/15/50 vérifiées) ; « Mots du jour » inchangé ; révision en lecture seule (stockage identique octet pour octet après une passe de 12 mots) ; verrous anti-double-tap rejoués dans le navigateur : BUG-01/02 (double tap sur « Retourner » à 4 abscisses : 0 évaluation par le 2e tap ; double tap sur « Je savais » : une seule carte avancée, `cardsPerDay` = 15 exactement), double tap sur le dernier « Je savais » : reste sur le récap (V2-01), double tap « Réviser ces mots » : carte non retournée (V11-01), double tap « Suivant » du test : question 2/20 non répondue (V2-01/RT-01).

## 3. Migration du store (point critique) : **conforme**

Méthode : état écrit dans `localStorage['vocaboost-store']` (`{"state":…,"version":N}`), page rechargée, relecture du disque et de l'interface (Accueil, Réglages). État « riche » v1 : 10 mots dans les boîtes 0 à 5, 4 jours actifs, `cardsPerDay` (4, 12, 15, 10 aujourd'hui), meilleure série 5, historique de test, filtres restreints. La comparaison de la progression ignore l'ordre normalisé par `sanitize` (catégories et niveaux remis dans l'ordre canonique, comportement antérieur).

| Cas | Résultat observé | Verdict |
|---|---|---|
| v1, `dailyGoal` 10 | 15 ; version 2 écrite dès le chargement ; progression, jours actifs, `cardsPerDay`, série, historique, filtres identiques ; Réglages « 15 » actif ; Accueil « 10 / 15 » | OK |
| v1, 20 puis 30 | 20 puis 30 conservés, version 2, reste identique | OK |
| v1, 15 (impossible en v1) | 15 | OK |
| v1, absent / 25 / « abc » / null / « 10 » (chaîne) / 10,5 / 0 / -10 | 15 dans les 8 cas, reste identique, version 2 | OK |
| Après migration : choisir 10 puis 4 × (navigation + rechargement) + nouveau contexte avec le même stockage | 10 conservé, Réglages « 10 » actif | OK (migration non rejouée par `sanitize`) |
| v2 avec `dailyGoal` 10, 3 chargements | 10 conservé | OK |
| Version 3 et 99 avec 10 et un champ inconnu | Pas de plantage, 10 conservé, progression intacte ; 2e chargement identique. Réserve V12-04 (version réécrite à 2, champ inconnu supprimé) | OK, réserve |
| JSON invalide, chaîne vide, `[1,2]`, `null`, `state` non objet, `state: null` en v1 | Aucun plantage, état vierge, objectif 15 (« 0 / 15 ») | OK |
| Sans clé `version`, ou version en chaîne « 1 » | Aucune conversion : 10 conservé (« 10 / 10 »). Un store v1 réel porte toujours `version: 1`, donc sans impact | Observation |
| Installation neuve | 15, version 2 écrite | OK |

## 4. Bugs

### V12-01 — Majeur : « Je travaille à la bibliothèque » traduit « I study at the library » (contresens probable)
- **Repro** : mot `library` (A2, École), verso d'une carte, de la passe de révision ou ligne « Mots du jour ».
- **Attendu** : le sens « étudier » (RG-156 : fidélité ; RG-158 : 0 contresens).
- **Obtenu** : « Je travaille à la bibliothèque le samedi. » ; un francophone lit « I work at the library » (emploi). Un apprenant retient un faux sens de la phrase.
- **Fichier** : `src/data/words.ts:116`.
- **Correction** : « J’étudie à la bibliothèque le samedi. » (ou « Je révise… »). Une ligne, aucun test existant ne dépend de ce texte.
- **Test** : `qa-v12-traductions.test.ts` (`test.failing`, à passer en `it` après correction).
- **Impact** : bloque AC-23.3 (0 contresens) ; sinon sans effet fonctionnel.

### V12-02 — Mineur : libellés « 10 / 20 / 30 » périmés dans la doc et un titre de test
- `README.md:19` (« objectif quotidien (10 / 20 / 30 cartes) »), `docs/03-design.md:319` (SegmentedControl « objectif 10/20/30 ») et `:414` (« 10 / 20 / 30 », que le tableau v1.2.2 ligne 866 corrige sans corriger les sections d'origine), `src/__tests__/flows.test.tsx:141` (titre « objectif modifiable en 10/20/30 », le corps teste 20 ; le 15 est testé par `v12-textes`). Aucun effet utilisateur. À aligner dans le même lot (spec §21.9 demande la mise à jour de ces lignes de design).

### V12-03 — Mineur (UX, compromis de design connu) : la traduction est sous la ligne de flottaison sur petits écrans
- **Repro** : session à 320×568, retourner n'importe quelle carte.
- **Obtenu** : 200/200 versos défilent (dépassement jusqu'à 152 px) ; l'encart « Exemple » s'arrête sur « EN FRANÇAIS » coupé par le dégradé et la traduction n'apparaît qu'en défilant. À 360×640, 11 des 26 versos les plus longs défilent (82 px au plus) ; à 375×667, 1 sur 26 ; à 360×740 et au-dessus, aucun. Les boutons restent atteignables, le dégradé s'affiche et disparaît en bas de course, aucune troncature.
- **Attendu** : RG-164 satisfaite (défilement interne accepté par le Designer, §v1.2.4 point 3). Sur le plus petit écran, la nouveauté de la v1.2 demande un geste de défilement par carte, contraire à l'esprit de RG-160 (« sans tap supplémentaire »).
- **Piste (non bloquante)** : sous 640 pt, réduire encore le mot au verso (30 → 26) ou masquer la ligne « TRADUCTION » en libellé de 12 pt au profit de la traduction. À arbitrer par le Designer.

### V12-04 — Mineur : une version de store future est réécrite en version 2 et ses champs inconnus sont supprimés
- **Repro** : `localStorage` = `{"state":{…, "futureField":{"a":1}, "dailyGoal":10},"version":3}` puis lancement.
- **Obtenu** : pas de plantage, progression et objectif conservés (RG-147.5 respectée) ; mais le disque est réécrit avec `version: 2` et sans `futureField`. Une application plus récente rouverte ensuite relancerait sa migration 2 → 3 sur des données déjà épurées.
- **Fichier** : `src/store/useLearnerStore.ts` (`migrate` appelé pour toute version différente de 2, `merge` + `partialize` réécrivent). Comportement identique en v1.1 (version 99 → 1) : pas de régression. Risque faible (retour arrière d'application seulement).

### Observations (non comptées)
- Réglages sur le web : les 4 segments ont `role="radio"` mais aucun `aria-checked`/`aria-selected` n'est exposé (l'état sélectionné ne se lit qu'à l'écran). `SegmentedControl` n'est pas touché par la v1.2 ; mobile non vérifié.
- Un `localStorage` corrompu est remplacé immédiatement par un état vierge (comportement v1.0/v1.1, BUG-03) ; une relecture ultérieure n'est plus possible.
- Non testables ici : appareils Android/iOS, mode avion réel, police système agrandie réelle, lecteurs d'écran natifs, voix TTS réelles, lint.

## 5. Corrections de traductions recommandées (relecture RG-158)

200/200 phrases relues. **1 contresens, 0 faute, 5 retouches de style**, 3 observations de cohérence sans correction exigée. Les contrôles automatiques RG-157 sont verts et confirmés par mon recoupement : 0 apostrophe droite, 0 espace ordinaire avant « ! ? : ; » (16 occurrences, toutes en U+00A0), 0 double espace, 0 « oe » à la place de « œ », ponctuation finale identique à l'anglais, longueur maximale 72 caractères, chiffres, heures et noms propres (Londres, Rome, Dubaï, New York, Lyon, Bretagne, Écosse, Canada, XIIe) conservés, accords vérifiés (genre du sujet, participes, « Nous nous sommes perdus »), tutoiement/vouvoiement cohérents avec la situation.

| Mot | Phrase EN | Traduction actuelle | Correction proposée | Gravité |
|---|---|---|---|---|
| library | I study at the library on Saturdays. | Je travaille à la bibliothèque le samedi. | J’étudie à la bibliothèque le samedi. | **contresens** (lu « I work at ») |
| egg | He had a boiled egg for breakfast. | Il a mangé un œuf à la coque au petit-déjeuner. | Il a mangé un œuf dur au petit-déjeuner. | style (« à la coque » précise un mode de cuisson que l'anglais n'impose pas) |
| chicken | We are having roast chicken for dinner tonight. | Ce soir, nous avons du poulet rôti pour le dîner. | Ce soir, nous mangeons du poulet rôti pour le dîner. | style (calque de « have », redondance « ce soir / dîner ») |
| eat | We eat dinner at seven o’clock. | Le soir, nous mangeons à sept heures. | Nous dînons à sept heures. (ou : Nous mangeons à sept heures le soir.) | style (« dinner » perdu, « le soir » ajouté en tête) |
| colleague | A colleague helped me with the report. | Un collègue m’a donné un coup de main pour le rapport. | Un collègue m’a aidé pour le rapport. | style (registre familier ; RG-156 : neutre) |
| degree | She has a degree in economics. | Elle a un diplôme d’économie. | Elle a un diplôme en économie. | style (tournure usuelle) |

Observations de cohérence avec le champ `fr` (acceptables, aucune correction exigée) : `tree` (« un vieux chêne » : le mot « arbre » n'apparaît pas, fidèle à « oak tree »), `day` (« Bonne journée ! » : idiomatique, « jour » absent), `recovery` (« prompt rétablissement » : formule consacrée, « guérison » absent).

Autres points vérifiés sans anomalie : proverbe de `apple`, « Le lait a tourné » (`sour`), « peinent à payer » (`struggle`), « s'est déclarée » (`outbreak`), « Pour être honnête… » (`honest`), « sûre d'elle » (`confident`), « prompt rétablissement », « à l'âge de cinq ans » (`horse`), « au XIIe siècle » (`century`).

## 6. Verdict v1.2

**Non prêt en l'état, prêt après une correction de donnée d'une ligne** : aucun bug critique ; 1 bug majeur (V12-01, `words.ts:116`), car RG-158/AC-23.3 exigent 0 contresens ; 3 mineurs (V12-02 à V12-04). La logique est conforme : tirage 5 + 10 prouvé sur toute la grille RG-142, objectif 15 et options 10/15/20/30, récap « x / N », textes dérivés de `SESSION_SIZE`, test hebdomadaire et Mots du jour inchangés, migration v1 → v2 prouvée sur le web (progression identique, 10 → 15 une seule fois, 20/30 conservés, 10 choisi ensuite conservé, version future et corrompus sans plantage), traduction jamais au recto ni dans le test, TTS anglais seulement, verrous anti-double-tap intacts.

À faire avant livraison : corriger V12-01 (et idéalement les 5 retouches de style), passer le `test.failing` en `it`. V12-02 dans le même lot ; V12-03 à arbitrer par le Designer ; V12-04 à documenter. Réserves inchangées : appareils réels, avion, police agrandie réelle, lecteurs d'écran natifs, voix, lint.

### Corrections post-recette v1.2
- V12-01 corrigé (`library` : « J’étudie à la bibliothèque le samedi. ») ; les 5 retouches de style appliquées (egg, chicken, eat, colleague, degree). Le test de non-régression est passé de `test.failing` à `test`.
- V12-02 corrigé (README, `docs/03-design.md`, titre du test `flows.test.tsx`).
- V12-03 : compromis de design connu et accepté (défilement du verso à 320×568). V12-04 : comportement identique à la v1.1, accepté.
- Vérification : `tsc` 0 erreur, Jest 29 suites / 331 tests verts, plus aucun `test.failing`.
