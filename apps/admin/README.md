# Heavy-Care — Console Super Admin

Application séparée pour la gestion multi-pôles (rôles, comptes, pôles).
Seuls les `super_admin` peuvent y entrer (vérifié côté client **et** côté
serveur dans l'Edge Function).

## Moteur de la sécurité

- La clé `service_role` ne quitte **jamais** le navigateur : toutes les
  opérations privilégiées (adresses email, création/suppression de comptes,
  changement de rôle/pôle) passent par l'Edge Function
  `supabase/functions/admin-users`, qui vérifie le JWT de l'appelant et son
  rôle dans `profiles` avant toute action.
- Le listing/crud des pôles passe par les policies RLS publiées en Phase 3 —
  aucune donnée filtrée côté client. La discrimination se fait en base.
- `auth.users.email` n'est exposé nulle part côté client : seul l'Edge
  Function le lit.

## Développement

```bash
cd apps/admin
npm install
npm run dev        # http://localhost:3001
```

`.env` contient déjà les valeurs publiques (URL + clé anon — publiques par
conception, la sécurité est dans la RLS).

## Déploiement de l'Edge Function (une fois, puis après chaque modification)

```bash
# installer le CLI si besoin
npm install -g supabase

# un jeton access-token personnel est nécessaire
export SUPABASE_ACCESS_TOKEN=<votre jeton>   # PowerShell : $env:SUPABASE_ACCESS_TOKEN="..."

supabase functions deploy admin-users --project-ref yklkxvvoeovksyslcfjy
```

Le jeton s'obtient sur : dashboard Supabase → Account → Access Tokens.

## Déploiement de l'application admin

Même pipeline que le reste du dépôt (build statique Next `output: export`
non requis ici — app Node classique, port 3001). Les variables d'environnement
de production : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(déjà définies dans `.env`, à reproduire sur l'hébergeur).
