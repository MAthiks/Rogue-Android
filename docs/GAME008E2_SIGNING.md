# GAME-008E2 — Préparation du paquet signé de CRYPTGRAVE

Version de qualification : 1.0.0-rc1, code 2, applicationId com.mathiks.cryptgrave. Le build debug par défaut reste 0.9.0, code 1. Ce lot ne publie rien et ne crée aucune clé permanente.

## Compilation
Le workflow Android release candidate compile et vérifie l'APK non signé en PR. Cet artefact n'est pas installable. Après intégration, le workflow peut être déclenché manuellement depuis main. Seule l'option sign_candidate (false par défaut) permet de demander une signature. Aucun secret n'est nécessaire pour la compilation PR.

## Configuration de la signature (opérateur)
1. Générer et conserver hors dépôt une clé de production dédiée à CRYPTGRAVE, avec une sauvegarde chiffrée. Ne jamais communiquer la clé ou les mots de passe dans un chat.
2. Créer l'environnement GitHub android-production, restreindre les déploiements à main et configurer une approbation si disponible. Y enregistrer les secrets ANDROID_KEYSTORE_B64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD. ANDROID_KEYSTORE_B64 contient le fichier de keystore encodé, pas un secret affichable.
3. Définir dans cet environnement la variable ANDROID_CERT_SHA256 (empreinte SHA-256 du certificat de production, 64 caractères hexadécimaux). Vérifier cette empreinte indépendamment.
4. Vérifier toutes les CI du commit main, puis déclencher Android release candidate sur main et sélectionner sign_candidate. Le workflow contrôle l'identité du commit, les sommes de contrôle, la signature, l'empreinte attendue et l'alignement. La clé temporaire est supprimée ; seuls APK et métadonnées publiques sont exportés.
5. Télécharger le candidat signé pour la recette physique. Ce workflow n'effectue ni release GitHub, ni publication Play Store.

## Attention : version 0.9.0 debug
Une application signée avec la clé de production ne peut pas mettre à jour une installation signée avec une autre clé debug, même avec le même applicationId. Ne pas désinstaller la version 0.9.0 contenant des données utiles. Tester le candidat sur un autre appareil ou un profil Android séparé. Une méthode d'export/import des sauvegardes serait nécessaire avant une migration entre installations signées différemment ; elle n'est pas livrée par ce lot. Pour les futures mises à jour de production, conserver la même identité d'application et le même certificat, avec versionCode croissant.

## Portes restantes
CI du build release, configuration et recette physique du paquet signé, essai de mise à jour signée, mise en ligne/recette PWA, contrôles juridiques et décision de publication v1.0. Pour Google Play, vérifier séparément les exigences et la chaîne AAB à la date de distribution.
