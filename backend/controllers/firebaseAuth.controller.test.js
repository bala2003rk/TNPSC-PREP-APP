jest.mock('../models/User.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../config/firebase.admin', () => ({
  isFirebaseAdminConfigured: true,
  verifyFirebaseToken: jest.fn(),
}));

jest.mock('../utils/email', () => ({
  sendWelcomeEmail: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}));

const User = require('../models/User.model');
const { verifyFirebaseToken } = require('../config/firebase.admin');
const { sendWelcomeEmail } = require('../utils/email');
const { firebaseLogin } = require('./firebaseAuth.controller');

describe('firebaseLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  test('creates a user, sends a non-blocking welcome email, and returns app tokens', async () => {
    verifyFirebaseToken.mockResolvedValue({
      uid: 'firebase-user-id',
      email: 'student@example.com',
      email_verified: true,
      name: 'Student Name',
      picture: 'https://example.com/avatar.png',
    });
    User.findOne.mockResolvedValue(null);

    const user = {
      _id: 'mongo-user-id',
      name: 'Student Name',
      email: 'student@example.com',
      role: 'student',
      targetExams: [],
      subscription: {},
      save: jest.fn().mockResolvedValue(undefined),
      toPublicJSON: jest.fn(() => ({ _id: 'mongo-user-id', email: 'student@example.com' })),
    };
    User.create.mockResolvedValue(user);
    sendWelcomeEmail.mockReturnValue(new Promise(() => {}));

    const req = { body: { idToken: 'firebase-id-token' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await firebaseLogin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'student@example.com',
      firebaseUid: 'firebase-user-id',
      isVerified: true,
    }));
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      to: 'student@example.com',
      name: 'Student Name',
      targetExams: [],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
      user: { _id: 'mongo-user-id', email: 'student@example.com' },
    }));
  });

  test('rejects Firebase tokens without verified email', async () => {
    verifyFirebaseToken.mockResolvedValue({
      uid: 'firebase-user-id',
      email: 'student@example.com',
      email_verified: false,
    });

    const next = jest.fn();
    await firebaseLogin({ body: { idToken: 'firebase-id-token' } }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'A verified email is required for Google sign-in',
      statusCode: 401,
    }));
    expect(User.create).not.toHaveBeenCalled();
  });
});
