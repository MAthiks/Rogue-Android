# GAME-008A — audit de consolidation et migration

- Main avant intégration : 2918d5ba49c37440f01c26fc5cd41bc4d0938eba.
- RC1 : 3344817bc9e6d4c7d7ea8acf3c7af118fe2c0e60, CI officielle réussie (45302609782).
- RC2 : 53af490514864246d917e23fb2454a1de8c23541, CI officielle réussie (45306393858), moteur 25 suites, Chromium mobile et paquet 3/3. Artefact : 14881855164. Validation physique RC2 déclarée par l'utilisateur ; détail des 17 contrôles non fourni. Recette physique RC1 non confirmée séparément.
- Le jeu index.html est inchangé par GAME-008A (blob d334a5b7a87b645fd1b62c9ea4fde5a97293d767).
- Les PR #8–27 sont ouvertes et non fusionnées. RC2 est cumulatif, en avance de 81 commits et en retard de 0 sur main avant les nouveaux contrôles.
- La branche 007B comporte un commit de correction de fixture qui n'est pas un ancêtre de RC2. La correction (injection addInitScript, marqueur sessionStorage et assertions) figure à l'identique dans RC2. Ne pas fusionner la pile PR par PR ni supprimer les branches avant vérification de leur contenu et historique.
- Test supplémentaire tests/game008a.cjs : huit migrations de sauvegardes effectivement générées par les versions historiques GAME-004 et RC1 (quatre classes chacune), conservation position, progression, inventaire, carte, entités, préférences, Panthéon, idempotence après sauvegarde, restore d'une donnée corrompue sans écriture. Réussi en simulation DOM avant commit ; CI officielle requise. Aucune donnée personnelle de joueur utilisée.

## Procédure

1. PR cumulative GAME-008A ciblant main ; exiger le succès engine et chromium-mobile sur le SHA final. Ne pas fusionner de PR intermédiaire en parallèle.
2. Confirmer la recette physique RC1 (ou une décision explicite documentée de remplacer cette recette par la recette cumulative RC2 complète), et la validation RC2 avant fusion.
3. Vérifier que main n'a pas bougé et que le blob index.html correspond toujours à RC2. Intégrer par merge préservant l'historique, ou fast-forward si autorisé. Conserver le commit RC1 et le paquet validé RC2 pour rollback technique ; ne pas revenir à un ancien moteur sur une sauvegarde récente sans copie.
4. Contrôler CI main après intégration. Ne pas supprimer les branches ou fermer les PR restantes avant vérification d'ascendance ou équivalence.
5. Publication navigateur distincte de la publication APK : vérifier la configuration d'hébergement et l'origine de sauvegarde, effectuer un test physique sur cette origine. Ne pas annoncer d'URL jouable non vérifiée. Ne pas publier d'APK sans chaîne Android validée.

Garde-fous : aucune modification ROGOV, aucune suppression des sauvegardes, aucune modification de règles de combat ou d'interface dans ce lot.
