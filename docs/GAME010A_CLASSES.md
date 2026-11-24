# GAME-010A — Classes et spécialisations

Base : CRYPTGRAVE 0.9.1, 7b28f94f7560de562d1f8fba1a79f34b835e81db.

## Doctrines

Au niveau 5 et après sélection de la spécialisation définitive, les bonus historiques (+2 dégâts en offense ; +1 défense et +5 points d'esquive en défense) sont conservés. Chaque spécialisation reçoit un effet contextuel supplémentaire :

| Classe | Offensive | Défensive |
|---|---|---|
| Guerrier | Berserker : +2 dégâts de contact à 50 % de PV ou moins | Sentinelle : +2 réduction sous garde |
| Voleur | Assassin : +2 dégâts de contact sur cible déjà saignante | Duelliste : +5 points d'esquive brute sous garde |
| Rôdeur | Tireur : +2 dégâts à distance à partir de 3 cases | Survivant : +2 réduction à 50 % de PV ou moins |
| Arcaniste | Évocateur : +2 dégâts de compétence à 50 % de mana ou moins après coût | Protecteur : +2 réduction si bouclier positif |

Les bonus de dégâts s'appliquent avant critique et armure. La distance est celle du moteur (Chebyshev). Les plafonds, le rendement décroissant et le plancher de dégâts restent inchangés. Aucun champ, identifiant, point de talent ou coût de compétence supplémentaire. Les sauvegardes historiques gardent leur spécialisation et bénéficient automatiquement des doctrines ; aucune conversion destructive. Les cartes GAME-009 et le pavé restent inchangés ; le dossier et le choix de spécialisation expliquent les effets.

## Validation

- `node tests/game010a.cjs` : huit spécialisations, conditions actives/inactives, branchement aux formules, niveau 5, plafonds, restauration, dossier.
- QA-004 existante : toutes les suites historiques, Chromium mobile, PWA. Le workflow Pages corrigé est conservé ; seul un appel de test moteur est ajouté.
- Recette Android : reprendre une sauvegarde 0.9.1 ; vérifier le dossier et le choix au niveau 5 ; déclencher les effets conditionnels en combat ; fermer et restaurer ; vérifier le déplacement uniquement au pavé et le retour au donjon.

Les coefficients +2/+5 sont des valeurs initiales provisoires. L'équilibrage longue durée relève de GAME-010E. Pas de nouvelle compétence ni de changement d'arbre : GAME-010B est réservé à ce travail.
