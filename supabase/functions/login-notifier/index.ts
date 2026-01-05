// File: supabase/functions/login-notifier/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'onboarding@resend.dev'; // Change this to your verified domain email

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, timestamp } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending login notification to: ${email}`);

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: '🔒 Security Alert: New Login to Your Clutch Account',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: 'Press Start 2P', 'Courier New', monospace; 
                  background-color: #000; 
                  color: #fff; 
                  margin: 0; 
                  padding: 20px;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background-color: #1a1a1a; 
                  border: 3px solid #fff; 
                  padding: 30px;
                  box-shadow: 8px 8px 0px #999;
                }
                .header { 
                  text-align: center; 
                  font-size: 24px; 
                  margin-bottom: 30px; 
                  color: #fff;
                  text-transform: uppercase;
                }
                .alert-box { 
                  background-color: #ff0000; 
                  color: #fff; 
                  padding: 20px; 
                  margin: 20px 0;
                  border: 2px solid #fff;
                  text-align: center;
                  font-size: 14px;
                }
                .content { 
                  line-height: 2; 
                  font-size: 12px; 
                  color: #ccc;
                }
                .timestamp { 
                  background-color: #2a2a2a; 
                  padding: 15px; 
                  margin: 20px 0;
                  border-left: 4px solid #fff;
                  font-size: 10px;
                  color: #0f0;
                }
                .button { 
                  display: inline-block; 
                  background-color: #fff; 
                  color: #000; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  margin: 20px 0;
                  border: none;
                  box-shadow: 4px 4px 0px #999;
                  font-size: 12px;
                  text-transform: uppercase;
                  font-weight: bold;
                }
                .footer { 
                  margin-top: 30px; 
                  padding-top: 20px; 
                  border-top: 2px solid #333; 
                  font-size: 10px; 
                  color: #666;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">🔒 CLUTCH SECURITY 🔒</div>
                
                <div class="alert-box">
                  ⚠️ NEW LOGIN DETECTED ⚠️
                </div>
                
                <div class="content">
                  <p>Hello,</p>
                  
                  <p>We detected a new login to your Clutch account.</p>
                  
                  <div class="timestamp">
                    <strong>LOGIN TIME:</strong><br/>
                    ${new Date(timestamp || Date.now()).toLocaleString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </div>
                  
                  <p><strong>If this was you:</strong></p>
                  <p>You can safely ignore this email. Your account is secure.</p>
                  
                  <p><strong style="color: #ff0000;">If this wasn't you:</strong></p>
                  <p>Your account may have been compromised. Please change your password immediately and review your account activity.</p>
                  
                  <div style="text-align: center;">
                    <a href="https://xwdkjwitfafpwniffbeg.supabase.co" class="button" style="color: #000;">
                      SECURE MY ACCOUNT
                    </a>
                  </div>
                </div>
                
                <div class="footer">
                  <p>This is an automated security notification from Clutch.</p>
                  <p>If you have any questions, please contact our security team.</p>
                  <p>© ${new Date().getFullYear()} Clutch. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Email sent successfully!', resendData);
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', data: resendData }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
