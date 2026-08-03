import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Testing SMTP connection with credentials from .env:');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_USER);
console.log('Pass:', process.env.SMTP_PASS ? '**** (Set)' : 'MISSING');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // 587 uses STARTTLS
  auth: {
    user: process.env.SMTP_USER?.replace(/"/g, ''),
    pass: process.env.SMTP_PASS?.replace(/"/g, '')
  }
});

try {
  const verifyRes = await transporter.verify();
  console.log('✅ SMTP Transporter Connection VERIFIED SUCCESSFUL:', verifyRes);
} catch (err) {
  console.error('❌ SMTP Transporter Verification FAILED:', err.message);
}
