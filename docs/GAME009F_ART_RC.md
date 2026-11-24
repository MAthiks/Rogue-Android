# GAME-009F — CRYPTGRAVE 0.9.1-art-rc1

Candidat de recette graphique, non destiné à la production. Base stable main e8f7796d2a30aec0901d90a02f2b46ae630220ba. Cumul du transfert GAME-008E3 (PR #33) et des cinq lots GAME-009A–E (PR #34–38), SHA source 27daffa7fc2f1b49ab3d5d0ae8450030f7715b3e. Les PR #31 (dossier de sortie) et #32 (production signée) sont indépendantes et ne sont pas incluses.

## Installation sans écraser la 0.9.0
L'APK de recette est signé debug, applicationId com.mathiks.cryptgrave.artpreview, versionCode 2, versionName 0.9.1-art-rc1, nom lanceur CRYPTGRAVE (Art RC). Il peut cohabiter avec l'APK d'origine com.mathiks.cryptgrave ; les données restent séparées et la sauvegarde historique n'est pas accessible automatiquement. Ne pas désinstaller la 0.9.0. Pour réinstaller une future prévisualisation, la clé debug peut différer : ne pas effacer de sauvegarde utile. Le build par défaut reste 0.9.0, com.mathiks.cryptgrave. Option de build locale : gradle -p android -PcryptgraveArtPreview :app:assembleDebug.

## Recette physique (sur une partie de test)
F01 Installation à côté de la 0.9.0, lancement sans réseau.
F02 Menu illustré, titre et boutons lisibles, portrait et paysage.
F03 Quatre cartes de classe, portraits, PV/ressource/spécialisations, sélection.
F04 Fiche personnage, jauges, six caractéristiques, compétences et niveaux.
F05 Attribution d'un point et choix de talent si disponibles : consommation correcte du point, aucun tour supplémentaire.
F06 Équipement : silhouette et cinq emplacements ; équiper/retirer un objet, vérifier ses bonus.
F07 Sac : capacité, raretés, détails et confirmation avant jeter.
F08 HUD : portrait, trois jauges, journal, coûts des compétences et recharge.
F09 Huit directions uniquement, attente, commandes sans chevauchement ; carte et brouillard intacts.
F10 Rotation, trois tailles de pavé et zoom, retour aux valeurs préférées.
F11 Fermeture/reprise : même personnage, étage, tour, inventaire et carte.
F12 Transfert : copier un export de test, annuler un import, refuser un texte tronqué, puis réimporter un export valide sur ce profil de test. Vérifier reprise et historique. Ne pas partager le texte publiquement.
F13 Vérifier que l'ancienne 0.9.0 reste installée et sa partie intacte.
F14 Tester la mort permanente sur une partie jetable : partie active supprimée, Panthéon conservé.

## Contrôles avant fusion
CI moteur, Chromium mobile, PWA hors ligne, Android émulateur 13 sur le SHA final. Le paquet est fourni par le job Android après ses contrôles (signature debug, identité distincte, absence de permission Internet, moteur embarqué, tests natifs). Vérifier l'ensemble des quatre jobs avant demander la recette. Les captures sont dans l'artefact rogue-interface-art-preview du même SHA. Ne pas confondre ces résultats avec une validation physique.
Après F01–F14 et accord explicite : intégrer la PR cumulative vers main, conserver l'historique et vérifier les CI post-fusion. Ne pas fusionner simultanément les PR empilées. Réconcilier les changements Gradle avec PR #32 avant la production. Aucun déploiement Pages ni tag v1.0 automatique.
