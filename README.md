**Step 1 — Supabase Setup**
```
1. Go to supabase.com → New Project
2. SQL Editor → run the schema.sql above
3. Authentication → create your first admin user
4. Update their role: UPDATE user_profiles SET role='super_admin', full_name='Your Name' WHERE email='you@email.com';
5. Copy: Project URL + anon key + service_role key


git init
git add .
git commit -m "initial: AI-BOS survey platform"
git remote add origin https://github.com/YOUR_USERNAME/ai-bos-survey.git
git push -u origin main
```

**Step 3 — Netlify**
```
1. Netlify dashboard → Add new site → Import from GitHub
2. Select your repo, build command auto-detected from netlify.toml
3. Site Settings → Environment Variables → add all 5 from .env.example
4. Deploy!
```

**Step 4 — Env Vars in Netlify**
| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | From Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | From Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase API settings |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |

**Step 5 — First Login**
```
Go to https://your-site.netlify.app/admin/login
Login with the Supabase email you created