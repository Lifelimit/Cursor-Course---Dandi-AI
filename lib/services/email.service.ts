import nodemailer from "nodemailer";

export async function sendAlertEmail(to: string, keyName: string, usagePct: number, threshold: number) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP credentials missing in environment variables. Email not sent.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: Number(SMTP_PORT) === 465, // Use SSL/TLS for port 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const mailOptions = {
    from: '"Dandi" <alerts@dandi.ai>',
    to,
    subject: `⚠️ Action Required: API Key Usage Alert (${keyName})`,
    text: `Your API key "${keyName}" has exceeded its alert threshold of ${threshold}%. Current usage is at ${Math.round(usagePct)}%. Please log in to manage your keys.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Key Usage Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; width: 100%; overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 32px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">dandi.ai</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Usage Alert</span>
                    </div>
                    
                    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; text-align: center;">Threshold Exceeded</h2>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                      Your API key <strong>${keyName}</strong> has crossed the alert threshold of <strong>${threshold}%</strong>.
                    </p>

                    <!-- Metrics Box -->
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 32px; text-align: center;">
                      <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Current Usage</div>
                      <div style="font-size: 36px; font-weight: 700; color: #111827;">${Math.round(usagePct)}%</div>
                    </div>

                    <!-- CTA -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL}/account?tab=api" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">Manage API Keys</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 20px;">
                      You are receiving this because you enabled email alerts for this API key.<br>
                      &copy; ${new Date().getFullYear()} Dandi AI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch {
    console.error("Failed to send a usage alert email.");
  }
}

export async function sendPlanChangeScheduledEmail(
  to: string,
  currentPlanName: string,
  newPlanName: string,
  effectiveDate: string
) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP credentials missing in environment variables. Email not sent.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const mailOptions = {
    from: '"Dandi" <billing@dandi.ai>',
    to,
    subject: `📅 Subscription Change Scheduled: ${currentPlanName} ➔ ${newPlanName}`,
    text: `Your plan change from ${currentPlanName} to ${newPlanName} has been scheduled. This change will take effect at the end of your current billing period on ${effectiveDate}.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Change Scheduled</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; width: 100%; overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 32px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">dandi.ai</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <span style="display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📅 Plan Update</span>
                    </div>
                    
                    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; text-align: center;">Subscription Change Scheduled</h2>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                      You have scheduled a switch from your current plan to a new plan.
                    </p>

                    <!-- Details Box -->
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 20px;">
                        <tr>
                          <td style="color: #6b7280; padding-bottom: 8px; width: 40%;">Current Plan:</td>
                          <td style="color: #111827; font-weight: 600; padding-bottom: 8px;">${currentPlanName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding-bottom: 8px;">Scheduled Plan:</td>
                          <td style="color: #111827; font-weight: 600; padding-bottom: 8px;">${newPlanName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280;">Effective Date:</td>
                          <td style="color: #111827; font-weight: 600;">${effectiveDate}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 24px 0; text-align: center; font-style: italic;">
                      Note: You will retain access to your current plan features and pricing until the effective date, at which point you will automatically transition to the new plan.
                    </p>

                    <!-- CTA -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dandi.ai"}/dashboards" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">Go to Dashboard</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 20px;">
                      If you did not authorize this change, please contact support immediately.<br>
                      &copy; ${new Date().getFullYear()} Dandi AI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch {
    console.error("Failed to send a scheduled plan-change email.");
  }
}
