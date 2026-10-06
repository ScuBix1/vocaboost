# Rapport QA — VocaBoost v1

> Rédigé selon `agents/qa/SKILL.md`. Entrées : `02-spec-pm.md` (les critères d'acceptation font référence), `03-design.md`, `04-implementation.md` et le code de `src/`. Destinataires : Développeur, Chef de Projet, Designer, Client.
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
