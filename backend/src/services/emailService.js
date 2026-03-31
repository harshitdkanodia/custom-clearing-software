const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendEmail({ to, subject, html, text }) {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject,
            text,
            html,
        });
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error('Email send error:', err);
        // Don't throw error in development to avoid breaking flows if SMTP is not configured
        if (process.env.NODE_ENV === 'production') throw err;
        return null;
    }
}

async function sendOtpEmail(email, otp) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
            <h2 style="color: #1e40af;">Password Reset OTP</h2>
            <p>Your One-Time Password (OTP) for resetting your CHA Management System password is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; padding: 20px; text-align: center; background: #f3f4f6; border-radius: 8px;">
                ${otp}
            </div>
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
    `;
    return sendEmail({
        to: email,
        subject: 'Your Password Reset OTP',
        html,
        text: `Your password reset OTP is ${otp}. Valid for 10 minutes.`,
    });
}

async function sendBillingEmail(email, subject, shipment, billing) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #1e40af;">Invoice for Shipment ${shipment.onsJobNumber}</h2>
            <p>Dear Customer,</p>
            <p>The billing for your shipment <strong>${shipment.onsJobNumber}</strong> has been prepared.</p>
            <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <p style="margin: 5px 0;"><strong>Job Number:</strong> ${shipment.onsJobNumber}</p>
                <p style="margin: 5px 0;"><strong>Customer:</strong> ${shipment.customer?.customerName}</p>
                <p style="margin: 5px 0;"><strong>Bill Amount:</strong> ₹${parseFloat(billing.billAmount || 0).toLocaleString('en-IN')}</p>
                <p style="margin: 5px 0;"><strong>VESSEL/VOYAGE:</strong> ${shipment.vesselNameVoyage || 'N/A'}</p>
            </div>
            <p>You can view and download your documents by logging into the portal.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL}/login" style="background: #1e40af; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification. Please do not reply.</p>
        </div>
    `;
    return sendEmail({
        to: email,
        subject,
        html,
        text: `Invoice for Shipment ${shipment.onsJobNumber}. Amount: ₹${billing.billAmount}. Login to portal to view details.`,
    });
}

module.exports = { sendOtpEmail, sendBillingEmail, sendEmail };
