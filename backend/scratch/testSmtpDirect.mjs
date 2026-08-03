import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const user = (process.env.SMTP_USER || '').replace(/"/g, '');
const pass = (process.env.SMTP_PASS || '').replace(/"/g, '');

console.log('Testing SMTP connection with credentials from .env:');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', user);
console.log('Pass:', pass ? '**** (App Password set)' : 'MISSING');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user,
    pass
  }
});

try {
  const verifyRes = await transporter.verify();
  console.log('✅ SMTP Transporter Connection VERIFIED SUCCESSFUL:', verifyRes);
} catch (err) {
  console.error('❌ SMTP Transporter Verification FAILED:', err.message);
}
