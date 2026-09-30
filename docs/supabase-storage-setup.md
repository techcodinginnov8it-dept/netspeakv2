# Supabase Storage Setup

1. In Supabase, open **Project Settings → API**.
2. Add these server-only values to the local `.env` file and deployment environment:

   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. Never commit the service-role key. Keep `.env` ignored and use the deployment provider's encrypted environment-variable settings.
4. Run `npm run verify:supabase-storage`.
5. Complete one Freshness Check, concern-evidence, or incident-evidence upload. The application creates private `freshness-checks` and `ticket-evidence` buckets when needed.

The database stores storage object paths. Images are served through time-limited signed URLs rather than public bucket URLs.
