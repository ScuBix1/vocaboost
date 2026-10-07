# Spécification PM — VocaBoost v1

> Rédigé selon `.claude/agents/pm.md`. Entrée : `docs/01-brief-client.md`. Destinataires : Designer, Développeur, QA.
> Les choix non précisés dans le brief sont tranchés ici (section 9 « Décisions à valider par le client »).

---

## 1. Utilisateur cible et problème

**Utilisateur** : francophone (lycéen, étudiant, adulte), niveau A1 → B2 en anglais, 5 à 10 min/jour sur téléphone, souvent sans connexion.

**Problème** : les listes de vocabulaire apprises dans l'ordre sont ennuyeuses et vite oubliées ; l'utilisateur ne mesure pas ses progrès.

**Promesse v1** : des sessions courtes de cartes tirées au hasard (priorité aux mots non maîtrisés), une progression visible et persistante, et un test hebdomadaire noté avec historique. Hors ligne, sans compte.

---

## 2. Périmètre v1

### In scope
| Prio | Fonctionnalité |
|---|---|
| P0 | Banque de 200 mots embarquée dans l'app |
| P0 | Session de cartes aléatoire pondérée (Leitner), auto-évaluation |
| P0 | Progression : vus, maîtrisés, % global, par catégorie, série (streak), objectif quotidien |
| P0 | Test hebdomadaire QCM (1/semaine ISO) + historique |
| P0 | Persistance locale (AsyncStorage) + réinitialisation |
| P1 | Filtres de session par catégorie et niveau |
| P2 | Prononciation TTS du mot et de la phrase d'exemple via `expo-speech` (bonus simple) |

### Out of scope (v1)
- Compte, backend, synchronisation multi-appareils, sauvegarde cloud, export/import.
- Enregistrement/évaluation de la prononciation de l'utilisateur, fichiers audio enregistrés, choix de voix/accent.
- Notifications / rappels push.
- Ajout, édition ou suppression de mots par l'utilisateur ; téléchargement de nouveaux packs.
- Saisie clavier de la réponse (seulement auto-évaluation et QCM).
- Gamification avancée (badges, classements, XP), partage social.
- Mode sombre dédié, autres langues d'interface que le français, tablette/web optimisés.
- Rattrapage d'un test d'une semaine passée.

---

## 3. Glossaire et conventions

- **Date locale** : date du jour selon le fuseau horaire de l'appareil, format `YYYY-MM-DD`. Aucun contrôle anti-triche sur l'horloge.
- **Semaine** : semaine ISO 8601 (lundi 00:00:00 → dimanche 23:59:59, heure locale), identifiant `YYYY-Www` (ex. `2026-W41`, année ISO).
- **Carte évaluée** : carte pour laquelle l'utilisateur a appuyé sur « Je savais » ou « Je ne savais pas ».
- **Boîte** : entier de 0 à 5 associé à chaque mot (système de Leitner).
- **Mot nouveau** : mot jamais évalué (`seenCount = 0`).
- **Mot vu** : mot évalué au moins une fois (`seenCount ≥ 1`).
- **Mot maîtrisé** : mot vu avec `box ≥ 4`.
- **Mot étudié cette semaine** : mot vu dont `lastSeenAt` (dernière évaluation en session) tombe dans la semaine ISO courante.
- Arrondis : pourcentages affichés = `Math.floor` sur entier (ex. 6,9 % → 6 %), sauf score de test (`Math.round`).

---

## 4. Règles métier

### 4.1 Contenu (banque de mots)
- **RG-01** — Exactement **200 mots** embarqués dans le code (fichier de données local), disponibles hors ligne dès la première ouverture.
- **RG-02** — Chaque mot possède : `id` (chaîne stable et unique, ex. `kitchen`), `en` (mot anglais), `fr` (traduction française principale, une seule), `category`, `level` ∈ {A1, A2, B1, B2}, `example` (phrase en anglais contenant le mot, ≤ 120 caractères).
- **RG-03** — Unicité : aucun doublon de `id`, de `en`, ni de `fr` dans la banque (garantit des QCM non ambigus).
- **RG-04** — **10 catégories × 20 mots** : Maison, Nourriture, Voyage, Travail, École, Corps & santé, Nature & animaux, Émotions & personnalité, Temps & calendrier, Verbes courants.
- **RG-05** — Répartition par niveau : A1 = 50, A2 = 60, B1 = 50, B2 = 40 (chaque catégorie contient au moins 1 mot de chaque niveau).
- **RG-06** — Les noms de catégories sont affichés en français ; mots et exemples en anglais ; aucune traduction de la phrase d'exemple n'est requise.

### 4.2 Boîtes de Leitner
- **RG-10** — Tout mot démarre en **boîte 0**, `seenCount = 0`.
- **RG-11** — « **Je savais** » : `box = min(box + 1, 5)`.
- **RG-12** — « **Je ne savais pas** » : `box = 0`.
- **RG-13** — Chaque évaluation (session) : `seenCount += 1`, `lastSeenAt = maintenant` (horodatage ISO). La première évaluation fixe `firstSeenAt`.
- **RG-14** — L'évaluation est **enregistrée immédiatement** (persistance) au moment du tap, pas en fin de session.

### 4.3 Composition d'une session
- **RG-20** — Taille cible : **10 cartes**. Un mot n'apparaît **qu'une fois** par session (pas de répétition intra-session).
- **RG-21** — Pool = mots correspondant aux filtres actifs (§4.6). Il est séparé en *nouveaux* et *à réviser* (= vus).
- **RG-22** — Proportion : **au plus 3 nouveaux** + **7 révisions**. Complément :
  - si moins de 7 révisions disponibles → compléter avec des nouveaux ;
  - si moins de 3 nouveaux disponibles → compléter avec des révisions ;
  - si le pool total < 10 → la session contient tout le pool (taille < 10) ;
  - si le pool est vide → pas de session, message « Aucun mot ne correspond à tes filtres » + bouton « Réinitialiser les filtres ».
  - Première session (aucun mot vu) : 10 nouveaux.
