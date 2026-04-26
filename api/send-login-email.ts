import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).send('No email provided');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Clutch Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Security Alert: New Login to Your Clutch Account',
      html: `
        <div style="font-family: monospace; background: #0a0a0a; color: #ffffff; padding: 32px; max-width: 600px; margin: auto; border: 1px solid #333;">
          <h2 style="color: #ffffff; letter-spacing: 2px; font-size: 18px;">⚠ CLUTCH SECURITY ALERT</h2>
          <hr style="border-color: #333;" />
          <p style="color: #ccc;">A new sign-in was detected on your account:</p>
          <table style="color: #aaa; font-size: 13px; margin: 16px 0;">
            <tr><td style="padding: 4px 12px 4px 0; color: #555;">ACCOUNT</td><td style="color: #fff;">${email}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #555;">TIME</td><td style="color: #fff;">${new Date().toUTCString()}</td></tr>
          </table>
          <hr style="border-color: #333;" />
          <p style="color: #ccc;">If this was <strong style="color: #fff;">you</strong>, you can safely ignore this email.</p>
          <p style="color: #ccc;">If this was <strong style="color: #ff4444;">NOT you</strong>, reset your password immediately:</p>
          <br/>
          <p style="color: #555; font-size: 11px;">— The Clutch Security System</p>
        </div>
      `,
    });

    console.log('Email sent:', info.messageId);
    return res.status(200).send('Email sent successfully!');
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).send('Internal Server Error: ' + error.message);
  }
}