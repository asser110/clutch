# Email Login Notification Setup Guide

## ✅ What I've Done

I've updated your code to send an **actual email** when users log in. Here's what changed:

### 1. **Updated Login.tsx**
- Now calls the Supabase Edge Function `login-notifier` after successful login
- Sends the user's email and timestamp to the function

### 2. **Rewritten login-notifier Edge Function**
- Changed from webhook-based to direct invocation
- Creates a beautiful, retro-styled security email (matching your Clutch theme!)
- Uses Resend API to actually send emails
- Includes CORS headers for proper browser access

---

## 🚀 How to Make It Work

### Step 1: Deploy the Edge Function to Supabase

1. **Open your terminal and navigate to your project:**
   ```bash
   cd C:\Users\Asser\Desktop\clutch\clutch
   ```

2. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

3. **Login to Supabase:**
   ```bash
   supabase login
   ```

4. **Link your project:**
   ```bash
   supabase link --project-ref xwdkjwitfafpwniffbeg
   ```

5. **Deploy the function:**
   ```bash
   supabase functions deploy login-notifier
   ```

### Step 2: Get a Resend API Key

1. Go to **https://resend.com/**
2. Sign up for a free account (100 emails/day free)
3. Verify your email
4. Go to **API Keys** in the dashboard
5. Click **Create API Key**
6. Copy the key (it starts with `re_...`)

### Step 3: Add the Resend API Key to Supabase

**Option A: Using Supabase CLI**
```bash
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

**Option B: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/xwdkjwitfafpwniffbeg
2. Click **Edge Functions** in the left sidebar
3. Click **Settings** (or **Manage secrets**)
4. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: `re_your_actual_api_key_here`
5. Click **Save**

### Step 4: Configure Resend Sending Domain (Optional but Recommended)

**For Testing (Using Default):**
- The function is already set to use `onboarding@resend.dev`
- This works immediately but may go to spam

**For Production (Using Your Domain):**
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `clutch.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-10 minutes)
6. Update the Edge Function:
   - Change `FROM_EMAIL` in `supabase/functions/login-notifier/index.ts`
   - From: `'onboarding@resend.dev'`
   - To: `'security@yourdomain.com'` (or whatever email you want)
7. Redeploy: `supabase functions deploy login-notifier`

---

## 🧪 Testing the Email Notification

### Test Locally (Before Deploying)

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Serve the function locally:**
   ```bash
   supabase functions serve login-notifier --env-file .env.local
   ```

3. **Create `.env.local` file** in your project root:
   ```
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

4. **Test with curl:**
   ```bash
   curl -i --location --request POST 'http://localhost:54321/functions/v1/login-notifier' \
     --header 'Content-Type: application/json' \
     --data '{"email":"your-email@example.com","timestamp":"2026-01-05T14:00:00Z"}'
   ```

### Test in Production (After Deploying)

1. **Make sure the function is deployed** (Step 1 above)
2. **Make sure RESEND_API_KEY is set** (Step 3 above)
3. **Visit your Vercel site** (or run locally with `npm run dev`)
4. **Log in to your account**
5. **Check your email inbox** (also check spam/junk folder)

---

## 🎨 What the Email Looks Like

The email has a **retro, cyberpunk theme** matching your Clutch branding:

- 🖤 Black background with white borders
- 🔲 Pixelated "Press Start 2P" font style
- 🚨 Red alert box for "NEW LOGIN DETECTED"
- ⏰ Timestamp in a terminal-style box with green text
- 🔘 "SECURE MY ACCOUNT" button with retro shadow effect
- 📧 Professional security message

**Subject:** `🔒 Security Alert: New Login to Your Clutch Account`

---

## 🔍 Troubleshooting

### "Function not found" error
- Make sure you deployed: `supabase functions deploy login-notifier`
- Check the function exists in Supabase Dashboard → Edge Functions

### "No email received"
- Check spam/junk folder
- Verify RESEND_API_KEY is set correctly
- Check Resend dashboard → Logs to see if email was sent
- Check Supabase Edge Function logs:
  ```bash
  supabase functions logs login-notifier
  ```
  Or in Dashboard → Edge Functions → login-notifier → Logs

### "RESEND_API_KEY not set" error
- Run: `supabase secrets set RESEND_API_KEY=your_key`
- Or add it in Supabase Dashboard → Edge Functions → Secrets

### Emails going to spam
- Use a verified domain instead of `onboarding@resend.dev`
- Add SPF, DKIM, and DMARC records (Resend provides these)
- Warm up your domain by sending emails gradually

### CORS errors in browser console
- The updated function includes proper CORS headers
- Make sure you deployed the latest version

---

## 📝 Verification Checklist

- [ ] Supabase CLI installed
- [ ] Logged into Supabase CLI
- [ ] Project linked to Supabase
- [ ] login-notifier function deployed
- [ ] Resend account created
- [ ] Resend API key obtained
- [ ] RESEND_API_KEY added to Supabase secrets
- [ ] Tested login on your site
- [ ] Email received in inbox

---

## 💡 Additional Features You Can Add

### 1. Add IP Address and Location
Update Login.tsx to send more data:
```typescript
const response = await fetch('https://ipapi.co/json/');
const ipData = await response.json();

await supabase.functions.invoke('login-notifier', {
  body: {
    email: data.user?.email,
    timestamp: new Date().toISOString(),
    ip: ipData.ip,
    location: `${ipData.city}, ${ipData.country_name}`
  }
});
```

### 2. Add Browser/Device Info
```typescript
await supabase.functions.invoke('login-notifier', {
  body: {
    email: data.user?.email,
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,
    device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
  }
});
```

### 3. Rate Limiting
To prevent spam, add rate limiting in the Edge Function using Upstash Redis or similar.

---

## 🆘 Need Help?

If you're stuck:
1. Check Supabase Edge Function logs
2. Check Resend dashboard logs
3. Check browser console for errors
4. Make sure your Vercel deployment is up to date

---

**Last Updated:** January 5, 2026

**Status:** ✅ Ready to deploy
