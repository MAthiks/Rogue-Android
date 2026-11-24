# TECH-014 — Préparation du portage Godot

Référence immuable : `952af81a872f3e0e584c251b54d2206eacaed4ec` (1.0.0 RC1).
Version publique : 0.10.0. Ne pas publier, ne pas modifier ROGOV.
Le banc Node ne fait pas partie de la PWA ni de l'APK.

## A — Frontière de simulation

Le fichier historique est inchangé. `tools/godot/reference.cjs` charge son premier script dans un contexte VM par session, avec stockage en mémoire et DOM minimal. L'adaptateur reçoit une graine et expose les commandes et des copies JSON, jamais les références mutables du moteur. Le moteur conserve ses variables de fermeture : ceci est une frontière de test, pas encore une extraction complète des dépendances de production.

| État | Propriété future Godot |
| --- | --- |
| S | RunState : personnage, progression, équipement, ressources, tour |
| map, terrain | FloorState : grille logique 48 × 32 |
| seen | visibilité mémorisée (distincte de la visibilité actuelle) |
| monsters, loot, stairs, features | entités et interactions d'étage |
| selected, mode, messages | contexte de commande, journal et présentation |
| localStorage, DOM, canvas | adaptateurs de plateforme, jamais des règles métier |

Les systèmes restent couplés implicitement via S et la carte : persistence, weapons, talents, consumables, exploration, combat-formulas, items, history-transfer, bestiary-bosses, economy, special-rooms, floor-exploration, biomes, progression et combat-turns. Geometry et dungeon constituent les premières briques à transcrire. HUD, title-screen, object-art, tile-renderer, sprite-renderer et inventory-ui sont à remplacer côté présentation. Pour isoler chaque règle, extraire progressivement des fonctions recevant explicitement l'état et le RNG, avec comparaison contre l'oracle.

## B — Reproductibilité

Le banc injecte le LCG historique des tests : state = (1664525 × state + 1013904223) modulo 2^32 ; résultat = state / 2^32. Les graines sont des uint32. Vecteur depuis 1 : 1015568748, 1586005467. Le nombre de tirages est enregistré. Les générateurs internes (notamment celui de buildDungeon, distinct du LCG) doivent être portés séparément, en reproduisant Math.imul, >>>, débordements, troncatures et ordre des appels. Le RNG de production JavaScript reste Math.random ; les anciennes sauvegardes n'acquièrent aucun champ nouveau. Une sauvegarde historique ne garantit donc pas la reproduction d'un flux aléatoire futur. Un nouveau format Godot pourra mémoriser les flux, avec import distinct des anciennes sauvegardes.

## C — Données d'entrée

Depuis la racine :
```sh
node tools/godot/reference.cjs catalog index.html catalog.json
node tools/godot/reference.cjs reference index.html reference.json
node tests/tech014.cjs
```

Le JSON de catalogue (cryptgrave-catalog-v1) contient les quatre classes, compétences, attributs, équipement, raretés, armes, doctrines, talents, consommables, événements, bestiaire, boss étendus, biomes, économie, salles et paramètres exposés. Les valeurs d'affixes sont évaluées aux quatre grades réellement générés (étages 1 à 30). Les fonctions, règles de combat, historiques de boss et paramètres enfouis dans les fonctions ne sont pas remplacés par ce catalogue. Les couleurs sources servent de métadonnées, pas de contraintes artistiques.

Le pack cryptgrave-reference-v1 contient le catalogue, 12 plans complets (étages 1, 6, 15, 30 ; graines 0, 1, 4294967295), et quatre campagnes (graines distinctes fixes) avec commandes et points de contrôle. Les SHA-256 d'état couvrent la sérialisation JSON du moteur de référence ; pour la comparaison inter-langage, normaliser l'ordre des clés, nombres et chaînes, ou comparer les champs structurellement. Les hashes JS ne constituent pas une spécification de sérialisation GDScript.

## D/E — Recette automatisée

Le test lit index.html du commit immuable via git show et compare le candidat octet pour octet ; vérifie les vecteurs RNG, l'isolation, le round-trip de sauvegarde, les catalogues, les plans, les traces et la relecture des commandes. Les quatre campagnes sont des essais bornés à 400 commandes, avec une politique de navigation qui connaît le plan et n'optimise pas tous les talents, équipements, achats et interactions. Mort, victoire, blocage ou budget sont des résultats distincts ; aucune victoire à l'étage 30 n'est exigée ni supposée. Les tests GAME-010E et GAME-011B restent obligatoires ; les marathons contrôlés ne sont pas des victoires organiques.

## F — Cahier de portage Godot 4.x

Projet indépendant à créer après validation de cette préparation ; GDScript typé, commentaires français, Android en priorité, PC pour le développement. Installer Godot 4 stable (édition standard), Git et, pour exporter vers Android, JDK et SDK compatibles avec la version Godot choisie. Choisir et épingler précisément la version du moteur et des modèles d'export au lancement du dépôt. Aucun dépôt Godot n'est créé ici.

Structure proposée :
```
project.godot
simulation/
  run_state.gd
  floor_state.gd
  command.gd
  game_engine.gd
  rng32.gd
  dungeon_generator.gd
  combat.gd
  enemy_ai.gd
  progression.gd
  inventory.gd
data/
  catalog.json
presentation/
  dungeon_view.tscn
  dungeon_view.gd
  hud.tscn
  touch_pad.tscn
platform/
  save_repository.gd
tests/
  reference_runner.gd
  fixtures/
```

