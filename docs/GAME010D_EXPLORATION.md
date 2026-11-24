# GAME-010D — Exploration et événements

Base de développement : tête validée de la PR #43 (98d5bf94930779e73a983576b6baa4d84ed049f9), fusionnée sur main sous 29265aaf1d7176ccb200e10a0e26c8485e9dd925.

## Nouveaux événements
| ID | Étage minimum | Choix A | Choix B |
|---|---:|---|---|
| forge | 6 | 20 or contre équipement rare+ | 5 ressources contre bouclier 16 |
| ossuary | 4 | 12 or | 1 bandage contre protection et concentration |
| mirror | 9 | 5 PV contre 15 + étage XP | 8 or contre 8 ressources maximum |
| caravan | 5 | 12 or contre soin et fumigène | 1 bandage contre 16 or |
| reliquary | 12 | 10 PV + 4 ressources contre épique+ | 6 ressources contre protection et détection |

Cinq événements historiques conservés. Les choix sont définitifs, consomment un tour et respectent capacité, ressources, or et interdiction du sacrifice létal. Les quantités affichées peuvent être plafonnées. Les choix ne sont pas des conséquences narratives persistantes entre étages : ils modifient immédiatement la partie, et la résolution est enregistrée dans la feature de l'étage.

## Rencontres rares
La Veuve des cryptes (étage 7+, tracker vampirique), le Gardien des cendres (10+, guardian cuirassé), l'Aiguille noire (12+, archer furieux). Les trois rares historiques restent accessibles. Pas de second rare par étage, pas de nouveau boss ; chance existante de 18 % conditionnelle à la présence d'un candidat. Récompenses et multiplicateur historiques. Les nouveaux rares utilisent les sprites historiques de leur rôle avec leur couleur propre.

## Salles
Sanctuaire du serment (8+) : 2 bandages contre 24 PV/8 ressources maximum, ou 15 or contre bouclier 20.
Archives scellées (8+, secret) : 20 + 2 × étage XP, ou deux parchemins.
Trésor des disparus (12+, secret) : 25 + 2 × étage or, ou équipement épique+.
Les cinq salles historiques restent présentes. Huit motifs d'objets 10×10 dédiés s'ajoutent à l'art existant (46 motifs).

## Seconde chambre secrète
À partir de l'étage 8, tentative à 45 % lorsque la première chambre existe, à partir d'un flux déterministe indépendant. Une seconde chambre 3×3 est creusée seulement si son périmètre est intégralement fermé et une case d'accès originale est disponible, sans chevauchement ni changement de la route principale. Maximum deux chambres, chacune pouvant devenir une salle spéciale selon la probabilité historique de 65 %. Aucun changement de la disposition des salles principales, du schéma de sauvegarde ou du transfert ; les étages sauvegardés restent intacts. Le catalogue de génération des événements/salles peut changer sur les futurs étages, volontairement.

## Validation
- Suite 010D : 600 seeds, 218 secondes chambres, 924 salles spéciales, 10 événements, 6 rares, 8 salles, 16 choix, accessibilité avant/après, absence de chevauchement, limites, sauvegarde/transfert.
- Suites 005E, 006E, 007E : attentes de taille des catalogues actualisées uniquement, autres assertions conservées.
- Suites 007D et 010C : réussies en environnement JavaScript simulé.
- Android physique : inspecter les nouveaux motifs, menus et restrictions, révéler puis ouvrir deux passages avec les commandes existantes, vérifier une rencontre rare et reprendre/transférer une partie. Vérifier la fluidité et l'équilibre des récompenses en GAME-010E.
- Aucun changement des contrôles, des clés ou du workflow de publication Pages. Pas de version candidate ni de déploiement à ce stade.
