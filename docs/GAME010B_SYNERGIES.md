# GAME-010B — Synergies de combat

Base : GAME-010A fusionné, f20503330052f5f27ff9083ea1fe3b6c9d8822d0.

16 talents passifs additionnels, 4 par classe, 2 accessibles par spécialisation. Au niveau 10, le talent fondamental avancé (adv_vigor ou adv_resolve) est requis ; au niveau 18, le premier talent de synergie est requis. 1 point par talent, pas de remboursement ni de changement de spécialisation. Les 44 talents historiques restent intacts (total 60).

| Spécialisation | Niveau 10 | Niveau 18 |
|---|---|---|
| Berserker | Frappe +3 sur cible exposée | Brise-garde : exposition 6 tours |
| Sentinelle | Attaque de contact normale +2 sous garde | Garde/Bastion +1 tour |
| Assassin | Estoc +3 sous bonus de puissance | Saignement 5 tours |
| Duelliste | Estoc/Exécution +2 sous garde | Esquive/Disparition +1 tour de garde |
| Tireur | Tir/Tir perforant +3 sous bonus de puissance (première cible) | +2 dégâts sur cibles secondaires du Tir perforant |
| Survivant | Soin/Second souffle +3 PV à mi-vie ou moins | +2 ressource par soin |
| Évocateur | Éclair/Décharge +2 sous barrière | Décharge étourdit 2 tours hors boss |
| Protecteur | Soin +3 PV sous barrière | Barrière/Égide +3 absorption si mana à mi-réserve ou moins après coût |

Les dégâts supplémentaires s'appliquent avant critique/armure. Focus, Visée et consommables de puissance utilisent le même état boost existant : tout boost actif déclenche les talents correspondants. Les durées indiquées incluent la phase ennemie de l'action ; la réapplication ne réduit plus un statut existant. Les soins gardent leur limite par étage. Les ressources sont plafonnées. Aucun nouveau contrôle, compétence active, champ de sauvegarde ou format de transfert. Les nouveaux identifiants syn_* sont stockés dans le dictionnaire nodes existant. Une sauvegarde antérieure n'acquiert pas automatiquement les nouveaux talents.

## Tests et recette

- node tests/game010b.cjs : 8 chemins, 16 acquisitions, prérequis, coût, branches exclusives, effets, activation réelle des protections/soins, sauvegarde et validation du transfert.
- QA-004 : ajouter uniquement la suite moteur, conserver les workflows de publication et APK.
- Android : vérifier l'affichage des deux branches, l'achat et les prérequis, une combinaison offensive et défensive, la persistance après reprise, le transfert et le pavé 8 directions. 
- Équilibrage des coefficients et du budget de talents à poursuivre dans GAME-010E. Aucun déploiement Pages à cette étape.
