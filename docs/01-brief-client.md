# Brief Client — VocaBoost

> Rédigé selon `agents/client/SKILL.md`.

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
