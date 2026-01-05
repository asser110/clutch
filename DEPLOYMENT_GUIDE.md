# Clutch - Deployment Guide

## Summary of Changes Made

### 1. Fixed `index.html` Issue
**Problem:** The `index.html` file contained an import map (`<script type="importmap">`) that's not needed for a Vite/Vercel deployment. This was likely causing build issues.

**Solution:** Removed the import map. Vite handles all module resolution during the build process.

---

## Email Notification Feature

Your app already has a **login notification system** set up! Here's how it works:

### Current Implementation

1. **Frontend (Dashboard.tsx):**
   - When a user logs in, `sessionStorage.setItem('clutch-new-login', 'true')` is called
   - The Dashboard shows a notification banner for 8 seconds
   - The notification tells the user: "A new login was detected. We've sent a notification to [email]"

2. **Backend (Supabase Edge Function):**
   - Located at: `supabase/functions/login-notifier/index.ts`
   - This function is designed to send an email when a user logs in
   - Uses Resend API to send emails
   - Email content warns users about the login and advises changing password if it wasn't them

### What You Need to Do to Make Email Notifications Work

#### Step 1: Deploy the Supabase Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref xwdkjwitfafpwniffbeg
   ```

4. **Deploy the function:**
   ```bash
   supabase functions deploy login-notifier
   ```

#### Step 2: Set Up Resend API

1. **Sign up for Resend:**
   - Go to https://resend.com/
   - Create a free account
   - Get your API key

2. **Add the Resend API key as a Supabase secret:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
   ```

   Or via Supabase Dashboard:
   - Go to your project dashboard at https://supabase.com/dashboard
   - Navigate to: Project Settings → Edge Functions → Secrets
   - Add a new secret: `RESEND_API_KEY` with your Resend API key

3. **Configure your sending domain (Optional but recommended):**
   - In Resend dashboard, verify your domain
   - Update `FROM_EMAIL` in `supabase/functions/login-notifier/index.ts` to use your verified domain
   - Redeploy the function after making changes

#### Step 3: Create Database Webhook

You need to set up a webhook that triggers the Edge Function when a user logs in.

**Via Supabase Dashboard:**

1. Go to https://supabase.com/dashboard/project/xwdkjwitfafpwniffbeg
2. Navigate to: Database → Webhooks
3. Click "Create a new webhook"
4. Configure:
   - **Name:** `login-notification-webhook`
   - **Table:** `auth.users`
   - **Events:** Check only `UPDATE`
   - **Type:** `Supabase Edge Functions`
   - **Edge Function:** Select `login-notifier`
   - **HTTP Headers:** Add if needed (usually not required)

5. Save the webhook

**Alternative: Using SQL (Advanced):**

If you prefer to set this up via SQL:

```sql
-- Create a trigger function
CREATE OR REPLACE FUNCTION auth.notify_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notification if last_sign_in_at has changed
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    PERFORM
      net.http_post(
        url := 'https://xwdkjwitfafpwniffbeg.supabase.co/functions/v1/login-notifier',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'sub'
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD)
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.notify_login();
```

#### Step 4: Test the Email Notification

1. Log out of your app
2. Log back in
3. Check your email inbox for the security notification

---

## Deploying to Vercel

Your app is already configured for Vercel deployment. Make sure you have:

### Vercel Configuration (`vercel.json`)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
✅ Already present in your project

### Deployment Steps

1. **Install Vercel CLI** (if not already):
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

   Or connect your GitHub repository to Vercel dashboard for automatic deployments.

3. **Update Supabase Site URL:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set `Site URL` to your Vercel production URL (e.g., `https://your-app.vercel.app`)
   - Add your Vercel URL to `Redirect URLs`

---

## Security Notes

⚠️ **Important:** Your Supabase credentials are currently hardcoded in `lib/supabaseClient.ts`. 

While the `anon` key is safe to expose in client-side code, for better security practices, consider:

1. Using Vercel environment variables:
   - In Vercel Dashboard → Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   
2. Update `lib/supabaseClient.ts`:
   ```typescript
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "fallback-url";
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "fallback-key";
   ```

---

## Current Project Status

✅ **Working:**
- Authentication (Login/Signup)
- Dashboard with CLI interface
- Session management
- Login notification UI (frontend banner)

⚠️ **Needs Configuration:**
- Email notifications (requires Resend API + Webhook setup)
- Environment variables (optional, for better security)

📝 **No Code Errors Found:**
- All TypeScript files are properly typed
- React components are correctly structured
- Supabase client is properly initialized
- No syntax errors detected

---

## Quick Start Checklist

- [x] Fix index.html (already done)
- [ ] Sign up for Resend API
- [ ] Set Resend API key in Supabase secrets
- [ ] Deploy login-notifier Edge Function
- [ ] Create database webhook in Supabase
- [ ] Deploy to Vercel
- [ ] Test email notifications
- [ ] Update Supabase Site URL to Vercel domain

---

## Support

If you encounter any issues:
1. Check Supabase Edge Function logs
2. Check Resend dashboard for email delivery status
3. Check browser console for frontend errors
4. Verify webhook is properly configured in Supabase

---

**Last Updated:** January 5, 2026
