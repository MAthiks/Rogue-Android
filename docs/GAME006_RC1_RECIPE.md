# GAME-006 RC1 — recette avant publication

## Référence et garde-fous

- Candidat cumulatif GAME-005A–F + GAME-006A–F, issu de `b3a3b69cf47870b51799d3f860f17f4d4be1bfed`.
- Main de référence : `2918d5ba49c37440f01c26fc5cd41bc4d0938eba` (GAME-004).
- Comparaison initiale : 51 commits en avance, 0 en retard ; 15 fichiers modifiés/ajoutés.
- PR empilées #8 à #19 : ouvertes, fusionnables. CI 005 : 12/12 ; CI 006 : 11/12, dernier Chromium en cours lors de la préparation.
- Ne pas fusionner ni publier avant la CI complète du candidat et la recette Android physique explicitement validée.
- Conserver la clé `rogue-android-game002-v1`, les préférences `rogue-android-display-v1`, le Panthéon séparé `rogue-android-history-v1`. Aucun changement ROGOV.

## Accès au candidat

Le workflow QA-004 produit un artefact `rogue-game-006-rc1` avec index.html, ce document et le SHA du build. Télécharger et décompresser l'artefact depuis Actions. Ouvrir index.html dans un navigateur prenant en charge JavaScript et localStorage. Si Chrome Android refuse les fichiers locaux, servir le dossier extrait depuis un serveur HTTP statique de test (sur un ordinateur du même réseau, par exemple `python -m http.server 8080`, puis ouvrir `http://IP_DU_PC:8080/` sur Android). Ne pas utiliser l'origine de production pour les essais destructifs. Le candidat n'est ni une APK ni une publication Pages.

Pour une recette de migration, utiliser une copie de la sauvegarde officielle dans un profil/origine de test ; conserver l'original. Ne jamais lancer une nouvelle partie à la place d'une sauvegarde à préserver.

## Recette physique — à remplir

| ID | Vérification | Attendu | Statut |
|---|---|---|---|
| R01 | Ouvrir Chrome Android, écran portrait puis paysage | Interface lisible, pas de débordement ni erreur visible | À tester |
| R02 | Créer un personnage ; tester huit directions et attente | Un tour par action, pas de déplacement tactile direct sur carte | À tester |
| R03 | Zoom 75–200 %, taille du pavé, retour et rechargement | Réglages persistants, boutons accessibles | À tester |
| R04 | Inventaire, équipement, déséquipement, talents et style | Stats et emplacements cohérents, sac de 24 | À tester |
| R05 | Consommables, bandages, portes, pièges et événements | Effets et coûts conformes ; choix uniques | À tester |
| R06 | Marchand à l'étage 2, achat, revente, retour au donjon | Solde et stocks exacts ; pas de double achat ; accès bloqué en danger | À tester |
| R07 | Salle spéciale dès étage 4 ; rechargement après choix | Récompense une seule fois, un tour consommé | À tester |
| R08 | Boss étage 6 ; éviter une attaque annoncée | Zones rouges, phase et recharge cohérentes | À tester |
| R09 | Pause, fermeture et réouverture du navigateur | Position, PV, ressources, or et inventaire conservés | À tester |
| R10 | Reprise d'une copie de sauvegarde GAME-004/005 | Personnage et équipement conservés ; champs optionnels compatibles | À tester |
| R11 | Fin de partie (victoire étage 30 ou mort dans une partie de test) | Bilan, sauvegarde active supprimée, historique conservé | À tester |
| R12 | Nouvelle partie après la fin | Panthéon intact, nouveau personnage à l'étage 1 | À tester |

La victoire complète à l'étage 30 peut nécessiter une partie dédiée ; le scénario de CI utilise une fixture, pas une partie physique complète. Indiquer précisément les contrôles réellement réalisés, le modèle Android, la version de Chrome et le SHA testé. Signaler anomalies, captures et reproduction.

## Décision de publication

1. Confirmer CI du dernier chantier et de la PR RC1 (moteur + Chromium mobile).
2. Valider la recette physique, corriger et refaire les tests si nécessaire.
3. Intégrer le candidat cumulatif dans main en préservant son historique, après confirmation explicite ; contrôler le SHA, la CI main et les PR empilées.
4. Publier seulement après validation. Aucun effacement de sauvegarde, aucun changement sur ROGOV.
