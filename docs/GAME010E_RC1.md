# CRYPTGRAVE 0.10.0 RC1 — GAME-010E

## Ajustements
- Les compétences offensives directionnelles régénèrent au maximum 2 ressources à la fin de leur tour. Les attaques à distance avec arme payante gardent leur plafond de 1 ; les autres actions gardent la régénération historique.
- Boss générés à partir des étages 13/19/25 : +6/+12/+18 PV respectivement, sans hausse de leurs dégâts. Les ennemis déjà sauvegardés restent inchangés.
- Équipement de niveau d'objet 16–30 : prix de référence augmenté de 1 par niveau au-delà de 15, vente toujours à 40 %. Les stocks sauvegardés conservent leurs prix. L'économie n'est pas simulée intégralement.
- Progression, points de talent, plafonds, identité de classe, commandes, clé et format de sauvegarde conservés.

## Banc reproductible
`node tests/game010e.cjs` : 40 modèles de parcours de 30 étages, soit 1200 étages ; 800 achats théoriques (un équipement et un bandage à chaque étape de commerce). Moyennes : 373 ennemis vaincus, 658 or dépensé, 1717 or restant ; niveau 30 atteint par les 40 modèles. Le modèle suppose tous les ennemis de base vaincus, hors exploration, loot, ventes, décès et déplacements. Ce n'est pas un taux de réussite des parties.
480 duels isolés (8 spécialisations × 30 étages × 2 seeds), 1215 tours, tous gagnés par une politique automatisée simple. Chaque duel démarre avec PV/ressources restaurés, équipement généré, niveau modélisé, points légalement distribués, deux bandages. Cela vérifie la jouabilité des profils, pas la difficulté d'une campagne complète ni l'équilibre PvE définitif. Pas de revendication d'un taux de victoire en jeu réel. Tests ciblés sur récupération, PV boss et prix.

## Installation et recette
CI Android : artefact `cryptgrave-010-rc1-android` pour la PR GAME-010E ou la branche release/game-010-rc1. APK debug isolé : com.mathiks.cryptgrave.gamepreview, code 3, version 0.10.0-rc1. L'ID habituel com.mathiks.cryptgrave est conservé pour le build normal (code 3). Les signatures debug CI peuvent différer : ne jamais désinstaller une installation contenant une sauvegarde pour résoudre un conflit. Le stockage de chaque APK, Chrome et PWA est distinct. Exporter une copie de la sauvegarde 0.9.1 avant tout essai ; importer une copie dans le RC isolé. Ne pas réimporter une sauvegarde enrichie dans une ancienne version sans sauvegarde de secours.
PWA : artefact rogue-pwa-preview généré par QA-004, non publié automatiquement. Pour le tester, servir le dossier via un serveur HTTP local ou HTTPS sur une origine de test, pas file://. Publication GitHub Pages uniquement après recette physique et validation des quatre contrôles.

1. Installer le RC isolé, vérifier lancement hors ligne, pavé huit directions, orientation et interface.
2. Importer une copie 0.9.1 ; contrôler classe, talents, inventaire, position, carte et historique.
3. Vérifier les huit doctrines, les talents 10/18 et leurs synergies en combat ; observer le coût des compétences offensives.
4. Vérifier coordination, annonces des boss et échappatoires ; explorer les nouveaux événements/salles/rares.
5. Jouer plusieurs étages avec au moins deux classes opposées, vérifier tension sur ressources, or, soins et difficulté. Tester une progression de bout en bout avant diffusion stable.
6. Suspendre, fermer, relancer et exporter/importer. Vérifier mort permanente avec une partie jetable, puis Panthéon.
7. Confirmer visuellement 0.10.0 RC1 ; vérifier APK, PWA et Chrome. Noter toute régression.
8. Ne publier qu'après validation humaine. La signature de production et une distribution officielle Play Store ne sont pas couvertes.
