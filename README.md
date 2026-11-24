# CRYPTGRAVE

Roguelike tactique dark fantasy en pixel art, au tour par tour, conçu pour Android.

Ancien nom de développement : ROGUE. Le dépôt `Rogue-Android`, les chemins PWA et les clés de stockage historiques restent inchangés afin de préserver les sauvegardes. La disponibilité de la marque reste à vérifier avant une publication commerciale.

Voir [la recette PWA](docs/GAME008C_PWA.md) pour construire et déployer le jeu.

## Version en préparation

**1.0.0 RC1** — non publiée. Voir [la recette et le packaging V1](docs/GAME011D_RELEASE_PACKAGING.md). La version publique reste 0.10.0 jusqu’à validation physique et publication explicite.

## Documentation du code

[Guide de lecture du moteur (TECH-012)](docs/TECH012_CODE_GUIDE.md) : architecture, glossaire et conventions de programmation.


## Sources modulaires (TECH-013A)

Modifier les sources dans `src/`, puis régénérer le fichier autonome avec `node tools/build-game.cjs --write`. Vérifier sa synchronisation avec `node tools/build-game.cjs --check`. Voir [le guide d'assemblage](docs/TECH013A_SOURCE_LAYOUT.md).

[Carte des systèmes extraits (TECH-013C-E)](docs/TECH013_SYSTEMS.md) : fichiers, dépendances et tests.
