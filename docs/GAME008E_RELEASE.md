# GAME-008E — CRYPTGRAVE : dossier de mise en circulation

Statut : préparation, **pas de publication v1.0**. Version candidate Android 0.9.0.

## Références figées
- Main PWA : 8b2b31afe95384fcb40612b4a144ad2ecf3aad22, PR #29 fusionnée.
- PWA validée : 439aba907d8a2495803e69a8070a466b10fa5c31, QA-004 run 45310732419, engine/Chromium/PWA 3/3. Artefact 14883746413.
- APK candidat PR #30 : 4a3ec1baa4a3a3634b42a80f52ae4b993af87325, run Android 45311720674. Compilation, signature, permissions, payload et émulateur Android 13 réussis. QA-004 45311720495 réussi (3/3), Android APK 45311720674 réussi (1/1). Artefact debug 14882719142. PR #30 fusionnée dans main e8f7796d2a30aec0901d90a02f2b46ae630220ba ; arbre identique à la branche validée.
- Aucun changement de moteur, stockage ou contenu du jeu dans GAME-008E (documentation uniquement).

## Porte 1 — Android
- Vérifier SHA final, CI QA-004 engine/Chromium/PWA, Android APK et son artefact.
- Comparer la branche PWA avec main, puis retarget PR #30 vers main si les arbres restent équivalents. Vérifier les contrôles après retarget avant fusion.
- Le 24/11/2026, l'utilisateur confirme les sept contrôles physiques sur son smartphone : lancement, quatre classes, huit directions, combats et inventaire, rotation, reprise après fermeture, mode avion. Cette recette est acquise pour la version 0.9.0 debug, sans présumer de contrôles supplémentaires A01–A08 non explicitement confirmés. Conserver l'artefact et le SHA256. La recette d'une mise à jour signée production reste à effectuer.
- Ne pas désinstaller une application contenant des sauvegardes pour résoudre un conflit de signature.

## Porte 2 — navigateur
- Settings > Pages > Source : GitHub Actions. Ne pas modifier le dépôt ROGOV ni renommer Rogue-Android.
- Actions > QA-004 > Run workflow > main > publish_pages. Attendre le succès engine/Chromium/PWA et pages-deploy. Consigner le SHA et l'URL renvoyée ; l'URL attendue est https://mathiks.github.io/Rogue-Android/ mais son état public reste à vérifier.
- Recette physique PWA selon [GAME008C_PWA.md](GAME008C_PWA.md), incluant installation, mode avion, reprise, options et rotation. Préserver les sauvegardes sur l'origine existante.

## Porte 3 — distribution
- Vérifier disponibilité du nom/marque, licences des dépendances, mentions et conditions de distribution.
- Générer une clé de signature de production conservée hors dépôt, avec sauvegarde sécurisée. Ne jamais demander de mot de passe ou clé privée dans un chat. Pour CI, utiliser des secrets protégés et un environnement de publication approuvé ; ne jamais exposer au workflow des PR externes.
- Choisir canal : APK signé distribué directement, ou AAB signé pour Google Play. Confirmer les exigences target SDK et de publication à la date de sortie. Tester l'installation et une mise à jour signée avec la même clé et le même applicationId com.mathiks.cryptgrave sur un profil de test. Un APK debug ne constitue pas une release.
- Sauvegardes WebView et Chrome distinctes, pas de migration automatique. La clé de stockage historique reste inchangée. Pas de retour à une version ancienne avec une sauvegarde non copiée.
- Tag/release v1.0 seulement après réussite des recettes physiques, CI vertes sur main et validation explicite. Conserver les branches et les artefacts RC1/RC2 tant que rollback et compatibilité ne sont pas documentés.

## Fiche de recette à renseigner
- Date / modèle Android / version OS / WebView :
- APK candidat : artefact 14882719142, SHA branche 4a3ec1baa4a3a3634b42a80f52ae4b993af87325. Sept contrôles physiques confirmés le 24/11/2026 ; SHA256 du fichier à relever lors de la recette de distribution.
- URL PWA / SHA déployé / résultat recette PWA :
- CI de la branche candidate : https://github.com/MAthiks/Rogue-Android/actions/runs/45311720495 et https://github.com/MAthiks/Rogue-Android/actions/runs/45311720674 (4/4). CI main post-fusion à contrôler séparément.
- Anomalies et décisions :
- Validation utilisateur : recette physique APK 0.9.0 confirmée ; publication v1.0 non encore autorisée.
