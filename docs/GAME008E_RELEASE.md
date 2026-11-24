# GAME-008E — CRYPTGRAVE : dossier de mise en circulation

Statut : préparation, **pas de publication v1.0**. Version candidate Android 0.9.0.

## Références figées
- Main PWA : 8b2b31afe95384fcb40612b4a144ad2ecf3aad22, PR #29 fusionnée.
- PWA validée : 439aba907d8a2495803e69a8070a466b10fa5c31, QA-004 run 45310732419, engine/Chromium/PWA 3/3. Artefact 14883746413.
- APK candidat PR #30 : 4a3ec1baa4a3a3634b42a80f52ae4b993af87325, run Android 45311720674. Compilation et contrôle signature/permissions/payload réussis ; émulateur en cours au moment de la rédaction. Ne pas déclarer validé sans résultat final et artefact.
- Aucun changement de moteur, stockage ou contenu du jeu dans GAME-008E (documentation uniquement).

## Porte 1 — Android
- Vérifier SHA final, CI QA-004 engine/Chromium/PWA, Android APK et son artefact.
- Comparer la branche PWA avec main, puis retarget PR #30 vers main si les arbres restent équivalents. Vérifier les contrôles après retarget avant fusion.
- Tester sur téléphone avec [GAME008D_ANDROID.md](GAME008D_ANDROID.md), A01–A08. APK debug pour une partie de test uniquement. Conserver l'artefact et le SHA256.
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
- SHA APK / SHA256 / résultat A01–A08 :
- URL PWA / SHA déployé / résultat recette PWA :
- Résultat des CI et lien :
- Anomalies et décisions :
- Validation finale utilisateur :
