const nodemailer = require('nodemailer');

// Create transporter based on our email service memory
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Helper function to send email
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `FirstVITE.com <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};

// Email templates
const emailTemplates = {
  verificationEmail: (name, otp) => ({
    subject: 'Welcome to FirstVITE - Email Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50; text-align: center;">Welcome to FirstVITE! 🎉</h1>
        <p style="color: #34495e; font-size: 16px;">Hi ${name},</p>
        <p style="color: #34495e; font-size: 16px;">Thank you for joining FirstVITE. To complete your registration, please use the following verification code:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h2 style="color: #2c3e50; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p style="color: #34495e; font-size: 16px;">This code will expire in 10 minutes.</p>
        <p style="color: #34495e; font-size: 14px;">If you didn't create an account with FirstVITE, please ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px; text-align: center;">${new Date().getFullYear()} FirstVITE. All rights reserved.</p>
      </div>
    `
  }),

  welcomeEmail: (name) => ({
    subject: 'Welcome to FirstVITE - Account Verified!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c3e50; text-align: center;">Welcome to FirstVITE! 🎉</h1>
        <p style="color: #34495e; font-size: 16px;">Dear ${name},</p>
        <p style="color: #34495e; font-size: 16px;">Your email has been successfully verified! Welcome to the FirstVITE community.</p>
        <p style="color: #34495e; font-size: 16px;">You can now log in to your account and start exploring all our features.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/login" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
        </div>
        <p style="color: #34495e; font-size: 16px;">If you have any questions or need assistance, feel free to contact our support team.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px; text-align: center;">${new Date().getFullYear()} FirstVITE. All rights reserved.</p>
      </div>
    `
  }),

  enrollmentConfirmation: (userName, programTitle) => ({
    subject: `Enrollment Confirmation - ${programTitle}`,
    html: `
      <h1>Welcome to ${programTitle}!</h1>
      <p>Dear ${userName},</p>
      <p>Thank you for enrolling in ${programTitle}. We're excited to have you join us!</p>
      <p>You can access your course materials through your dashboard.</p>
    `
  }),

  corporateRequest: (companyName, contactPerson, programTitle) => ({
    subject: 'New Corporate Training Request',
    html: `
      <h1>New Corporate Training Request</h1>
      <p>Company: ${companyName}</p>
      <p>Contact Person: ${contactPerson}</p>
      <p>Program: ${programTitle}</p>
    `
  })
};

// Helper function to send verification email
const sendVerificationEmail = async (email, name, otp) => {
  const template = emailTemplates.verificationEmail(name, otp);
  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

// Helper function to send welcome email
const sendWelcomeEmail = async (email, name) => {
  const template = emailTemplates.welcomeEmail(name);
  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  emailTemplates
};
