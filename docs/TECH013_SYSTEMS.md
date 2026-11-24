# TECH-013C-E — Extraction des systèmes

## État de l'architecture

Après TECH-013A (assemblage) et TECH-013B (géométrie), le moteur est séparé en 23 unités de source. Le gabarit engine.template.js conserve les constantes et l'état partagés, le démarrage de partie, les commandes et les marqueurs d'inclusion. Chaque unité est insérée exactement à sa position historique : aucun changement d'ordre des déclarations ni du chargement.

| Fichier dans src/game/ | Responsabilité |
| --- | --- |
| dungeon.js | Génération de plan déterministe |
| geometry.js | Visibilité, mémoire, déplacement |
| persistence.js | Sauvegarde, reprise et migration |
| weapons.js | Catalogue d'équipement de base, profils d'armes, ciblage |
| talents.js | Talents avancés, spécialisations et synergies |
| consumables.js | Sacoche et utilisation |
| exploration.js | Événements, rencontres et secrets |
| combat-formulas.js | Doctrines, dégâts, probabilités, régénération |
| items.js | Affixes, ensembles, raretés et création d'objets |
| history-transfer.js | Historique, fin de partie et transferts |
| title-screen.js | Portraits de classe, récupération et menu titre |
| bestiary-bosses.js | Espèces, pouvoirs et boss étendus |
| economy.js | Marchands et prix |
| special-rooms.js | Salles spéciales |
| floor-exploration.js | Génération d'étage, décoration et interactions |
| object-art.js | Sprites d'objets et d'éléments |
| biomes.js | Biomes, terrain et effets |
| tile-renderer.js | Tuiles et atlas |
| progression.js | XP, niveaux, équilibrage et provisions |
| combat-turns.js | Boss historiques, combat, IA, tours, commandes |
| hud.js | Jauges, icônes de compétences et retours de combat |
| sprite-renderer.js | Sprites d'acteurs et rendu de la carte |
| inventory-ui.js | Fiche, équipement, talents et pause |

Certaines unités mélangent encore logique et présentation : ces frontières sont des regroupements de source, non des API autonomes. Les dépendances de portée globale restent intentionnellement inchangées. Aucun ES module, import réseau, outil tiers, changement du format de sauvegarde ou portage Godot n'est introduit.

## Contrats à préserver

- Les outils de packaging et les suites historiques lisent toujours index.html, généré et versionné.
- Le contrôle TECH-013A compare l'artefact complet avec la référence TECH-012 ; TECH-013B teste la géométrie en contexte isolé.
- Le test TECH-013C-E vérifie la présence de chaque unité, sa syntaxe, la synchronisation de l'artefact et des contrats ciblés du combat, de la progression, de l'économie et du transfert.
- Une modification d'index.html sans modification correspondante des sources est interdite par le contrôle d'assemblage.

## Développement

Modifier src/game/ ou src/styles/, puis exécuter :

```sh
node tools/build-game.cjs --write
node tools/build-game.cjs --check
node tests/tech013a.cjs
node tests/tech013b.cjs
node tests/tech013systems.cjs
```

Les tests de référence sans changement fonctionnel devront être revus explicitement lors d'un futur chantier de gameplay, sans supprimer les assertions historiques ni le contrôle de synchronisation.

## Suite

TECH-013F : revue des dépendances, validation CI et recette Android physique. Pour obtenir des modules réellement indépendants, introduire ensuite des interfaces explicites et des tests d'injection de dépendances par système, en PR séparées. Le portage Godot ne fait pas partie de cette extraction.
