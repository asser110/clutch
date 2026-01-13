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
  // This function will be triggered by a Supabase Webhook.
  // We first check if the request method is POST.
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // The webhook sends a payload with information about the event.
    // We are interested in the 'record', which contains the user's data.
    const { record } = await req.json();
    const userEmail = record.email;

    if (!userEmail) {
      console.warn("Webhook payload did not contain a user email.");
      return new Response('No email provided in payload', { status: 400 });
    }

    console.log(`Sending login notification to: ${userEmail}`);

    // Here we use the Resend client to send the actual email.
    const { data, error } = await resend.emails.send({
      from: `Clutch Security <${FROM_EMAIL}>`,
      to: [userEmail],
      subject: 'New Login to Your Clutch Account',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd;">
          <h2 style="color: #000;">Security Alert: New Sign-In</h2>
          <p>We detected a new sign-in to your Clutch account associated with this email address.</p>
          <p>If this was you, you can safely ignore this email.</p>
          <p><b>If you don't recognize this activity, we recommend changing your password immediately.</b></p>
          <br/>
          <p>Thanks,</p>
          <p>The Clutch Team</p>
        </div>
      `,
    });

    if (error) {
      console.error({ error });
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    console.log("Email sent successfully!");
    return new Response('Email sent successfully!', { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
})
