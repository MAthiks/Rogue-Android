# GAME-009C — Fiche du personnage

Dossier médiéval : portrait original de GAME-009B, sprite 16×16 avec équipement réel, nom de classe, spécialisation, niveau, étage, or, trois jauges PV/ressource/XP (MAX au niveau 30). Six valeurs de combat issues des fonctions existantes : bonus d'attaque/défense, critique/esquive effectifs, régénération et éliminations. Six cartes d'attributs et cinq lignes de compétences avec icônes, rang, verrouillage et niveau requis.

Aucun changement des règles ni des handlers d'investissement, équipement, spécialisation, styles, talents passifs/avancés ou barre de compétences. L'équipement et le sac restent accessibles depuis la même fiche. Pas de nouvelle clé, dépendance ou ressource externe. Comparaison des scripts : tout le moteur en dehors de la présentation inventory/dossier est inchangé.

Tests simulés : quatre classes, 24 cartes d'attributs, 20 cartes de compétences, jauges, plafonds, spécialisation et absence de mutation du stockage. Chromium : trois résolutions, rendu et valeurs, captures, investissement réel constitution et rang de compétence sans avancer le tour. CI et recette physique requises. Dépend de PR #35.
