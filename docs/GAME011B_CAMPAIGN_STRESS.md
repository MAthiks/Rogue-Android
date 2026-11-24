# GAME-011B — Stress de campagne

## Parcours continus
16 simulations déterministes : 4 classes × 2 orientations de build × 2 seeds. 900 actions maximum par simulation, depuis une nouvelle partie réelle. Le pilote emploie les mouvements huit directions, compétences, soins, événements, progression et équipement. Les choix de points et d'équipement reproduisent les règles de l'inventaire sans cliquer l'UI ; le planificateur utilise la carte complète et privilégie les ennemis visibles, puis le boss et la sortie. Il ne représente pas un joueur humain. Les spécialisations sont acquises seulement au niveau requis.
Résultat : 14 400 tours, 48 transitions d'étage, 527 cycles de sauvegarde/transfert/reprise, aucune assertion violée. Tous les parcours atteignent la limite de 900 actions (étages 2–14), aucune victoire intégrale ni mort organique observée. Le pilote présente des boucles de navigation/choix tactiques ; ne pas conclure à l'équilibrage complet ni à l'impossibilité de gagner.

## Marathon contrôlé
4 classes, 30 étages chacun, 116 transitions réelles, 116 reprises et 4 fins victorieuses. Les fixtures placent le joueur près des escaliers et neutralisent les ennemis après vérification du verrou de boss ; elles isolent la persistance et les transitions, pas la difficulté des combats. Vérification : progression d'un étage et d'un tour, bornes de santé/ressources, positions, absence de collisions, identifiants d'objets uniques, capacités, export portable, reprise exacte, victoire unique au Panthéon et absence de résurrection par autosave.
Total des validations de persistance : 643. Les anciennes suites couvrent également mort, abandon, combat, économie, exploration et migration.

## Limites et invariants
Aucun changement de gameplay ni des sauvegardes dans 011B ; aucun problème moteur démontré par ces tests. Le contrôle Chromium 011A a été renforcé pour comparer des frames stabilisées et dimensions identiques, sans relâcher le hash. La cause exacte du premier écart n'est pas démontrée. CI officielle et mesure Android physique restent nécessaires. Le prochain chantier 011C traite performances, stabilité tactile et cache ; une campagne intégrale humaine reste une exigence de recette V1.0.
