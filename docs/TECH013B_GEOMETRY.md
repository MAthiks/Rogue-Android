# TECH-013B — Géométrie et visibilité

Extraction sans modification de los(), reveal() et stepOK() vers src/game/geometry.js. Le moteur les inclut au même emplacement ; index.html doit rester rigoureusement identique à TECH-012.

## Contrat actuel

- W, H : dimensions de la grille.
- S.x, S.y : position du joueur.
- inside(x,y), clear(x,y), idx(x,y) : fonctions de grille fournies par le moteur.
- seen : mémoire mutable des cases découvertes.
- los(x,y) : ligne de vue dans un rayon euclidien de dix cases ; une case murale terminale peut être visible, mais un obstacle intermédiaire masque ce qui se trouve derrière.
- stepOK(x,y,fx,fy) : destination libre et absence de passage en diagonale à travers un angle fermé. La portée d'un déplacement est contrôlée par les appelants.
- reveal() : actualise seen sans effacer les découvertes anciennes.

## Validation

node tools/build-game.cjs --check
node tests/tech013a.cjs
node tests/tech013b.cjs

Le nouveau test exécute le fichier de géométrie dans une portée VM contenant ses seules dépendances déclarées ci-dessus. Il couvre les murs, les diagonales, le rayon de vision, la mémoire et les quatre bords de carte. Les tests historiques restent actifs.

Le partage des variables avec le moteur subsiste à l'exécution. Une API de module autonome avec injection de dépendances explicite, ou un portage Godot, sera une étape distincte.
