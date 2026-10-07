# Brief Client — VocaBoost

> Rédigé selon `.claude/agents/client.md`.

## Le problème
Les francophones qui veulent progresser en anglais manquent de vocabulaire. Les listes
de mots apprises « dans l'ordre » sont ennuyeuses et vite oubliées, et on n'a aucune
idée de ses progrès réels.

## Qui a ce problème
- Lycéens, étudiants et adultes francophones (niveau débutant à intermédiaire, A1 → B2).
- Ils ont 5 à 10 minutes par jour, sur leur téléphone.

## La solution attendue
Une application mobile qui :
1. **Fait apprendre le vocabulaire anglais de manière aléatoire** : chaque session tire
   des mots au hasard (en privilégiant ceux qui ne sont pas encore maîtrisés).
2. **Suit la progression** : mots vus, mots maîtrisés, série de jours consécutifs,
   progression par catégorie.
3. **Propose un test par semaine** : un test hebdomadaire sur les mots étudiés,
   avec un score et un historique des tests.

## Critères de succès métier
- Un utilisateur peut démarrer une session en 1 tap depuis l'accueil.
- La progression est visible en un coup d'œil et persiste après fermeture de l'app.
- Le test hebdomadaire est disponible une fois par semaine et son score est conservé.
- Fonctionne hors ligne, sans compte.

## Contraintes
- Stack du boilerplate : React Native + Expo (expo-router), TypeScript, Zustand, AsyncStorage.
- Pas de backend, pas de compte utilisateur pour la v1.
- Interface en français, mots en anglais.

## Priorités
1. (P0) Apprentissage aléatoire par cartes
2. (P0) Suivi de progression persistant
3. (P0) Test hebdomadaire + historique
4. (P1) Filtrer par catégorie / niveau
5. (P2) Prononciation audio (text-to-speech)

## Validation de la spec PM
✅ **Approuvée** (rôle Client). Les décisions de la section 9 de `02-spec-pm.md` sont acceptées telles quelles.

## Approbation finale
✅ **Approuvée** (rôle Client) pour la v1, sur la base du rapport QA (aucun bug critique ou majeur ouvert).
Reste à faire avant publication sur les stores : un passage sur appareil Android et iOS réel (mode avion, arrêt forcé, son).
Points mineurs connus et acceptés : RT-02 (boutons grisés 300 ms au retournement), RT-03 (avertissement d'hydratation web en ouvrant `/session` directement).

## Approbation — direction artistique v2
✅ **Approuvée** (rôle Client) : DA v2 intégrée, recette QA « prête » (aucun bug critique ou majeur ouvert).
Points mineurs connus et acceptés : RT2-01 (boutons d'évaluation sur 2 lignes sous ~340 pt), RT2-02 (tap ignoré juste après une garde d'arrivée).
Toujours à faire avant publication : passage sur appareils iOS et Android réels.

## Approbation — v1.1 « Mots du jour »
✅ **Approuvée** (rôle Client) : recette QA « prête », aucun bug critique ou majeur ouvert.
Point mineur connu et accepté : V11-04 (accessibilité des lignes de la liste avec un lecteur d'écran sur le web, à vérifier sur appareil réel).
