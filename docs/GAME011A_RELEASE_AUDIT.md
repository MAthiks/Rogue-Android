# GAME-011A — Stabilisation et préparation V1.0

## Baseline
- 0.10.0 publiée sur Pages : commit 76246db7809002b4af1e3c1f17a4adbe8a74b229, workflow 45378819825 (engine, chromium-mobile, pwa, pages-deploy success).
- APK RC1 validé en CI et recette physique 8/8 déclarée par l'utilisateur, PR #45 commentaire 7129329996.
- 77 fichiers suivis, 501 529 octets de blobs, index.html 196 631 octets, 43 fichiers de test à la baseline (dont les deux QA004), 8 fichiers Android.
- Page publique : https://mathiks.github.io/Rogue-Android/ ; affichage final dans le navigateur utilisateur à confirmer. Le menu et les métadonnées Android portent encore RC1 ; normaliser les versions au chantier de packaging, sans prétendre à une signature de production.

## Anomalie traitée
Un échec de reprise déclenchait la suppression automatique de la sauvegarde, alors que restore() seul n'écrivait pas. Une migration partielle échouée pouvait également laisser S non nul et permettre à l'autosave de remplacer la copie. Nouvelle reprise non destructive : S/selected vidés en cas d'échec, aucune suppression, écran de récupération avec texte brut en lecture seule sélectionnable, retour au menu. Le texte brut est une copie de secours, pas un fichier de transfert valide. Nouvelle partie et import restent des remplacements explicitement choisis ; mort permanente inchangée.
La correction ne répare pas un JSON endommagé et ne garantit pas la détection de toutes les incohérences structurelles. Les validations strictes d'import restent en place ; compatibilité de restore historique conservée.

## Plan GAME-011 (proposition opérationnelle)
A : audit, récupération non destructive, tests de migration de 0.10.0.
B : tests de longue durée et cas limites de combat, exploration, économie ; corriger les anomalies démontrées.
C : stabilité mobile, accessibilité tactile, performances mesurées, cache et mise à jour.
D : versionnage, packaging, sauvegarde/upgrade, processus de signature de production à confirmer (aucune clé privée dans Git).
E : V1.0 RC, quatre CI vertes, recette physique, publication explicite et vérification web. Ne pas déclarer de diffusion Play Store sans les prérequis de distribution.

## Invariants
Contrôles D-pad huit directions, mécanique tour par tour, clés de stockage et historique, art et gameplay validés, ID et origine APK/PWA, aucun changement de ROGOV. Pas de fusion sans quatre CI réussies. Pages reste sur 0.10.0 durant les travaux.