### Contrats techniques
- Simulation en RefCounted/objets de données typés, indépendante du SceneTree et du rendu. Une commande valide déclenche le tour selon les règles historiques ; une commande de ciblage seule ou un angle interdit ne doit pas en créer.
- Vector2i pour la logique de grille ; index = y × 48 + x. Distance de Chebyshev, diagonales interdites si les deux appuis orthogonaux ne sont pas libres. Conserver portée, ordre des ennemis, résolution des effets et verrouillage des escaliers.
- TileMapLayer pour sol, murs et éléments ; acteurs séparés en Node2D/Sprite2D ; taille visuelle 32 × 32, filtrage nearest et caméra adaptable. Conserver la grille 48 × 32 et le brouillard de guerre. PointLight2D et animations sont des effets de présentation : ils ne tirent jamais dans le RNG de simulation et ne déclenchent aucun tour.
- Interface Control, pavé tactile à huit directions, attente, compétences et inventaire. Entrées clavier PC pour les tests de développement ; pas de déplacement par toucher de la carte sur Android. Pas de service réseau requis.
- Sauvegarde dans user://, écriture atomique, validation de schéma et reprise ; préserver identifiants, bornes, fin définitive et historique. Importer le format historique cryptgrave-transfer-v1 par action explicite, sans modifier l'original ni promettre accès au localStorage du navigateur.
- Export Android signé uniquement sur autorisation de publication ; builds de développement séparés, test physique de chaque orientation et reprise hors ligne.

### Ordre de réalisation et critères
1. GODOT-001 : squelette PC, test headless et import de données. Critère : catalogue lu sans dépendance réseau.
2. GODOT-002 : RNG et génération de carte. Critère : 12 plans identiques champ à champ.
3. GODOT-003 : commandes, combat, IA et progression. Critère : traces de référence comparables, plus tests ciblés du moteur historique.
4. GODOT-004 : inventaire, économie, exploration, sauvegarde et historique. Critère : import/round-trip et règles terminales.
5. GODOT-005 : TileMapLayer, brouillard, sprites, HUD et pavé. Critère : parité des commandes avant polish.
6. GODOT-006 : éclairage, animations, mesure des performances et export Android. Critère : CI headless et recette physique, hors ligne et compatibilité du format de transfert.

Une différence de règle devra être documentée et validée explicitement. Aucun changement de gameplay dans TECH-014 ; le JavaScript reste l'oracle pendant la migration.

## Addendum TECH-014A/B — Contrats sans dépendance navigateur

`tools/godot/simulation-contract.cjs` fournit une deuxième implémentation de référence pour préparer la traduction, sans modifier le moteur distribué. Géométrie : dimensions et grille explicites, position fournie à chaque requête, mémoire révélée retournée par copie. Combat : personnage fourni à la construction, ports explicites pour bonus d'équipement, talents, famille d'arme, posture et synergies. RNG : LCG32 et Mulberry32, graines uint32, compteurs et état distincts. Ces ports ne sont pas encore les implémentations complètes d'équipement, d'IA ou de sauvegarde.

`node tests/tech014-contracts.cjs systems.json` compare ces fonctions aux sources immuables du checkpoint, pas à une copie du candidat. Couverture prévue : 120 donjons (30 étages × 4 graines), visibilité de chaque case et déplacements dans les huit directions, 600 configurations de combat × 3 profils, 512 tirages comparés. Les données exportées incluent quatre vecteurs par famille RNG, quatre cas de géométrie et 72 configurations de combat avec entrées et sorties numériques. Les valeurs de combat utilisent des ports synthétiques déclarés, non des personnages issus de campagnes réelles. Les fixtures seront produites par la CI dans l'artefact cryptgrave-godot-reference.

Pour GDScript, reproduire Math.round (arrondi vers +infini à mi-entier), les décalages non signés et le modulo 2^32 ; le produit Mulberry32 doit conserver les 32 bits bas. Comparer les champs JSON et non les représentations textuelles. Ne pas utiliser le RNG Godot natif à la place des algorithmes historiques lors des tests de parité.

## Addendum — Progression, équipement, économie, talents et migration

Le module `tools/godot/domain-contract.cjs` expose la progression XP, le plafonnement niveau 30, les récompenses et statistiques des ennemis, la génération d'objets à RNG explicite, les bonus d'ensembles, les prix et stocks marchands, les achats de talents avancés et de synergies ainsi que leurs effets, et la migration de l'état joueur historique. Les catalogues sont injectés ; les affixes utilisent leurs valeurs par grade. Les fonctions qui modifient le joueur le reçoivent explicitement et gainXP retourne les messages au lieu de les envoyer au DOM. La migration produit une copie, sans altérer l'entrée. Les transactions marchandes, les menus, le stockage physique et la validation complète d'un fichier de sauvegarde ne font pas partie de ce module.

`node tests/tech014-domain.cjs domain.json` compare les résultats aux sources du checkpoint et exporte les entrées/sorties dans la CI. Vérifier notamment l'ordre d'itération des emplacements, les tirages conditionnels, le choix des affixes sans remise, les objets uniques, les identifiants de sauvegarde, les prérequis de talents et la limite de niveau. Les JSON doivent être utilisés avec leurs catalogues de même version.
