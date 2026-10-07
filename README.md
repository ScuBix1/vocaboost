# VocaBoost 🇬🇧

Application mobile (React Native + Expo) pour **apprendre le vocabulaire anglais de manière aléatoire**,
avec **suivi de progression** et **un test par semaine**.

Projet généré à partir du boilerplate
[`react-native-app-boilerplate`](https://github.com/ScuBix1/react-native-app-boilerplate)
en suivant son workflow d'agents :
Client → Chef de Projet → Designer → Développeur → Testeur QA → Approbation Client.

## Fonctionnalités

- **Apprentissage aléatoire** : sessions de 10 cartes tirées au hasard dans une banque de 200 mots
  (10 catégories, niveaux A1 → B2). Le tirage est pondéré par des **boîtes de Leitner** (0 à 5) :
  les mots mal connus reviennent plus souvent. Au plus 3 nouveaux mots par session.
- **Cartes** : mot anglais → retourner → traduction + phrase d'exemple → « Je savais » / « Je ne savais pas ».
  Prononciation via la synthèse vocale (expo-speech).
- **Progression** : mots vus, mots maîtrisés (boîte ≥ 4), % global et par catégorie, série de jours,
  objectif quotidien (10 / 15 / 20 / 30 cartes, 15 par défaut).
- **Test hebdomadaire** : 1 test par semaine ISO (lundi → dimanche), jusqu'à 20 questions en QCM à 4 choix
  (EN→FR et FR→EN), réussi à partir de 70 %, historique des scores. Débloqué à partir de 10 mots vus.
- **Filtres** par catégorie et niveau, 100 % hors ligne, sans compte, données persistées localement.

## Démarrer

```bash
npm install
npm start          # puis ouvrir dans Expo Go (Android / iOS) ou appuyer sur "w" pour le web
```

| Commande | Rôle |
|---|---|
| `npm test` | Tests Jest (logique métier, store, composants, parcours) |
| `npm run type-check` | Vérification TypeScript |
| `npm run web` | Lancer la version web |

Stack : Expo SDK 57, expo-router, TypeScript strict, Zustand (persist + AsyncStorage), expo-speech, Jest + jest-expo.

## Tester l'app

| Besoin | Commande |
|---|---|
| Sur téléphone, sans build (Expo Go) | `npm start` puis scanner le QR code |
| Dans le navigateur | `npm run web` |
| Fichier **APK Android** installable | `npx eas-cli@latest login` puis `npx eas-cli@latest build -p android --profile preview` |

Le build APK se fait dans le cloud d'Expo (compte gratuit nécessaire) : à la fin, EAS affiche un lien et un QR code
pour télécharger l'APK. Sur Android, autoriser l'installation d'applications de sources inconnues pour l'installer.

## Structure

```
src/
  app/         Écrans (expo-router) : onglets Accueil, Apprendre, Progrès, Test + session, test, réglages
  data/        Banque de 200 mots
  domain/      Logique métier pure et testée (Leitner, tirage, streak, semaine ISO, test hebdo)
  store/       Store Zustand persisté
  components/  Composants du design system
  theme/       Tokens de design
.claude/agents Rôles des agents (repris du boilerplate), utilisables comme sous-agents Claude Code
docs/          Livrables de chaque agent
```

## Livrables du workflow

1. [Brief client](docs/01-brief-client.md)
2. [Spécification PM](docs/02-spec-pm.md)
3. [Design UX](docs/03-design.md)
4. [Implémentation](docs/04-implementation.md)
5. [Rapport QA](docs/05-rapport-qa.md)