- **RG-23** — Tirage des **nouveaux** : aléatoire uniforme parmi les nouveaux du pool.
- **RG-24** — Tirage des **révisions** : aléatoire **pondéré sans remise**, poids selon la boîte :

  | Boîte | 0 | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|---|
  | Poids | 16 | 8 | 4 | 2 | 1 | 0,5 |

  (Un mot en boîte 0 a 32× plus de chances qu'un mot en boîte 5.)
- **RG-25** — L'ordre final des cartes est mélangé aléatoirement (nouveaux et révisions entremêlés).
- **RG-26** — Le tirage doit être isolé dans une fonction pure acceptant un générateur aléatoire injectable (testabilité).

### 4.4 Déroulé d'une carte
- **RG-30** — Recto : mot anglais + badge niveau + catégorie + indicateur « Carte n / N ». (P2 : bouton haut-parleur.)
- **RG-31** — Tap sur la carte ou bouton « Retourner » → verso : mot anglais, traduction FR, phrase d'exemple EN. (P2 : bouton haut-parleur pour le mot et pour la phrase.)
- **RG-32** — Les boutons « Je savais » / « Je ne savais pas » n'apparaissent et ne sont actifs **qu'après retournement**.
- **RG-33** — Après évaluation → carte suivante. Pas de retour à la carte précédente, pas de modification d'une évaluation.
- **RG-34** — Bouton « Quitter » disponible à tout moment : les cartes déjà évaluées restent comptées (RG-14) ; la carte en cours non évaluée n'a aucun effet.
- **RG-35** — Fin de session : écran récapitulatif : nombre de « Je savais » / total, nombre de mots passés maîtrisés pendant la session (box atteint 4), progression de l'objectif du jour, boutons « Nouvelle session » et « Accueil ».

### 4.5 Progression
- **RG-40** — **Mots vus** = nombre de mots avec `seenCount ≥ 1` (sur 200).
- **RG-41** — **Mots maîtrisés** = nombre de mots avec `box ≥ 4`.
- **RG-42** — **% global** = `floor(maîtrisés / 200 × 100)`.
- **RG-43** — **Par catégorie** : pour chacune des 10 catégories : vus/20, maîtrisés/20, `floor(maîtrisés/20 × 100)` %. Ces valeurs ignorent les filtres.
- **RG-44** — **Objectif quotidien** : nombre de cartes évaluées par date locale. Valeur au choix **10, 20 ou 30** (défaut **10**), réglable dans Réglages. Affichage « x / objectif » ; atteint quand x ≥ objectif (x continue d'augmenter au-delà). Les réponses du test ne comptent **pas** dans l'objectif.
- **RG-45** — **Jour actif** : date locale où au moins **1 carte a été évaluée** OU un test hebdomadaire a été terminé. (Atteindre l'objectif n'est pas requis pour le streak.)
- **RG-46** — **Série actuelle (streak)** :
  - si aujourd'hui est actif → nombre de jours actifs consécutifs se terminant aujourd'hui ;
  - sinon, si hier est actif → nombre de jours actifs consécutifs se terminant hier (la série n'est pas encore perdue) ;
  - sinon → 0.
  - Exemple : actifs le 1, 2, 3 ; aujourd'hui = 4 sans activité → 3 ; aujourd'hui = 5 sans activité → 0.
- **RG-47** — **Meilleure série** : maximum historique de la série, conservé.
- **RG-48** — Stockage minimal requis : liste des dates locales actives (ensemble de `YYYY-MM-DD`) et compteur de cartes par date (seule la date du jour est nécessaire pour l'objectif ; l'historique peut être conservé).

### 4.6 Filtres (P1)
- **RG-50** — Filtre **catégories** (multi-sélection) et **niveaux** (multi-sélection A1/A2/B1/B2). Défaut : tout sélectionné. Aucune sélection dans un groupe = interdit (au moins 1 élément coché, le dernier ne peut pas être décoché).
- **RG-51** — Pool = mots dont la catégorie ET le niveau sont sélectionnés.
- **RG-52** — Les filtres s'appliquent **uniquement aux sessions**, jamais au test ni aux statistiques. Ils sont persistés.
- **RG-53** — L'accueil indique si un filtre est actif (ex. « Filtres : 2 catégories, A1-A2 »).

### 4.7 Test hebdomadaire
- **RG-60** — **1 test terminé maximum par semaine ISO**. Disponible si aucun test n'a été terminé dans la semaine courante ET `mots vus ≥ 10`.
  > *Décision PM post-QA (OBS-01)* : un test est rattaché à la semaine ISO de son **démarrage**. La semaine est fixée au début du test et réutilisée à la fin pour le `weekId` de l'historique (RG-71) et pour la règle « 1 test par semaine ». Exemple : un test commencé le dimanche à 23:58 et terminé le lundi à 00:01 compte pour la semaine du dimanche ; le test de la nouvelle semaine reste disponible. La date/heure de fin et le jour actif (RG-45) restent ceux de la fin.
- **RG-61** — **Minimum requis** : 10 mots vus. Sinon, l'écran Test affiche « Étudie encore X mots pour débloquer le test de la semaine » (X = 10 − vus) et un bouton « Commencer une session ».
- **RG-62** — **Nombre de questions** N = `min(20, mots vus)` (donc entre 10 et 20).
- **RG-63** — **Sélection des mots** (sans doublon) :
  1. mots étudiés cette semaine (RG §3), tirage aléatoire uniforme, jusqu'à N ;
  2. complément par les autres mots vus, tirage pondéré selon RG-24 (priorité aux boîtes basses).
  Les filtres sont ignorés. Ordre final mélangé.
- **RG-64** — **Format** : QCM à 4 choix, une seule bonne réponse. Questions impaires (1, 3, 5…) : **EN → FR** (mot anglais affiché, 4 traductions FR) ; questions paires : **FR → EN**.
- **RG-65** — **Distracteurs** : 3 mots distincts de la banque complète (vus ou non), différents de la bonne réponse, tirés en priorité dans la **même catégorie**, complétés par d'autres catégories si besoin. Les 4 options sont mélangées aléatoirement.
- **RG-66** — Chaque question doit être répondue (pas de « passer »). Après le tap : retour visuel immédiat (bonne réponse en vert, mauvaise choisie en rouge), puis bouton « Suivant ». **Pas de retour arrière**, réponse non modifiable. Pas de limite de temps. TTS non disponible pendant le test.
- **RG-67** — **Abandon** (bouton « Quitter » avec confirmation, ou fermeture de l'app) : le test n'est **pas enregistré**, aucun effet sur les boîtes, il reste disponible ; un nouveau tirage est fait au prochain démarrage.
- **RG-68** — **Score** = bonnes réponses / N ; pourcentage = `round(bonnes / N × 100)`. **Réussi si ≥ 70 %**.
- **RG-69** — **Effet sur les boîtes**, appliqué à la fin du test (après la dernière réponse), en une fois : bonne réponse → `box = min(box + 1, 5)` ; mauvaise → `box = 0`. Le test ne modifie ni `seenCount`, ni `lastSeenAt`, ni l'objectif quotidien ; il marque le jour comme actif (RG-45).
- **RG-70** — **Écran de résultat** : score `x / N`, pourcentage, mention « Réussi » / « À retravailler », liste des mots ratés (EN — FR), bouton « Retour à l'accueil ».
- **RG-71** — **Historique** : chaque test terminé est enregistré : `weekId`, date/heure de fin, N, bonnes réponses, %, réussi (booléen). Affiché du plus récent au plus ancien. Conservé indéfiniment (jusqu'à réinitialisation).
- **RG-72** — Après un test terminé, l'écran Test affiche « Test de la semaine terminé : x/N » et « Prochain test disponible lundi ». Une semaine sans test n'a pas d'entrée dans l'historique (pas de rattrapage).

### 4.8 Prononciation TTS (P2)
- **RG-80** — Bouton haut-parleur sur la carte (recto : mot ; verso : mot et phrase d'exemple). Utilise `expo-speech`, langue `en-US`, vitesse 0,9.
- **RG-81** — Un nouvel appui interrompt la lecture en cours avant de relire. Changer de carte arrête la lecture.
- **RG-82** — En cas d'erreur ou de voix indisponible : aucun crash, aucun message bloquant (échec silencieux).

### 4.9 Persistance et réinitialisation
- **RG-90** — Toutes les données sont stockées localement via AsyncStorage (Zustand + persist), sous une clé unique versionnée (ex. `vocaboost-store`, `version: 1`). Aucune donnée réseau.
- **RG-91** — Données persistées : état par mot (`box`, `seenCount`, `firstSeenAt`, `lastSeenAt`), jours actifs, compteur de cartes du jour, meilleure série, historique des tests, filtres, objectif quotidien. La banque de mots n'est **pas** persistée (elle vient du code) ; l'état est indexé par `id` de mot.
- **RG-92** — Après fermeture forcée et réouverture, toutes les données ci-dessus sont identiques (aucune évaluation déjà tapée perdue).
- **RG-93** — Données illisibles/corrompues → l'app démarre sur un état vierge sans crash.
- **RG-94** — **Réinitialisation** (Réglages → « Réinitialiser ma progression ») : boîte de dialogue de confirmation (« Cette action est irréversible » ; « Annuler » / « Réinitialiser »). Confirmer efface : état des mots, jours actifs, compteurs, meilleure série, historique des tests. Sont **conservés** : objectif quotidien et filtres. Annuler ne change rien.

---

## 5. Écrans (inventaire pour le Designer)
1. **Accueil** : bouton principal « Commencer une session » (1 tap), série actuelle, objectif du jour (x/objectif), % global, statut du test de la semaine, accès Progression / Test / Réglages, indicateur de filtre actif.
2. **Session** (cartes) + **Récap de session**.
3. **Progression** : vus, maîtrisés, % global, série actuelle & meilleure, détail par catégorie.
4. **Test** : état (verrouillé / disponible / terminé), questions, résultat, **Historique**.
5. **Réglages** : objectif quotidien, filtres (P1), réinitialisation, mention « Données stockées uniquement sur cet appareil ».

Interface intégralement en français (mots/exemples en anglais).

---

## 6. User stories et critères d'acceptation

### US-01 — Démarrer une session en 1 tap (P0)
En tant qu'apprenant pressé, je veux lancer une session depuis l'accueil en un seul tap, afin que je puisse réviser immédiatement.
- **AC-01.1** Depuis l'accueil, 1 tap sur « Commencer une session » affiche la première carte (recto), sans écran intermédiaire.
- **AC-01.2** La session contient 10 cartes distinctes si le pool filtré compte ≥ 10 mots (RG-20).
- **AC-01.3** Si le pool filtré compte k < 10 mots, la session contient k cartes ; si k = 0, le message et le bouton de RG-22 s'affichent.
- **AC-01.4** Fonctionne en mode avion.

### US-02 — Tirage aléatoire priorisant les mots non maîtrisés (P0)
En tant qu'apprenant, je veux que les mots soient tirés au hasard en privilégiant ceux que je ne maîtrise pas, afin que je révise ce qui en a besoin sans ennui.
- **AC-02.1** Première session (aucun mot vu) : 10 mots nouveaux.
- **AC-02.2** Avec ≥ 3 nouveaux et ≥ 7 vus dans le pool : exactement 3 nouveaux + 7 révisions.
- **AC-02.3** Avec 2 nouveaux restants et ≥ 8 vus : 2 nouveaux + 8 révisions. Avec 4 vus et ≥ 6 nouveaux : 4 révisions + 6 nouveaux.
- **AC-02.4** (Test unitaire, RNG injecté) Les probabilités de tirage des révisions respectent les poids RG-24 ; sur 10 000 tirages simulés d'un mot parmi {boîte 0, boîte 5}, la boîte 0 sort ≈ 97 % (±2 pts).
- **AC-02.5** Deux sessions successives ne présentent pas les cartes dans le même ordre (ordre mélangé, RG-25) — vérifié par test unitaire avec graines différentes.

### US-03 — Retourner une carte et s'auto-évaluer (P0)
En tant qu'apprenant, je veux voir le mot anglais, retourner la carte puis dire si je savais, afin que l'app adapte mes révisions.
- **AC-03.1** Recto : mot EN, niveau, catégorie, « n / N » ; la traduction n'est pas visible.
- **AC-03.2** Après tap « Retourner » (ou sur la carte) : traduction FR et phrase d'exemple visibles.
- **AC-03.3** Les boutons d'évaluation ne sont pas présents/actifs avant le retournement.
- **AC-03.4** « Je savais » sur un mot en boîte 2 → boîte 3 ; en boîte 5 → reste 5.
- **AC-03.5** « Je ne savais pas » sur un mot en boîte 4 → boîte 0 (il n'est plus maîtrisé).
- **AC-03.6** Après évaluation, la carte suivante s'affiche ; aucun moyen de revenir en arrière.
- **AC-03.7** Quitter après 4 cartes évaluées : ces 4 évaluations sont enregistrées (vus +4 si nouveaux, objectif du jour +4) ; la 5e carte non évaluée est inchangée.
- **AC-03.8** Fin de session : le récap affiche le nombre de « Je savais » / N et l'objectif du jour à jour.

### US-04 — Voir ma progression (P0)
En tant qu'apprenant, je veux voir en un coup d'œil mes mots vus, maîtrisés et ma progression par catégorie, afin que je mesure mes progrès réels.
- **AC-04.1** L'accueil affiche % global, série actuelle et objectif du jour.
- **AC-04.2** L'écran Progression affiche vus /200, maîtrisés /200, % global (RG-42) et, pour chacune des 10 catégories, vus /20, maîtrisés /20 et %.
- **AC-04.3** Un mot qui passe de boîte 3 à 4 incrémente « maîtrisés » de 1 ; qui passe de 4 à 0 le décrémente de 1.
- **AC-04.4** Avec 13 mots maîtrisés, le % global affiché est 6 % (floor de 6,5).
- **AC-04.5** Les statistiques ne changent pas quand on modifie les filtres.

### US-05 — Série de jours et objectif quotidien (P0)
En tant qu'apprenant, je veux suivre ma série de jours consécutifs et mon objectif du jour, afin que je reste motivé à pratiquer chaque jour.
- **AC-05.1** Jours actifs J-2, J-1, J (aujourd'hui) → série = 3.
- **AC-05.2** Jours actifs J-3, J-2, J-1, aucune activité aujourd'hui → série = 3 ; une carte évaluée aujourd'hui → 4.
- **AC-05.3** Dernier jour actif J-2 → série = 0. Une carte évaluée aujourd'hui → 1.
- **AC-05.4** Un test terminé aujourd'hui sans aucune carte rend le jour actif.
- **AC-05.5** Meilleure série conservée après une rupture (ex. série 5 puis rupture → meilleure = 5, actuelle = 0 ou 1).
- **AC-05.6** Objectif par défaut 10 ; modifiable en 10/20/30 dans Réglages ; « x / objectif » se remet à 0 au changement de date locale ; le compteur dépasse l'objectif sans plafond (ex. 15/10) ; les réponses de test n'y sont pas comptées.

### US-06 — Filtrer par catégorie et niveau (P1)
En tant qu'apprenant, je veux limiter mes sessions à certaines catégories et niveaux, afin que je travaille ce qui me concerne.
- **AC-06.1** Avec seulement « Voyage » + « A1 » cochés, toutes les cartes d'une session sont de catégorie Voyage et niveau A1.
- **AC-06.2** Impossible de décocher le dernier élément d'un groupe.
- **AC-06.3** Les filtres persistent après redémarrage.
- **AC-06.4** Les filtres n'affectent ni le test ni les statistiques.
- **AC-06.5** L'accueil signale qu'un filtre est actif.

### US-07 — Passer le test hebdomadaire (P0)
En tant qu'apprenant, je veux passer un test chaque semaine sur les mots étudiés, afin que je vérifie ce que j'ai vraiment retenu.
- **AC-07.1** Avec 9 mots vus : test verrouillé, message « Étudie encore 1 mot… ». Avec 10 vus : disponible, 10 questions.
- **AC-07.2** Avec 50 mots vus : 20 questions, sans doublon.
- **AC-07.3** Avec 12 mots étudiés cette semaine et 50 vus : les 12 mots de la semaine sont tous dans le test + 8 autres mots vus.
- **AC-07.4** Avec 30 mots étudiés cette semaine : les 20 questions portent toutes sur des mots de la semaine.
- **AC-07.5** Question 1 = EN→FR, question 2 = FR→EN, en alternance jusqu'à la fin.
- **AC-07.6** Chaque question a 4 options distinctes, dont exactement une correcte ; les distracteurs sont de la même catégorie quand elle en fournit 3.
- **AC-07.7** Impossible de passer une question ou de revenir à une précédente ; feedback vert/rouge après réponse.
- **AC-07.8** 14/20 → 70 % « Réussi » ; 13/20 → 65 % « À retravailler » ; 7/10 → 70 % « Réussi ».
- **AC-07.9** Fin du test : chaque mot bien répondu +1 boîte (max 5), chaque mot raté → boîte 0 ; le résultat liste les mots ratés.
- **AC-07.10** Après un test terminé, un nouveau test est impossible jusqu'au lundi 00:00 local suivant ; le lundi, il redevient disponible.
- **AC-07.11** Abandon en cours de test : aucune entrée d'historique, boîtes inchangées, test toujours disponible.

### US-08 — Consulter l'historique des tests (P0)
En tant qu'apprenant, je veux revoir mes scores des semaines passées, afin que je constate mon évolution.
- **AC-08.1** Chaque test terminé ajoute une entrée : semaine (ex. « Semaine 41 – 2026 »), date, x/N, %, Réussi/À retravailler.
- **AC-08.2** Entrées triées de la plus récente à la plus ancienne.
- **AC-08.3** L'historique persiste après redémarrage.
- **AC-08.4** Historique vide → message « Aucun test pour l'instant ».

### US-09 — Écouter la prononciation (P2)
En tant qu'apprenant, je veux entendre le mot et la phrase d'exemple, afin que j'apprenne la bonne prononciation.
- **AC-09.1** Le bouton haut-parleur lit le mot en anglais (en-US) au recto ; au verso, mot et phrase ont chacun un bouton.
- **AC-09.2** Appuis répétés : pas de lectures superposées ; passer à la carte suivante coupe la lecture.
- **AC-09.3** Sans voix disponible : pas de crash.

### US-10 — Retrouver mes données et pouvoir repartir de zéro (P0)
En tant qu'apprenant sans compte, je veux que ma progression soit conservée sur mon téléphone et pouvoir la réinitialiser, afin que je ne perde rien et puisse recommencer si je le souhaite.
- **AC-10.1** Évaluer 3 cartes, tuer l'app, la rouvrir : vus, boîtes, objectif du jour et série identiques.
- **AC-10.2** Réinitialiser → confirmer : vus = 0, maîtrisés = 0, série = 0, meilleure série = 0, historique vide, test verrouillé ; objectif et filtres conservés.
- **AC-10.3** Réinitialiser → annuler : aucune donnée modifiée.
- **AC-10.4** Données stockées corrompues : l'app s'ouvre sur un état vierge sans crash.
- **AC-10.5** Aucune requête réseau n'est effectuée par l'app.

---

## 7. Priorités de livraison
1. **P0** : RG-01→06, 10→14, 20→26, 30→35, 40→48, 60→72, 90→94 ; US-01, 02, 03, 04, 05, 07, 08, 10.
2. **P1** : RG-50→53 ; US-06.
3. **P2** : RG-80→82 ; US-09.

Une version est livrable au client si tout P0 est « fait ». P1 et P2 peuvent suivre sans bloquer.

---

## 8. Définition de « fait » (pour le QA)
Une user story est **faite** quand :
1. Tous ses AC passent sur un appareil/émulateur Android **et** iOS (ou Expo Go), en mode avion.
2. Les fonctions de logique pure ont des tests unitaires verts : tirage de session (RG-20→25), mise à jour des boîtes (RG-11/12, 69), streak (RG-46, cas AC-05.1→3), calcul de semaine ISO (incl. passage d'année, ex. 2026-12-31 → `2026-W53`, 2027-01-04 → `2027-W01`), sélection du test et distracteurs (RG-62→65), score/seuil (RG-68).
3. `tsc --noEmit` et le lint passent sans erreur.
4. Aucun crash ni écran blanc sur le parcours : accueil → session complète → progression → test → historique → réinitialisation.
5. La persistance est vérifiée par redémarrage forcé (AC-10.1).
6. Textes d'interface en français, sans faute bloquante ; banque validée par script (200 mots, unicité RG-03, répartition RG-04/05).
7. Le Designer a validé la conformité visuelle des écrans §5.

---

## 9. Décisions à valider par le client
Ces points ont été tranchés par le PM faute de précision dans le brief : session de 10 cartes (3 nouveaux / 7 révisions) ; maîtrisé = boîte ≥ 4 ; « Je ne savais pas » renvoie en boîte 0 ; streak = ≥ 1 carte ou 1 test dans la journée ; objectif 10/20/30 ; test = 20 questions, minimum 10 mots vus, seuil 70 %, 1 par semaine ISO sans rattrapage ; test abandonné non compté ; le test modifie les boîtes ; réinitialisation conserve réglages et filtres.

---

# Évolution v1.1 — Revoir le vocabulaire du jour

> Chapitre ajouté le 2026-10-07. Les chapitres 1 à 9 (RG-01 → RG-94, US-01 → US-10, AC-01.x → AC-10.x) restent inchangés et ne sont pas renumérotés. Demande client : « pouvoir revoir le vocabulaire du jour afin de mieux l'assimiler ». Destinataires : Designer, Développeur, QA.

## 10. Cadrage

**Problème** : après une session, l'utilisateur ne peut pas relire ce qu'il vient d'étudier ; les cartes ne sont plus accessibles et la répétition espacée ne les représentera pas avant plusieurs jours. Or la révision immédiate (même jour) améliore l'ancrage.

**Solution** : un écran « Mots du jour » (liste consultable) et une **passe de révision active** en cartes, sans aucun effet sur la progression (Leitner, objectif, série). La répétition espacée reste la seule source de vérité de la progression.

**Hors scope v1.1** : mini-quiz QCM (recouvre le test hebdo, cf. D-07), saisie clavier, persistance d'une passe en cours, historique des révisions, rappels, révision d'un jour passé.

### 10.1 Ce que l'état persisté permet déjà (vérifié dans le code)
- `WordProgress.lastSeenAt` (ISO) est écrit par chaque évaluation de carte (`recordEvaluation`, RG-13) et **jamais** par le test (RG-69, `applyTestAnswers`). Il suffit donc à définir « évalué aujourd'hui en session ».
- Le résultat de la dernière évaluation n'est pas stocké, mais `box === 0` avec `seenCount ≥ 1` signifie « raté à la dernière évaluation (session ou test) » (RG-12 ramène à 0 ; « Je savais » donne `box ≥ 1`). L'indicateur « su / à revoir » se **dérive** de `box`.
- `cardsPerDay` ne contient pas les ids : il ne sert pas à définir la liste.
- **Aucune migration** : `PersistedData`, `sanitizePersistedData` et `STORAGE_VERSION = 1` sont inchangés. Aucune nouvelle clé persistée, aucune dépendance npm.

## 11. Règles métier (RG-100+)

### 11.1 Définition
- **RG-100** — **Mot du jour** : mot de la banque dont `progress[id].seenCount ≥ 1` ET dont `lastSeenAt` est une date valide dont la date locale (`toLocalDateKey`) égale la date locale de « maintenant ». Les mots dont seul le test a modifié la boîte aujourd'hui n'en font pas partie (le test ne touche pas `lastSeenAt`).
- **RG-101** — Un mot évalué plusieurs fois aujourd'hui (sessions différentes) apparaît **une seule fois**. Un mot évalué hier et aujourd'hui y figure (sa `lastSeenAt` est celle d'aujourd'hui) ; un mot évalué hier seulement n'y figure pas.
- **RG-102** — Changement de jour : la liste est recalculée à partir de l'heure courante à chaque affichage (date injectable) ; à minuit elle se vide (les mots de la veille disparaissent). Une passe de révision déjà **démarrée** travaille sur un instantané des ids pris à son démarrage et se termine normalement ; l'écran de fin et la liste, eux, sont recalculés.
- **RG-103** — Réinitialisation (RG-94) : `progress` vidé, donc liste vide. Un mot dont l'id n'existe plus dans la banque est ignoré sans erreur.
- **RG-104** — Les filtres de session (RG-50 → RG-52) **ne s'appliquent pas** à la liste ni à la passe de révision : tout mot évalué aujourd'hui y figure.

### 11.2 Liste « Mots du jour »
- **RG-105** — Chaque ligne affiche : mot EN, traduction FR, phrase d'exemple EN, catégorie (libellé FR), niveau, et un badge d'état : **« À revoir »** si `box = 0`, **« Su »** sinon (dérivé, RG-10/12). En-tête : « n mot(s) étudié(s) aujourd'hui ».
- **RG-106** — Ordre : mots « À revoir » d'abord, puis boîte croissante, puis `lastSeenAt` décroissant, puis `en` alphabétique (ordre total déterministe, sans aléatoire).
- **RG-107** — La traduction et l'exemple sont visibles dans la liste (consultation, pas auto-test). Liste virtualisée : jusqu'à 200 mots sans ralentissement perceptible.

### 11.3 Passe de révision active (cartes)
- **RG-110** — Bouton « Réviser ces mots » : lance une passe avec **tous** les mots du jour (instantané RG-102). Désactivé/absent si la liste est vide.
- **RG-111** — Ordre de la passe : groupes par boîte croissante (boîte 0 en premier), mélange aléatoire **à l'intérieur de chaque groupe** ; générateur aléatoire injectable (même principe que RG-26).
- **RG-112** — Carte : réutilise recto/verso de RG-30/31 (recto : mot EN, niveau, catégorie, « n / N » ; verso : traduction FR + exemple). Après retournement uniquement (RG-32) deux boutons : **« Retenu »** et **« À revoir encore »** (libellés volontairement différents de « Je savais / Je ne savais pas » pour éviter la confusion avec l'évaluation Leitner). Pas de retour arrière sur une carte (RG-33). « Quitter » à tout moment, sans confirmation, sans effet de bord.
- **RG-113** — Écran de fin de passe : « x / N retenus », liste des mots « À revoir encore » (EN — FR), boutons « Refaire les mots difficiles » (visible seulement s'il y en a ≥ 1), « Refaire tous les mots », « Accueil ». Aucun confetti ni mention de série/objectif.
- **RG-114** — **Passe sur les mots difficiles** : mêmes règles que RG-110/111/112 sur le sous-ensemble marqué « À revoir encore » de la passe précédente (marquage éphémère, en mémoire). Elle peut s'enchaîner jusqu'à épuisement (aucun mot difficile → message « Bravo, tout est retenu » et pas de bouton de refaite).
- **RG-115** — Un seul mot (N = 1) : passe d'une carte, indicateur « 1 / 1 », fin de passe normale. Beaucoup de mots (jusqu'à 200) : pas de plafond, « Quitter » toujours disponible.
- **RG-116** — TTS : mêmes boutons et comportement que RG-80/81/82 (recto : mot ; verso : mot et exemple), également disponibles sur chaque ligne de la liste (mot et exemple).

### 11.4 Impact sur les règles existantes (recommandation : zéro effet sur la progression)
- **RG-120** — Réviser (liste ou passe) **ne modifie jamais** : `box` (RG-11/12), `seenCount`, `firstSeenAt`, `lastSeenAt` (RG-13), `cardsPerDay` / objectif quotidien (RG-44), `activeDays` / série / meilleure série (RG-45 → RG-47), `testHistory`, statistiques (RG-40 → RG-43), sélection du test hebdo « mots étudiés cette semaine » (RG-63). Aucune écriture dans le store persisté ; le marquage « À revoir encore » vit uniquement en mémoire (comme `useResultsStore`, RG-34/RG-67 : rien n'est repris après fermeture).
- **RG-121** — Justification : (a) une réponse donnée quelques minutes après la lecture de la solution ne prouve pas une rétention à long terme ; créditer +1 boîte ferait atteindre « maîtrisé » (boîte 4) en 4 passes le même jour, faussant % global, tirage (RG-24) et test ; (b) la liste du jour reste stable car `lastSeenAt` n'est pas modifié ; (c) pas de double comptage dans l'objectif (RG-44) ni dans le jour actif.
- **Effets assumés** : réviser ne fait pas progresser l'objectif ni la série (l'utilisateur doit toujours faire une vraie session pour cela) ; un « À revoir encore » ne rétrograde pas le mot en boîte 0 (le tirage Leitner ne le sait pas), seule la fin de passe l'en informe l'utilisateur.
- **Précisions (notes datées 2026-10-07, sans réécriture)** : *RG-52* — « uniquement aux sessions » inclut explicitement que les filtres ne s'appliquent pas à la révision du jour (RG-104). *RG-44 / RG-45* — une passe de révision n'est pas une « carte évaluée » au sens du glossaire §3. *RG-91* — aucune donnée nouvelle n'est persistée.
- **RG-122** — Persistance : version du store inchangée (1). Aucune migration. Un état persisté v1.0 existant fonctionne sans transformation.

### 11.5 Points d'entrée
- **RG-130** — **Accueil** : carte « Mots du jour : n » avec bouton « Revoir » ; affichée seulement si n ≥ 1 (pas de bruit pour un nouvel utilisateur). Elle ne remplace pas « Commencer une session » (AC-01.1 reste valide : 1 tap).
- **RG-131** — **Onglet Apprendre** : entrée permanente « Mots du jour (n) » ; à n = 0 elle mène à l'état vide (RG-132).
- **RG-132** — **Récap de session** (RG-35) : bouton tertiaire « Revoir les mots du jour » (tous les mots du jour, pas seulement ceux de la session) ; ne remplace pas « Nouvelle session » / « Accueil ».
- **RG-133** — **État vide** (n = 0, y compris après réinitialisation ou à minuit) : « Aucun mot étudié aujourd'hui », texte « Fais une session pour retrouver ici les mots du jour. » et bouton « Commencer une session ». Aucune passe lançable.
- **RG-134** — Hors ligne, sans compte, interface française, aucune requête réseau (cohérent AC-10.5).

## 12. User stories et critères d'acceptation

### US-11 — Voir la liste des mots du jour (P0)
En tant qu'apprenant, je veux retrouver les mots que j'ai étudiés aujourd'hui, afin de les relire.
- **AC-11.1** Avec `lastSeenAt` aujourd'hui pour 3 mots (dont un évalué 2 fois) et hier pour 2 autres : la liste contient exactement 3 mots, sans doublon.
- **AC-11.2** Un mot dont seule la boîte a changé via le test aujourd'hui (`lastSeenAt` d'hier) n'apparaît pas.
- **AC-11.3** (pure, date injectable) `lastSeenAt = 2026-10-07T23:59:00` local → mot du jour pour `now = 2026-10-07T23:59:59`, absent pour `now = 2026-10-08T00:00:00`. Idem au changement d'heure (jour de 23 h/25 h).
- **AC-11.4** Chaque ligne affiche EN, FR, exemple, catégorie, niveau, badge ; box 0 → « À revoir », box 1 à 5 → « Su ».
- **AC-11.5** Ordre conforme à RG-106 (test unitaire avec jeu mélangé, résultat identique à chaque appel).
- **AC-11.6** Filtres actifs restrictifs (ex. Voyage + A1) : la liste contient quand même tous les mots du jour (RG-104).
- **AC-11.7** `lastSeenAt` invalide/null avec `seenCount ≥ 1`, id inconnu de la banque : ignorés, pas de crash.
- **AC-11.8** Après réinitialisation : liste vide.

### US-12 — Réviser activement en cartes (P0)
En tant qu'apprenant, je veux me tester en cartes sur les mots du jour, afin de mieux les mémoriser.
- **AC-12.1** « Réviser ces mots » affiche la première carte (recto) sans écran intermédiaire ; la traduction n'est pas visible.
- **AC-12.2** « Retenu » / « À revoir encore » absents/inactifs avant retournement.
- **AC-12.3** (pure, RNG injecté) Avec mots en boîtes {0, 0, 3, 5} : les deux boîte 0 passent avant le 3 puis le 5, quelle que soit la graine ; l'ordre intra-groupe varie selon la graine.
- **AC-12.4** Chaque mot apparaît exactement une fois par passe ; indicateur « n / N » correct.
- **AC-12.5** Fin : « x / N retenus » exact et liste des mots « À revoir encore ».
- **AC-12.6** N = 1 : une carte, fin normale. N = 200 : passe complète sans erreur ni lenteur notable.
- **AC-12.7** Quitter en cours : retour sans confirmation, aucune donnée persistée modifiée.
- **AC-12.8** Passe lancée à 23:58, terminée à 00:02 : la passe va au bout sur ses mots ; au retour, la liste est recalculée (vide si plus de mot du nouveau jour).

### US-13 — Refaire une passe sur les mots difficiles (P1)
En tant qu'apprenant, je veux refaire une passe uniquement sur mes mots difficiles, afin de me concentrer sur ce qui résiste.
- **AC-13.1** « Refaire les mots difficiles » n'est visible que si ≥ 1 mot « À revoir encore » ; la passe contient exactement ces mots.
- **AC-13.2** Si tous « Retenu » : message « Bravo, tout est retenu », pas de bouton de refaite ; « Refaire tous les mots » reste disponible.
- **AC-13.3** Enchaîner 3 passes : à chaque fois seul le sous-ensemble précédent est repris ; le marquage n'est jamais persisté (fermer/rouvrir l'app : rien).

### US-14 — Préserver la répétition espacée (P0)
En tant qu'apprenant, je veux que réviser ne fausse ni ma progression ni mes statistiques, afin que mes chiffres restent fiables.
- **AC-14.1** (état persisté sérialisé avant/après une passe complète, 100 % « Retenu » puis une autre 100 % « À revoir encore ») : strictement identique (`progress`, `cardsPerDay`, `activeDays`, `bestStreak`, `testHistory`).
- **AC-14.2** L'objectif « x / objectif », la série, vus/maîtrisés/% global sont identiques avant et après.
- **AC-14.3** Le tirage de session suivant et la sélection du test (RG-63) sont identiques à état égal avant/après révision (mêmes entrées, même RNG graine).
- **AC-14.4** Aucune écriture AsyncStorage pendant la révision (espion `setItem` : 0 appel dû à la révision).
- **AC-14.5** `STORAGE_VERSION` reste 1 ; un état v1.0 se charge sans migration.

### US-15 — Accéder facilement à la révision (P1)
En tant qu'apprenant, je veux lancer la révision depuis les écrans naturels, afin de ne pas chercher.
- **AC-15.1** Accueil : carte « Mots du jour : n » visible si n ≥ 1, absente si n = 0 ; « Commencer une session » reste en 1 tap.
- **AC-15.2** Onglet Apprendre : entrée « Mots du jour (n) » toujours présente ; à n = 0, l'état vide (RG-133) avec bouton « Commencer une session » fonctionnel.
- **AC-15.3** Récap de session : bouton « Revoir les mots du jour » ouvre la liste de **tous** les mots du jour ; « Nouvelle session » et « Accueil » inchangés.
- **AC-15.4** Fonctionne en mode avion ; aucune requête réseau.

### US-16 — Écouter les mots du jour (P2)
En tant qu'apprenant, je veux entendre les mots en révisant, afin de fixer la prononciation.
- **AC-16.1** Sur carte et sur chaque ligne de la liste, le haut-parleur lit le mot (en-US, 0,9) ; au verso/ligne, l'exemple aussi.
- **AC-16.2** Appuis répétés : pas de lectures superposées ; changer de carte ou quitter coupe la lecture ; sans voix : pas de crash (RG-81/82).

## 13. Priorités
- **P0** : RG-100 → 103, 105 (hors TTS), 110 → 113, 115, 120 → 122, 133 ; US-11, US-12, US-14.
- **P1** : RG-104, 106, 114, 130 → 132 ; US-13, US-15.
- **P2** : RG-116 ; US-16.

## 14. Définition de « fait » (QA) pour v1.1
1. Tous les AC de la story passent sur Android et iOS (ou Expo Go), en mode avion.
2. Tests unitaires verts, **date et RNG injectables**, fonctions pures dans `src/domain/` (ex. `getDailyWords(progress, words, now)`, `sortDailyWords`, `buildReviewQueue(words, progress, rng)`, `hardWords(marks)`) : cas AC-11.1 à 11.8, AC-12.3 / 12.4, AC-13.1, minuit et changement d'heure.
3. Test de non-régression d'intégrité (AC-14.1 → 14.5) vert ; suites existantes (flows, qa-flows, corrections-v2, qa-design-v2) inchangées et vertes.
4. `tsc --noEmit` et lint sans erreur ; `package.json` sans nouvelle dépendance ; `STORAGE_VERSION = 1`.
5. Parcours sans crash : session → récap → « Revoir les mots du jour » → passe → mots difficiles → accueil ; réinitialisation → état vide.
6. Textes en français, validés par le Designer (nouveaux écrans : liste, passe, fin de passe, état vide, carte Accueil).

## 15. Décisions à valider par le client
- **D-01** Définition « du jour » = au moins une évaluation de carte en session aujourd'hui (date locale, via `lastSeenAt`). Les mots seulement touchés par le test n'y sont pas. Alternative : fenêtre glissante 24 h (rejetée : incohérente avec objectif/série basés sur la date locale).
- **D-02** Révision = **lecture seule** : aucun effet sur boîtes, seenCount, lastSeenAt, objectif, série. Alternative écartée : « À revoir encore » ramène à la boîte 0 (jamais de montée) ; plus de pédagogie mais modifie lastSeenAt/le tirage et complexifie ; envisageable en v1.2.
- **D-03** Indicateur « Su / À revoir » = état courant dérivé de la boîte (0 = à revoir), donc il peut refléter un test passé aujourd'hui ; aucun champ ajouté au store.
- **D-04** Filtres non appliqués à la révision du jour.
- **D-05** Révision active = cartes recto/verso avec libellés « Retenu / À revoir encore » ; ordre : mots difficiles d'abord, mélange intra-groupe ; passe « difficiles uniquement » éphémère, sans plafond de taille.
- **D-06** Points d'entrée : Accueil (si n ≥ 1), onglet Apprendre (toujours), récap de session ; état vide dédié ; passe non reprise après fermeture.
- **D-07** Mini-quiz QCM exclu de v1.1 (recoupe le test hebdo et poserait la question des effets sur Leitner) ; à réévaluer si le client le souhaite.
- **D-08** Mot évalué aujourd'hui puis le test fait chuter sa boîte : il reste du jour (« À revoir »). Changement de fuseau horaire : la liste suit la date locale courante (pas de correctif).

### Validation Client — v1.1
✅ Décisions D-01 à D-08 **approuvées** par le client (révision en lecture seule, pas de migration du store, pas de mini-quiz, filtres non appliqués à la révision).
