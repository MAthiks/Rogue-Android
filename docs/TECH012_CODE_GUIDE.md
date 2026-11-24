# CRYPTGRAVE — Guide de lecture du moteur (TECH-012)

Ce guide décrit le moteur HTML/JavaScript de CRYPTGRAVE 1.0.0 RC1. Les regroupements ci-dessous sont logiques : ils ne correspondent pas encore à des modules séparés. Aucun changement de gameplay ni de format de sauvegarde n'est nécessaire pour les documenter.

## Où commencer

- `index.html` : interface, CSS, données de jeu, moteur JavaScript et rendu Canvas. Le premier script s'exécute dans une fonction isolée (IIFE). Le second enregistre le service worker si le navigateur le permet.
- `sw.js` : service worker de la PWA.
- `manifest.webmanifest` : configuration d'installation de la PWA.
- `android/app/build.gradle` : configuration de construction Android.
- `release.json` : métadonnées de version.
- `tests/` et `.github/workflows/qa004.yml` : tests et validation automatisée.
- `docs/GAME011D_RELEASE_PACKAGING.md` : préparation de la publication.

## Parcours d'une partie

1. `startMenu()` affiche le menu.
2. `newGame(id)` initialise le personnage ; `restore()` reprend une sauvegarde valide.
3. `generate()` construit l'étage. `buildDungeon()` crée le plan, `decorateDungeon()` les éléments interactifs, `buildTerrain()` le terrain du biome.
4. `move(dx,dy)` reçoit une direction. Selon le contexte, le moteur cible, interagit, attaque ou se déplace. `activate(i)` sélectionne ou applique une compétence.
5. `finish()` clôt un tour consommé : phase ennemie, états et recharges, régénération, visibilité, affichage, sauvegarde.
6. `endRun(outcome)` clôt définitivement une partie : victoire, mort ou abandon. `recordRun()` conserve le bilan.

Toutes les interactions ne consomment pas nécessairement un tour. Il faut examiner les appels à `finish()` avant toute modification.

## Carte des systèmes

| Système | Fonctions à rechercher dans index.html |
| --- | --- |
| Affichage et commandes | applyPrefs, resizeMap, update, render, updateHud |
| Sauvegarde et migration | save, restore, migrate, parseTransfer, importTransfer |
| Donjon | buildDungeon, generate, decorateDungeon, buildTerrain |
| Visibilité et déplacement | los, reveal, stepOK, move |
| Combat | outgoingDamage, incomingDamage, hit, activate, useDirection |
| IA | tacticalTurn, coordinatedAction, prepareCoordinatedIntent, enemyPhase |
| Progression et équipement | gainXP, createGear, bonus, setBonus, inventory |
| Exploration et commerce | buildExploration, buildSpecialRooms, buildMerchant, buyMerchant, sellMerchant |
| Fin et historique | die, endRun, recordRun |

## Glossaire

| Terme du code | Signification |
| --- | --- |
| S | État du personnage et de la partie |
| W, H, T | Largeur et hauteur de la grille, taille native d'une case en pixels |
| map | Grille linéaire : 0 = case libre dans le test clear ; 1 = mur dans le plan initial |
| seen | Cases découvertes, distinctes des cases actuellement visibles |
| monsters | Ennemis de l'étage |
| loot | Butin présent au sol |
| features | Éléments interactifs |
| terrain | Particularités du sol |
| stairs | Position des escaliers |
| selected | Ciblage en attente |
| idx(x,y) | Index de grille : y × W + x |
| dx, dy | Variation de coordonnées |
| hp, maxHp | Points de vie actuels et maximaux |
| res, maxRes | Ressource de classe actuelle et maximale |
| xp, ap | Expérience, points de caractéristiques |
| cool | Recharges des compétences en tours |
| equip, bag, pouch | Équipement porté, sac, sacoche |
| seed | Graine d'un générateur pseudo-aléatoire |
| LOS | Ligne de vue |
| PRNG | Générateur pseudo-aléatoire |
| HUD | Informations affichées pendant le jeu |
| PWA | Application web installable |

## Conventions pour les nouvelles contributions

