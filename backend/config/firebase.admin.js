const admin = require('firebase-admin');

const hasFirebaseAdminConfig = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

if (hasFirebaseAdminConfig && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const isFirebaseAdminConfigured = hasFirebaseAdminConfig && admin.apps.length > 0;

const verifyFirebaseToken = async (idToken) => {
  if (!isFirebaseAdminConfigured) {
    throw new Error('Firebase Admin is not configured on the server');
  }
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { admin, isFirebaseAdminConfigured, verifyFirebaseToken };
