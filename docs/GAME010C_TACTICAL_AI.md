# GAME-010C — Intelligence artificielle tactique

Base : GAME-010B fusionné, e5c37a0277f2993fcce54523390f76a62d0f327b.

Le moteur conserve les sept rôles historiques, les seize espèces des biomes, les pouvoirs annoncés, les huit boss, leur progression, les statistiques et les tables de butin. Une couche de coordination s'applique aux déplacements autorisés de l'IA historique. Pas d'action supplémentaire ni de nouvelle donnée persistante.

## Familles (23 types)
- Pression : wanderer, brute, slag, mycelium, riftspawn. Poursuite historique, respect des issues réservées.
- Contournement : ambusher, tracker, wraith, cavefang, cinder, frostfang, voidstalker. Quand un allié occupe le front, préférer une case latérale non plus éloignée du joueur que le déplacement initial.
- Distance : archer, spitter, runecaster, oracle, icecaller. Chercher une ligne de tir dégagée par un déplacement légal si un allié bloque le tir.
- Escorte : guardian, boneguard, sentinel, templar. Près d'un boss ou tireur, éviter d'obstruer son axe lorsque le déplacement alternatif reste dans la formation.
- Retraite : coward, sporeling. En dessous ou à un tiers de vie, privilégier si possible une retraite hors ligne de vue.

Ces choix nécessitent la vision directe et un allié proche. L'IA de mémoire historique reste le repli. La réservation d'une issue peut toutefois empêcher un déplacement hors vision qui fermerait la dernière échappatoire d'une attaque annoncée.

## Boss
En phase 2 ou 3, des cases supplémentaires sont proposées autour de la cible : Kharok (axes distants), Syrha (diagonale), Veyl (croix), Morvath (diagonale opposée), Mykora (axe vertical), Asterion (axe horizontal distant), Iskarn (diagonales), Nox (diagonales mixtes). Elles restent soumises aux obstacles, à l'accessibilité et à la réserve d'une issue. Les patterns initiaux et puissances sont conservés ; le nombre effectif de cases dépend de la géométrie et des intentions concurrentes.

La couche de coordination retire au besoin une case du nouveau motif pour préserver au moins une case adjacente libre non menacée par les intentions enregistrées. Si aucune case n'est disponible avant la nouvelle annonce, celle-ci est annulée et le délai de récupération passe à 1. Un déplacement ne ferme pas la dernière issue disponible d'une intention existante. Cela ne garantit pas l'absence de dégâts d'attaques ordinaires, de pièges ou de terrain. Les intentions déjà enregistrées dans les anciennes sauvegardes sont relâchées selon les règles historiques ; aucune migration ni retouche rétroactive.

## Validation
- tests/game010c.cjs : 23 types, 5 familles, 8 boss, lignes de tir, contournement, absence de poursuite cachée par la nouvelle couche, conservation des issues, annulation, sauvegarde et interruption, 30 cartes / 3780 tours simulés.
- Suites 006B, 006C, 010A, 010B : exécutées en environnement JavaScript simulé.
- Recette Android : observer une formation avec tireur, éviter une attaque annoncée de boss en phase avancée, interrompre une annonce, reprendre une partie avec intention active. Contrôler la fluidité sur appareil réel. 
- GAME-010E : ajuster la difficulté et la fréquence effective des motifs, mesurer les performances à long terme.
- Aucun changement de direction artistique, format de sauvegarde, pavé, version ou publication Pages.
