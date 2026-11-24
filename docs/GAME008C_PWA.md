# GAME-008C — PWA Android et hébergement

Hors libellé du menu principal (CRYPTGRAVE), le moteur JavaScript est identique à GAME-008B (main 5e314b97cc664c53cc98c8fdf67174a03604db6a). Outre le changement de nom, seuls les liens de manifeste et l'enregistrement optionnel du service worker s'ajoutent au HTML.

## Construction
Node 22 : node tools/build-pwa.cjs pwa-dist
Le dossier pwa-dist contient index.html, manifeste, icônes PNG 192/512, SVG, service worker versionné selon le contenu et .nojekyll.
Ne pas servir le dépôt entier à la place du bundle : les PNG et la version du worker sont générés pendant le build.
CI : moteur, Chromium mobile, PWA hors ligne ; téléchargement de rogue-pwa-preview pour recette.

## Publication (après fusion et validation)
Le dépôt est public. Dans Settings > Pages > Build and deployment > Source, choisir GitHub Actions si nécessaire.
Dans Actions > QA-004 > Run workflow, sélectionner main et cocher publish_pages.
Le job pages-deploy dépend des trois tests et déploie exactement l'artefact testé.
URL attendue, non présumée active : https://mathiks.github.io/Rogue-Android/
Vérifier l'URL réellement retournée par le déploiement, ouvrir dans Chrome Android, puis vérifier la recette avant annoncer la disponibilité.
Si un site existant utilise une autre origine, localStorage n'est pas transféré automatiquement. Ne jamais promettre une migration entre origines ni effacer les anciennes sauvegardes.

## Recette Android
1. Ouvrir l'URL HTTPS. Attendre la première installation du service worker.
2. Chrome > menu > Installer l'application / Ajouter à l'écran d'accueil (libellé selon navigateur).
3. Créer une partie de test ou reprendre la sauvegarde existante sur cette même origine.
4. Passer en mode avion, fermer puis ouvrir CRYPTGRAVE et reprendre. Vérifier déplacement, tour, fermeture et sauvegarde.
5. Rétablir le réseau. Lors d'une mise à jour, fermer toutes les fenêtres CRYPTGRAVE puis rouvrir. Le worker ne force pas de rechargement pendant une partie.
6. Contrôler les préférences, le Panthéon, les huit directions, l'absence de régression et l'absence d'effet sur ROGOV.

Le cache est isolé par chemin de scope. La mise à jour ne supprime que les caches de CRYPTGRAVE, jamais localStorage. Une première visite nécessite Internet ; stockage effacé par l'utilisateur/navigateur ou éviction peut supprimer le hors-ligne et les données. Une PWA n'est pas une APK.
