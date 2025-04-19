const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Send verification email
exports.sendVerificationEmail = async (email, otp) => {
  const mailOptions = {
    from: `"FirstVITE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Email Verification - FirstVITE',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4a5568; text-align: center; margin-bottom: 30px;">Welcome to FirstVITE! 🎉</h1>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Thank you for registering with FirstVITE. To ensure the security of your account, please verify your email address using the following verification code:</p>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h2 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p style="color: #718096; font-size: 14px;">This code will expire in 10 minutes for security purposes.</p>
        <div style="border-top: 2px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #718096; font-size: 12px; text-align: center;">
            If you did not request this verification, please ignore this email.<br>
            For security reasons, never share this code with anyone.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send welcome email after verification
exports.sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"FirstVITE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to FirstVITE! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4a5568; text-align: center; margin-bottom: 30px;">Welcome aboard, ${name}! 🚀</h1>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 10px; margin: 30px 0;">
          <h2 style="margin: 0; font-size: 24px;">Your account is now verified!</h2>
        </div>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
          Thank you for joining FirstVITE. We're excited to have you as part of our community! Your account has been successfully verified and you can now access all features of our platform.
        </p>

        <div style="background-color: #f7fafc; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h3 style="color: #4a5568; margin-top: 0;">What's Next?</h3>
          <ul style="color: #4a5568; font-size: 16px; line-height: 1.5;">
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Connect with others</li>
            <li>Start your journey with us</li>
          </ul>
        </div>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
          If you have any questions or need assistance, don't hesitate to reach out to our support team.
        </p>

        <div style="border-top: 2px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
          <p style="color: #718096; font-size: 12px; text-align: center;">
            Best regards,<br>
            The FirstVITE Team
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send welcome email');
  }
};
