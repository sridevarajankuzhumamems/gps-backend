const crypto = require('crypto');
const Otp = require('../models/Otp');
const Session = require('../models/Session');

exports.sendOtp = async (req, res) => {
  const { name, mobile, email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  try {
    await Otp.save(email, otp, expiresAt);
    console.log(`\n=======================================\n🔥 OTP for ${email}: ${otp}\n=======================================\n`);

    if (!process.env.RESEND_API_KEY) {
      console.error('Email sending failed: RESEND_API_KEY is missing.');
      return res.status(500).json({ error: 'Email service (Resend API key) is not configured.' });
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your GPS Admin Login OTP',
      html: `<p>Hello ${name || 'Admin'},</p><p>Your OTP for GPS Admin Login is: <strong>${otp}</strong></p><p>This OTP is valid for 5 minutes.</p>`
    });

    res.json({
      success: true,
      message: 'OTP sent to email'
    });
  } catch (err) {
    console.error('Error generating or sending OTP:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { name, mobile, email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const status = await Otp.verify(email, otp);
    if (!status) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }
    if (status === 'expired') {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await Session.create(token, email, name || 'Admin', mobile || '');

    res.json({
      success: true,
      token,
      admin: { name: name || 'Admin', mobile: mobile || '', email }
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.verifyToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const session = await Session.verify(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    res.json({
      success: true,
      admin: {
        name: session.name,
        mobile: session.mobile,
        email: session.email
      }
    });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.logout = async (req, res) => {
  const { token } = req.body;
  if (token) {
    try {
      await Session.delete(token);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
  res.json({ success: true });
};

exports.autoLogin = async (req, res) => {
  const { name, mobile, email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const token = crypto.randomBytes(32).toString('hex');
    await Session.create(token, email, name || 'Admin', mobile || '');

    res.json({
      success: true,
      token,
      admin: { name: name || 'Admin', mobile: mobile || '', email }
    });
  } catch (err) {
    console.error('Error in auto-login:', err);
    res.status(500).json({ error: 'Auto-login failed' });
  }
};
