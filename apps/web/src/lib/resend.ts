import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export interface InvitationEmailData {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  invitationToken: string;
  recipientEmail: string;
}

export async function sendOrganizationInvitation(data: InvitationEmailData) {
  const { organizationName, inviterName, inviterEmail, invitationToken, recipientEmail } = data;

  // Create invitation URL - this will point to our signup/accept page
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const invitationUrl = `${baseUrl}/signup?token=${invitationToken}`;

  try {
    const { data: emailResult, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'AATX Onboarding <onboarding@aatx-crm.ahnopologetic.xyz>',
      to: [recipientEmail],
      subject: `You're invited to join ${organizationName} on AATX`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Organization Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .title { font-size: 24px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
            .org-name { color: #2563eb; font-weight: 600; }
            .content { margin-bottom: 30px; }
            .inviter-info { background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .cta-button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .cta-button:hover { background-color: #1d4ed8; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
            .link { color: #2563eb; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">AATX</div>
              <h1 class="title">You're invited to join <span class="org-name">${organizationName}</span></h1>
            </div>
            
            <div class="content">
              <p>Hello!</p>
              
              <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their organization <strong>${organizationName}</strong> on AATX Analytics.</p>
              
              <div class="inviter-info">
                <strong>Organization:</strong> ${organizationName}<br>
                <strong>Invited by:</strong> ${inviterName} (${inviterEmail})
              </div>
              
              <p>AATX Analytics helps teams track and manage their analytics implementations across repositories and tracking plans.</p>
              
              <p>Click the button below to accept the invitation and join the organization:</p>
              
              <div style="text-align: center;">
                <a href="${invitationUrl}" class="cta-button">Accept Invitation</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${invitationUrl}" class="link">${invitationUrl}</a></p>
              
              <p><em>This invitation will expire in 7 days. If you have any questions, please contact ${inviterEmail}.</em></p>
            </div>
            
            <div class="footer">
              <p>© 2024 AATX Analytics. This email was sent because you were invited to join an organization.</p>
              <p>If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
You're invited to join ${organizationName} on AATX Analytics

Hello!

${inviterName} (${inviterEmail}) has invited you to join their organization "${organizationName}" on AATX Analytics.

AATX Analytics helps teams track and manage their analytics implementations across repositories and tracking plans.

To accept the invitation and join the organization, visit:
${invitationUrl}

This invitation will expire in 7 days. If you have any questions, please contact ${inviterEmail}.

© 2024 AATX Analytics
If you did not expect this invitation, you can safely ignore this email.
      `,
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    return { success: true, emailId: emailResult?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw new Error(`Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function sendWelcomeEmail(data: {
  userName: string;
  userEmail: string;
  organizationName: string
}) {
  const { userName, userEmail, organizationName } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const { data: emailResult, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'AATX <onboarding@aatx-crm.ahnopologetic.xyz>',
      to: [userEmail],
      subject: `Welcome to ${organizationName} on AATX Analytics!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AATX</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .title { font-size: 24px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
            .org-name { color: #2563eb; font-weight: 600; }
            .cta-button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">AATX</div>
              <h1 class="title">Welcome to <span class="org-name">${organizationName}</span>!</h1>
            </div>
            
            <div class="content">
              <p>Hi ${userName}!</p>
              
              <p>Welcome to AATX Analytics! You've successfully joined <strong>${organizationName}</strong> and can now start collaborating with your team.</p>
              
              <p>Here's what you can do next:</p>
              <ul>
                <li>🔍 Explore existing repositories and tracking plans</li>
                <li>📊 Add new repositories to analyze your analytics implementation</li>
                <li>📋 Create and manage tracking plans with your team</li>
                <li>👥 Collaborate with organization members</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${baseUrl}/dashboard" class="cta-button">Go to Dashboard</a>
              </div>
            </div>
            
            <div class="footer">
              <p>© 2024 AATX Analytics. Happy tracking!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw here - welcome email is nice-to-have
      return { success: false, error: error.message };
    }

    return { success: true, emailId: emailResult?.id };
  } catch (error) {
    console.error('Welcome email service error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default resend;
