/**
 * Email Service - Brevo (Sendinblue) Integration
 * 
 * Handles sending transactional emails for password reset, etc.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface BrevoEmailPayload {
  sender: { name: string; email: string };
  to: { email: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send an email using Brevo API
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }
  
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@laocinema.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Lao Cinema';
  
  const payload: BrevoEmailPayload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.htmlContent,
  };
  
  if (options.textContent) {
    payload.textContent = options.textContent;
  }
  
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Brevo API error:', response.status, errorData);
      return { success: false, error: `Email service error: ${response.status}` };
    }
    
    const data = await response.json() as { messageId?: string };
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  locale: 'en' | 'lo' = 'en'
): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/${locale}/reset-password?token=${resetToken}`;
  
  const isEnglish = locale === 'en';
  
  const subject = isEnglish 
    ? 'Reset Your Password - Lao Cinema' 
    : 'ຣີເຊັດລະຫັດຜ່ານຂອງທ່ານ - Lao Cinema';
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 28px;">🎬 Lao Cinema</h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1a1a2e; margin-top: 0;">
      ${isEnglish ? 'Reset Your Password' : 'ຣີເຊັດລະຫັດຜ່ານຂອງທ່ານ'}
    </h2>
    
    <p>
      ${isEnglish 
        ? 'We received a request to reset your password. Click the button below to create a new password:'
        : 'ພວກເຮົາໄດ້ຮັບການຮ້ອງຂໍໃຫ້ຣີເຊັດລະຫັດຜ່ານຂອງທ່ານ. ຄລິກປຸ່ມຂ້າງລຸ່ມເພື່ອສ້າງລະຫັດຜ່ານໃໝ່:'}
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #e50914; color: #fff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        ${isEnglish ? 'Reset Password' : 'ຣີເຊັດລະຫັດຜ່ານ'}
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      ${isEnglish 
        ? 'This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.'
        : 'ລິ້ງນີ້ຈະໝົດອາຍຸໃນ 1 ຊົ່ວໂມງ. ຖ້າທ່ານບໍ່ໄດ້ຮ້ອງຂໍໃຫ້ຣີເຊັດລະຫັດຜ່ານ, ທ່ານສາມາດບໍ່ສົນໃຈອີເມລນີ້ໄດ້.'}
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; margin: 0;">
      ${isEnglish 
        ? "If the button doesn't work, copy and paste this link into your browser:"
        : 'ຖ້າປຸ່ມບໍ່ເຮັດວຽກ, ກະລຸນາຄັດລອກແລະວາງລິ້ງນີ້ໃນບຣາວເຊີຂອງທ່ານ:'}
    </p>
    <p style="color: #666; font-size: 12px; word-break: break-all;">
      <a href="${resetUrl}" style="color: #0066cc;">${resetUrl}</a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Lao Cinema. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
  
  const textContent = isEnglish
    ? `Reset Your Password - Lao Cinema

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Lao Cinema`
    : `ຣີເຊັດລະຫັດຜ່ານຂອງທ່ານ - Lao Cinema

ພວກເຮົາໄດ້ຮັບການຮ້ອງຂໍໃຫ້ຣີເຊັດລະຫັດຜ່ານຂອງທ່ານ. ຄລິກລິ້ງຂ້າງລຸ່ມເພື່ອສ້າງລະຫັດຜ່ານໃໝ່:

${resetUrl}

ລິ້ງນີ້ຈະໝົດອາຍຸໃນ 1 ຊົ່ວໂມງ.

© ${new Date().getFullYear()} Lao Cinema`;
  
  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent,
  });
}
