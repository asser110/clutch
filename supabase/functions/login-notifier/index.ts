// File: supabase/functions/login-notifier/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@3.2.0';

// Fix for TypeScript error: "Cannot find name 'Deno'".
// Supabase Edge Functions run in a Deno environment, which has a global 'Deno' object.
// This declaration provides type information for the TypeScript checker.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

// This securely gets the API key you'll add as a secret in your Supabase project dashboard.
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

// For testing, Resend allows you to send from this address.
// For a real application, you would verify your own domain in your Resend account.
const FROM_EMAIL = 'onboarding@resend.dev';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { type, record, old_record } = await req.json();

    // The webhook should be configured for UPDATE events on auth.users.
    // We'll add this check for robustness.
    if (type !== 'UPDATE') {
      console.warn(`Received non-UPDATE event type: ${type}. Ignoring.`);
      return new Response('Unsupported event type', { status: 400 });
    }

    // A login updates the `last_sign_in_at` field. We check if it has changed
    // to ensure we only send an email on login, not other user updates.
    if (record.last_sign_in_at === old_record.last_sign_in_at) {
      console.log('No new login detected (last_sign_in_at unchanged). Skipping email notification.');
      return new Response('No new login detected', { status: 200 });
    }

    const userEmail = record.email;

    if (!userEmail) {
      console.warn("Webhook payload did not contain a user email.");
      return new Response('No email provided in payload', { status: 400 });
    }

    console.log(`New login detected. Sending notification to: ${userEmail}`);

    // Send email using Gmail SMTP
    await client.send({
      from: `${GMAIL_USER}`,
      to: userEmail,
      subject: 'Security Alert: New Login to Your Clutch Account',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd;">
          <h2 style="color: #000;">Security Alert: New Sign-In</h2>
          <p>Someone has logged into your Clutch account. <b>If this was not you, please change your password immediately.</b></p>
          <p>If you authorized this login, you can safely disregard this email.</p>
          <br/>
          <p>Thanks,</p>
          <p>The Clutch Security Team</p>
        </div>
      `,
    });

    await client.close();

    console.log("Email sent successfully!");
    return new Response('Email sent successfully!', { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
})
