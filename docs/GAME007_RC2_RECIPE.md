# GAME-007 RC2 — recette graphique et Android avant publication

## Périmètre et règles de publication

Candidat cumulatif de GAME-005/006 et des six lots graphiques GAME-007A–F.
Base graphique vérifiée : 651d85adff2b379b900d02d25d25a158f79cbff2.
RC1 de référence : 3344817bc9e6d4c7d7ea8acf3c7af118fe2c0e60.
Main de référence : 2918d5ba49c37440f01c26fc5cd41bc4d0938eba.
Aucune fusion ni publication sans CI complète, recette physique RC1 et RC2 validée explicitement, et revue graphique.
Les PR #8–26 restent ouvertes ; la branche RC2 est cumulative, ne pas fusionner les PR en parallèle.
Ne jamais modifier ROGOV. Conserver les clés rogue-android-game002-v1, rogue-android-display-v1, rogue-android-history-v1.

## Paquet de recette (navigateur Android, pas APK)

Le job rc2-package publie rogue-game-007-rc2 uniquement si engine et chromium-mobile réussissent.
Télécharger et extraire l'artefact GitHub Actions. Contenu : index.html autonome, RECETTE.md, RECETTE_RC1.md, BUILD_SHA.txt, SHA256SUMS.txt et captures de référence.
Servir le dossier depuis un serveur HTTP de test, par exemple python -m http.server 8080 sur un PC, puis ouvrir http://IP_DU_PC:8080/ dans Chrome Android sur le même réseau. Ne pas exposer le serveur à Internet. Utiliser une origine de test distincte de la production ; ne pas écraser les données de jeu existantes. Pour la migration, utiliser une copie de la sauvegarde RC1. Les fichiers locaux peuvent ne pas supporter localStorage correctement.
Le SHA de BUILD_SHA.txt est celui du checkout CI (éventuellement commit de fusion de test). Vérifier les sommes avec sha256sum -c SHA256SUMS.txt depuis le dossier extrait.

## Recette physique RC2

| ID | Contrôle | Attendu | Statut |
|---|---|---|---|
| G01 | Menu principal, quatre classes | Portraits distincts, textes lisibles, reprise accessible | À tester |
| G02 | Partie en portrait et paysage | Carte nette, HUD lisible, aucun bouton hors écran | À tester |
| G03 | Pavé 8 directions, attente, toucher carte | Déplacement uniquement via le pavé ; tour exact ; carte sans déplacement tactile | À tester |
| G04 | Zoom 75/100/125/150/200 et taille pavé 85/100/115 | Réglages persistants, aucune commande inaccessible | À tester |
| G05 | PV, ressources, XP et niveau | Valeurs conformes au personnage ; XP au niveau 30 affichée MAX | À tester |
| G06 | Armes et compétences, barre personnalisée | Icônes cohérentes, coût et recharge inchangés | À tester |
| G07 | Équipement et consommables | Icônes lisibles, raretés visibles, apparence du héros mise à jour | À tester |
| G08 | Frappe, critique, dégâts, soins, protection | Retours visuels non bloquants ; un tour/action ; rechargement sans effet résiduel | À tester |
| G09 | Explorer donjons et biomes | Sols et murs différenciés ; mémoire sombre ; carte inconnue masquée | À tester |
| G10 | Ennemis et élites | Silhouettes distinctes, barres de PV et avertissements lisibles | À tester |
| G11 | Boss et phases | Sprite identifiable, marqueurs de phase et cases dangereuses lisibles | À tester |
| G12 | Coffres, portes, passages secrets, pièges | États graphiques exacts ; éléments secrets non découverts invisibles | À tester |
| G13 | Marchands, événements, salles spéciales | Dialogues utilisables et récompenses non dupliquées | À tester |
| G14 | Fermer Chrome et reprendre | Position, PV, équipement, talents, niveau, or, préférences conservés | À tester |
| G15 | Reprendre une copie RC1 | Aucun changement de format ni perte d'inventaire/historique | À tester |
| G16 | Mort/victoire et Panthéon | Comportement RC1 conservé, nouvelle partie possible | À tester |
| G17 | Mode réduction des animations (si disponible) | Retour visuel sans translation ; aucune commande bloquée | À tester |

Les 12 vérifications fonctionnelles RC1 sont à refaire ou à confirmer séparément ; voir RECETTE_RC1.md. Les biomes et boss tardifs peuvent nécessiter plusieurs parties ou des fixtures de test. Ne pas prétendre avoir couvert les 30 étages sur téléphone si seules les captures de CI ont été examinées.

## Compte rendu

- Appareil / version Android :
- Navigateur / version :
- SHA de BUILD_SHA.txt :
- Contrôles G01–G17 réussis, échoués ou non testés :
- Captures / étapes de reproduction :
- Décision : en attente.

## Sortie de recette

Vérifier le SHA final et le succès officiel des trois jobs. Comparer les captures réelles en portrait/paysage et vérifier la lisibilité sur appareil. Corriger en branche RC2 si nécessaire, réexécuter les tests, puis solliciter la validation explicite avant intégration dans main. Ne pas publier de lien comme version officielle ni annoncer une APK inexistante.