- Identifiants explicites en anglais ; commentaires explicatifs en français.
- Documenter le rôle, les entrées, la sortie et les effets de bord des fonctions complexes.
- Expliquer les invariants et les raisons d'une règle plutôt que paraphraser chaque instruction.
- Indentation de deux espaces pour le JavaScript nouveau ou reformatté ; préférer des blocs lisibles aux longues lignes compactes.
- Conserver les identifiants historiques et les clés de stockage. Ne pas renommer les données persistées sans migration dédiée.
- Séparer les changements de présentation du code, les modifications fonctionnelles et les migrations d'architecture.
- Ne pas modifier les tests pour masquer une régression.
- Toute PR doit être relue et passer les contrôles CI applicables avant fusion ; aucune publication automatique n'est décidée par ce chantier.
- Lors du portage Godot, documenter explicitement les équivalences des systèmes et vérifier les invariants de gameplay.

## Limites

Ce guide ne constitue pas encore un inventaire exhaustif des fonctions. Le reformatage complet du fichier monolithique et la séparation en modules sont des travaux distincts. Les commentaires ne constituent pas une preuve de non-régression ; la CI reste nécessaire.

## Lecture du moteur graphique

Le rendu ne doit pas modifier les règles du jeu. Il traduit l'état du moteur en opérations de dessin sur le Canvas, ou en fragments SVG pour certaines interfaces.

- `render()` : centre la caméra sur le joueur, dessine les cases connues, les éléments du terrain, les intentions ennemies visibles, les escaliers, le butin, les ennemis, puis le joueur.
- `seen` mémorise les cases découvertes ; `los()` détermine celles qui sont actuellement visibles. Ne pas confondre ces deux notions.
- `playerSprite()`, `enemySprite()`, `bossSprite()` et `objectSprite()` : produisent des rectangles au format [couleur, x, y, largeur, hauteur], exprimés en pixels locaux.
- `tileVariant()` : choisit une variante stable selon les coordonnées, sans intervenir dans le hasard du jeu.
- `knownTileEdges()` : ne révèle que les frontières dont le voisin est découvert.
- `drawBiomeTile()` : utilise un atlas de 256 × 256 pixels pour le biome courant, avec un chemin de repli par rectangles.
- `renderCellIndex()` : construit des index temporaires par case, reconstruits lors du rendu.
- `updateHud()` et `setHudMarkup()` : actualisent les jauges et évitent les écritures DOM redondantes.
- `combatFx()` : produit un retour visuel temporaire ; l'animation n'est pas une mécanique de combat.

### Invariants à préserver lors d'un portage vers Godot

Conserver les dimensions logiques de la grille, les règles de diagonale et de visibilité, l'ordre de résolution des tours et les paramètres de génération. Les couches graphiques, le zoom et les optimisations de rendu ne doivent pas modifier ces règles. Les formats de sauvegarde et leur éventuelle migration doivent faire l'objet d'un chantier indépendant.

Le portage pourra remplacer le Canvas et le DOM par des nœuds Godot adaptés, mais aucune équivalence de comportement n'est considérée comme acquise sans tests.

## Sauvegardes, historique et sécurité

Le moteur conserve trois ensembles de données distincts dans localStorage : la partie active (KEY), l'historique (HISTORY_KEY) et les préférences d'affichage (PREF). Il faut conserver les clés historiques pour permettre la reprise des parties existantes.

- save() enregistre une partie active ; restore() charge les données et appelle migrate() pour compléter les champs anciens.
- endRun() termine définitivement une partie dans le fonctionnement normal du jeu et retire la sauvegarde active ; recordRun() ajoute le résultat à l'historique.
- recoveryMenu() permet de copier une sauvegarde illisible sans la supprimer automatiquement.
- exportTransfer() assemble les trois ensembles dans un paquet JSON versionné.
- parseTransfer() limite la taille du texte, vérifie l'arbre des données et les contraintes métier avant import.
- transferTree() impose des bornes sur la profondeur, le nombre de valeurs, les chaînes et les propriétés ; certains noms de propriétés sont interdits.
- importTransfer() tente de restaurer les anciennes valeurs si une écriture échoue. Ce mécanisme n'est pas une transaction atomique garantie par le navigateur.

