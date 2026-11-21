import nodemailer from 'nodemailer';

const user = 'parthsinhgohil01@gmail.com';
const pass = 'kckbikmewiwqpruu';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user,
    pass
  }
});

console.log(`Testing SMTP connection for ${user}...`);

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP verification failed:', error.message);
    process.exit(1);
  } else {
    console.log('SUCCESS: Gmail SMTP is authenticated and ready to deliver real emails!');
    process.exit(0);
  }
});
