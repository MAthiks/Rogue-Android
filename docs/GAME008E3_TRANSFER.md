# GAME-008E3 — Transfert manuel de sauvegarde

## Fonction
Le menu principal propose Transfert de sauvegarde. Exporter et sélectionner produit un texte JSON versionné à copier dans un fichier privé ; Importer le texte vérifie le format, les limites, les champs essentiels de la partie, du Panthéon et des options. L'utilisateur confirme le remplacement. Le jeu n'envoie aucune donnée sur Internet et ne demande aucune permission Android supplémentaire. Aucun checkpoint automatique, aucun changement des clés historiques.

Le transfert contient la partie active (ou null), le Panthéon et les options graphiques. Il ne contient pas de compte ni d'identifiant d'appareil. Le texte doit rester privé. Importer uniquement ses propres exports ; le format n'est ni signé ni chiffré, et la validation structurelle ne prouve pas l'authenticité d'une partie. Un ancien export peut rétablir un ancien état : le transfert est destiné à la migration et ne garantit pas une protection anti-triche. La mort continue à supprimer la partie active.

## Mode opératoire
1. Quitter puis rouvrir le jeu, rester au menu principal sans abandonner la partie.
2. Ouvrir Transfert de sauvegarde, puis Exporter et sélectionner ; copier le texte sélectionné via le menu Android et le conserver dans un fichier privé. Vérifier que la copie est complète.
3. Sur une autre installation compatible, ouvrir le même écran, coller le texte, choisir Importer le texte puis confirmer. Toute partie, tout historique et toutes options sur la destination sont remplacés. Exporter d'abord les données de destination si elles ont de la valeur.
4. Reprendre et vérifier personnage, équipement, étage, tour, carte, historique, options. Fermer et rouvrir pour vérifier la persistance.
5. Ne pas supprimer l'installation source avant vérification de la destination.

## Limite importante pour l'APK 0.9.0 déjà installé
Il ne possède pas encore l'écran de transfert. Un nouvel APK debug doit être signé par exactement la même clé que l'installation existante pour pouvoir la mettre à jour en conservant les données. Les clés debug générées par les runners CI peuvent différer. La clé du candidat précédemment distribué n'a pas été conservée dans le dépôt. Il ne faut donc pas désinstaller l'ancien APK ni prétendre que le transfert de sa sauvegarde est garanti. Le format historique est compatible quand les données sont accessibles à une version disposant de cet écran. Pour la PWA, conserver la même origine. Les nouvelles installations avec export/import peuvent ensuite migrer entre versions et appareils, indépendamment de la signature, par copie explicite du texte.

## Contrôles
- Test moteur : 24 sauvegardes générées par le véritable moteur 0.9.0, 4 classes x 6 étages ; rejet de 10 entrées malformées, restauration des anciennes valeurs si une écriture échoue, mort sans partie active.
- Test Chromium : export UI, refus d'un texte invalide, annulation de l'import, import dans un profil vierge, reprise et rechargement.
- Recette physique à effectuer : copie/paste Android, reprise, conservation des options et historique, annulation, refus d'un texte tronqué, mode avion.
- Tests simulés réussis avant commit ; CI officielle et recette physique indispensables avant distribution.
