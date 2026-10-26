jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
  const verify = jest.fn().mockResolvedValue(true);
  const transporter = { sendMail, verify };

  return {
    createTransport: jest.fn(() => transporter),
  };
});

const nodemailer = require('nodemailer');
process.env.GMAIL_USER = 'test@example.com';
process.env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop';
const { sendWelcomeEmail } = require('./email');

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    process.env.GMAIL_USER = 'test@example.com';
  });

  test('sends a branded welcome email with exam details and dashboard link', async () => {
    await sendWelcomeEmail({
      to: 'student@example.com',
      name: 'Ram Kumar',
      targetExams: ['GROUP_1', 'GROUP_2'],
    });

    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    const transport = nodemailer.createTransport.mock.results[0].value;
    expect(transport.sendMail).toHaveBeenCalledTimes(1);

    const mailPayload = transport.sendMail.mock.calls[0][0];
    expect(mailPayload.from).toBe('"TNPSC Prep" <test@example.com>');
    expect(mailPayload.to).toBe('student@example.com');
    expect(mailPayload.subject).toContain('Welcome to TNPSC Prep');
    expect(mailPayload.html).toContain('TNPSC Prep');
    expect(mailPayload.html).toContain('Ram Kumar');
    expect(mailPayload.html).toContain('GROUP_1');
    expect(mailPayload.html).toContain('/dashboard');
  });

  test('removes spaces from Gmail app passwords before configuring SMTP', () => {
    const transportConfig = nodemailer.createTransport.mock.calls[0][0];
    expect(transportConfig.auth.pass).toBe('abcdefghijklmnop');
  });
});
