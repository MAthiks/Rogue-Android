# TECH-013A — Sources modulaires et assemblage compatible

## But

Réduire progressivement le fichier monolithique tout en conservant exactement le jeu HTML autonome utilisé par les tests historiques, le navigateur, la PWA et l'APK Android.

Référence : 3a6df309669a9a0106e4d08c7718a0c3559cbe34, après TECH-012.

## Organisation des sources

- src/index.template.html : structure HTML et marqueurs d'inclusion.
- src/styles/game.css : feuille de style complète.
- src/game/engine.template.js : moteur historique dans son IIFE, encore largement monolithique.
- src/game/dungeon.js : générateur de plan déterministe, première fonction indépendante du DOM.
- src/platform/pwa.js : inscription facultative du service worker.
- tools/build-game.cjs : assembleur sans dépendance externe.
- index.html : artefact généré versionné ; ne plus modifier directement pour les évolutions du moteur.

## Développement local

Node.js 22 recommandé (même version que la CI).

1. Modifier le fichier source concerné.
2. Exécuter node tools/build-game.cjs --write.
3. Exécuter node tools/build-game.cjs --check.
4. Exécuter les tests concernés et inclure index.html dans le commit.

Le premier test TECH-013A vérifie également l'identité complète avec le point de départ et 300 générations comparées à la référence. Ce test de référence est spécifique à cette extraction sans changement fonctionnel ; lors d'une évolution autorisée du gameplay, conserver le contrôle d'assemblage et adapter explicitement la référence ou le périmètre de l'équivalence, sans affaiblir les suites historiques.

## Contraintes

Les modules sont des unités de source assemblées dans la portée historique ; ce ne sont pas encore des ES modules. Le fichier HTML reste identique à la référence, donc aucune modification du chargement PWA, de Gradle, de la sauvegarde, des permissions Android ni du cache n'est nécessaire dans cette étape. L'assembleur n'est pas exécuté sur le téléphone.

## Suite proposée

TECH-013B : extraire géométrie et visibilité avec dépendances explicites.
TECH-013C : combat et IA.
TECH-013D : progression, objets et économie.
TECH-013E : persistance et interfaces.
TECH-013F : tests des interfaces de modules, documentation et recette physique.

Une étape par PR ; aucune publication automatique. Godot reste un chantier séparé.
