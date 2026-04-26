// File: supabase/functions/login-notifier/index.ts
// Sends a security alert email via Gmail SMTP when a new login is detected.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

declare const Deno: {
  env: { get: (key: string) => string | undefined };
};

const GMAIL_USER = Deno.env.get('GMAIL_USER')!;
const GMAIL_APP_PASS = Deno.env.get('GMAIL_APP_PASS')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const userEmail = body?.record?.email ?? body?.record?.user_id ?? null;

    if (!userEmail) {
      console.warn('No user email found in webhook payload.');
      return new Response('No email in payload', { status: 400 });
    }

    console.log(`Sending login alert to: ${userEmail}`);

    // Use port 587 with STARTTLS
    const conn = await Deno.connectTls('smtp.gmail.com', 587);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd));
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      return decoder.decode(buf.slice(0, n));
    }

    // Read greeting
    let response = await sendCommand('');
    console.log('SMTP greeting:', response.substring(0, 100));

    // EHLO
    response = await sendCommand('EHLO localhost\r\n');
    console.log('EHLO:', response.substring(0, 100));

    // STARTTLS
    response = await sendCommand('STARTTLS\r\n');
    console.log('STARTTLS:', response.substring(0, 100));

    // Upgrade to TLS
    const tlsConn = await Deno.startTls(conn, { hostname: 'smtp.gmail.com' });

    // EHLO again after TLS
    await tlsConn.write(encoder.encode('EHLO localhost\r\n'));
    let buf = new Uint8Array(4096);
    let n = await tlsConn.read(buf);

    // AUTH LOGIN
    await tlsConn.write(encoder.encode('AUTH LOGIN\r\n'));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);
    console.log('AUTH LOGIN:', decoder.decode(buf.slice(0, n)));

    // Username
    await tlsConn.write(encoder.encode(btoa(GMAIL_USER) + '\r\n'));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);
    console.log('Username response:', decoder.decode(buf.slice(0, n)));

    // Password (App Password)
    await tlsConn.write(encoder.encode(GMAIL_APP_PASS + '\r\n'));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);
    const authResponse = decoder.decode(buf.slice(0, n));
    console.log('Auth response:', authResponse);

    if (!authResponse.startsWith('235')) {
      throw new Error(`AUTH failed: ${authResponse}`);
    }

    // MAIL FROM
    await tlsConn.write(encoder.encode(`MAIL FROM:<${GMAIL_USER}>\r\n`));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);

    // RCPT TO
    await tlsConn.write(encoder.encode(`RCPT TO:<${userEmail}>\r\n`));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);

    // DATA
    await tlsConn.write(encoder.encode('DATA\r\n'));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);

    const emailHtml = `
<div style="font-family: monospace; background: #0a0a0a; color: #ffffff; padding: 32px; max-width: 600px; margin: auto; border: 1px solid #333;">
  <h2 style="color: #ffffff; letter-spacing: 2px; font-size: 18px;">⚠ CLUTCH SECURITY ALERT</h2>
  <hr style="border-color: #333;" />
  <p style="color: #ccc;">A new sign-in was detected on your account:</p>
  <table style="color: #aaa; font-size: 13px; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">ACCOUNT</td><td style="color: #fff;">${userEmail}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #555;">TIME</td><td style="color: #fff;">${new Date().toUTCString()}</td></tr>
  </table>
  <hr style="border-color: #333;" />
  <p style="color: #ccc;">If this was <strong style="color: #fff;">you</strong>, you can safely ignore this email.</p>
  <p style="color: #ccc;">If this was <strong style="color: #ff4444;">NOT you</strong>, reset your password immediately:</p>
  <br/>
  <p style="color: #555; font-size: 11px;">— The Clutch Security System</p>
</div>`;

    const emailContent = [
      `From: ${GMAIL_USER}`,
      `To: ${userEmail}`,
      `Subject: =?UTF-8?B?${btoa('🔐 Security Alert: New Login to Your Clutch Account')}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      '',
      emailHtml,
      '',
      '.',
    ].join('\r\n');

    await tlsConn.write(encoder.encode(emailContent + '\r\n'));
    buf = new Uint8Array(4096);
    n = await tlsConn.read(buf);
    console.log('DATA response:', decoder.decode(buf.slice(0, n)));

    // QUIT
    await tlsConn.write(encoder.encode('QUIT\r\n'));
    tlsConn.close();

    console.log('Login alert email sent successfully!');
    return new Response('Email sent successfully!', { status: 200 });

  } catch (err) {
    console.error('Failed to send login alert:', err);
    return new Response('Internal Server Error: ' + String(err), { status: 500 });
  }
});