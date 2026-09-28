# Sanad — plateforme de cours de Coran en ligne

Application web (Next.js) reprenant la maquette Claude Design "SANAD" :
mise en relation élèves/enseignants, réservation, paiement, cours en
ligne, suivi pédagogique — avec les deux exigences produit ajoutées au
document de synthèse : **aucune coordonnée personnelle échangée hors de
l'application**, et **toutes les ressources pédagogiques hébergées
nativement** (médiathèque intégrée, y compris les enregistrements de
cours).

## Où en est le projet

L'application est branchée sur de vrais services, pas des données de
démonstration :

- **Base de données et authentification** : Supabase (schéma complet,
  RLS activé sur toutes les tables).
- **Trois espaces réels** : parent/élève (`/espace`), enseignant
  (`/enseignant`), admin (`/admin`).
- **Parcours public réel** : accueil, recherche, fiche enseignant,
  réservation, paiement — sur les vrais enseignants et disponibilités
  de la base, plus aucune donnée codée en dur.
- **Paiement carte (Stripe + Stripe Connect)** : branché de bout en
  bout, mode test, commission plateforme 15 %.
- **Paiement Wave** : code prêt côté application (API Checkout Wave
  Business documentée), en attente d'une clé API (sandbox ou
  production) — le sélecteur reste masqué tant qu'elle n'est pas
  configurée.
- **Salle de cours vidéo intégrée (Daily.co)** : jointe directement
  dans une page Sanad (jamais de lien externe), avec enregistrement et
  import automatique dans la médiathèque de l'enseignant et de la
  famille.

**Pas encore fait** :
- Mise en production (ce dépôt tourne encore uniquement en local) —
  nécessaire pour activer les vrais webhooks Stripe/Daily/Wave (en
  attendant, chaque page concernée fait une vérification directe
  équivalente au chargement).
- Prélèvement récurrent des abonnements, reçus PDF.
- Dépôt réel de fichiers (Supabase Storage) pour les ressources
  ajoutées manuellement.
- Détection automatique des impayés, modération automatique des
  messages, parcours "premier échange gratuit", choix de durée de
  cours, catalogue de cours collectifs.

Voir `claude/journal-avancement.md` dans le Project Claude pour le
détail à jour de chaque étape et des décisions prises.

## Lancer le site en local

Prérequis : Node.js 20+.

```bash
npm install
npm run dev
```

Le site est alors accessible sur http://localhost:3000.

Pour un build de production :

```bash
npm run build
npm run start
```

## Variables d'environnement

Copier `.env.local.example` en `.env.local` et renseigner :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — projet Supabase (Project Settings →
  API).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET` — compte Stripe (mode test pour l'instant).
- `DAILY_API_KEY` — compte Daily.co.
- `WAVE_API_KEY`, `WAVE_API_BASE_URL` — compte Wave Business (pas
  encore obtenu).

## Déployer sur Vercel

1. Pousser ce dépôt sur GitHub (ou GitLab/Bitbucket).
2. Sur [vercel.com](https://vercel.com), créer un nouveau projet en
   important ce dépôt — Vercel détecte automatiquement Next.js, aucune
   configuration n'est nécessaire.
3. Ajouter toutes les variables listées ci-dessus dans Project
   Settings → Environment Variables sur Vercel.
4. Une fois une URL publique obtenue, configurer les vrais webhooks
   côté Stripe (`/api/stripe/webhook`) et côté Daily.co, et retirer les
   vérifications synchrones de secours devenues inutiles.
5. Chaque `git push` sur la branche principale redéploie
   automatiquement le site.

## Structure du projet

```
src/app/(public)/     parcours public (accueil, recherche, fiche
                      enseignant, inscription, connexion, tunnel de
                      réservation, confirmation)
src/app/espace/       espace parent/élève
src/app/enseignant/   espace enseignant
src/app/admin/        back-office admin
src/app/salle/        salle de cours vidéo (Daily.co)
src/app/api/          routes API (Stripe checkout/connect/webhook,
                      ouverture de ressource)
src/app/fonts/        police Archivo auto-hébergée
src/components/ui/    briques d'interface génériques
src/components/site/  en-tête, pied de page, indicateur d'étapes,
                      composants du tunnel public
src/components/dashboard/ composants partagés des trois espaces
src/lib/supabase/     clients Supabase (navigateur, serveur, admin)
src/lib/stripe/       client Stripe et logique de checkout
src/lib/wave/         client Wave et logique de checkout
src/lib/daily/        client Daily.co (API REST)
supabase/             schéma SQL de référence
```