Ces contrôles ne constituent ni une signature cryptographique, ni une protection absolue contre la modification manuelle des sauvegardes. Le stockage est local à l'origine web ou à l'application ; le transfert manuel peut restaurer un état antérieur. Ne pas publier de sauvegarde personnelle. Un audit de sécurité et des tests de données malformées restent distincts du chantier de documentation.

## Interfaces et actions

Les fonctions classCard(), characterDossier(), equipmentRack() et bagCards() génèrent des fragments HTML. inventory() assemble les sections et attache les actions de progression, de spécialisation et d'équipement. Les fonctions de présentation ne doivent pas attribuer de bonus ni consommer de tour. Les actions doivent conserver leurs vérifications de disponibilité, de capacité et de prérequis.

Le pavé directionnel appelle move() ; les boutons de compétences appellent activate(). Le menu de pause ne doit pas faire avancer la simulation. La sauvegarde lors du changement de visibilité de la page ne doit pas réécrire une partie déjà terminée.

## Architecture modulaire envisagée (non implémentée)

| Module logique proposé | Responsabilité | Dépendances à isoler |
| --- | --- | --- |
| state | État et invariants de la partie | Schéma des données |
| dungeon | Génération et décoration des étages | Graine, dimensions et catalogues |
| geometry | Coordonnées, déplacements et visibilité | Grille et mémoire |
| combat | Dégâts, états, compétences, résolution des tours | État, équipement, talents |
| ai | Perception, pathfinding, intentions ennemies | Géométrie et acteurs |
| progression | Niveaux, talents, spécialisations | État du personnage |
| items | Équipement, consommables, économie | Catalogues et état |
| persistence | Sauvegarde, migration, historique, transfert | Stockage et schéma |
| presentation | Sprites, caméra, HUD et menus | Lecture de l'état, commandes explicites |
| platform | Intégration PWA et Android | API de la plateforme |

Ce tableau est une proposition de séparation des responsabilités, pas la description de fichiers existants. Avant toute extraction, identifier les accès à l'état partagé, conserver la séquence d'initialisation et exécuter les tests historiques. Les tests actuels extraient parfois le JavaScript depuis index.html ; une modularisation doit adapter leur méthode de chargement sans réduire les assertions. La migration vers Godot devra rester indépendante d'un simple changement de présentation.

## Bilan du chantier TECH-012

Référence de comparaison : ce4fa6fab83bc6f19df416f58581c974de02c6de (CRYPTGRAVE 1.0.0 RC1).

Au commit c496283f1907d45f000af4ff835a276a8a8d0e85, le fichier index.html comporte 4 317 lignes contre 1 893 au départ, et 198 nouveaux commentaires français balisés TECH-012A ou TECH-012C. Le CSS a été développé en règles multiligne ; les fonctions compactes et les principaux flux du moteur ont été aérés. Les longues chaînes HTML/SVG, les catalogues et certaines expressions restent volontairement regroupés lorsque leur découpage risque de changer leur contenu ou de perturber les tests.

### Vérifications et limites

- Comparaison textuelle avec le fichier de référence après suppression des seuls nouveaux commentaires balisés et des espaces : aucune différence de caractères non blancs détectée. Ce contrôle ne prouve pas à lui seul une équivalence sémantique : JavaScript, HTML et CSS peuvent donner un sens aux espaces.
- Les suites historiques de tests restent inchangées. Certains tests isolent les fonctions en découpant le script selon leurs signatures : les commentaires de bloc évitent notamment qu'une fin de ligne commentée absorbe le délimiteur ajouté par ces tests.
- Exiger la réussite de QA-004 (moteur, Chromium mobile, PWA) et Android APK sur le dernier commit de la PR avant fusion. Vérifier les retours de rendu et de commandes sur smartphone avant publication.
- La séparation en modules, le renommage des variables historiques, la suppression du code ancien et le portage Godot ne sont pas inclus dans cette PR. Les traiter dans des chantiers indépendants, avec des tests ciblés.

La documentation doit évoluer avec le moteur. Lors d'une modification fonctionnelle, mettre à jour les commentaires et le guide concernés dans la même PR.
