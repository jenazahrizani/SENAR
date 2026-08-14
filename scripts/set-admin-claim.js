import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validasi environment variables
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('❌ FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL not found in .env');
  process.exit(1);
}

// Inisialisasi Admin SDK
const app = initializeApp({
  credential: cert({
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const auth = getAuth(app);

const setAdmin = async (email) => {
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`✅ User found: ${user.email} (${user.uid})`);
    await auth.setCustomUserClaims(user.uid, { role: 'admin' });
    console.log(`✅ Admin role granted to ${email}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User with email ${email} not found.`);
      console.log('💡 Create the user first via Firebase Console Authentication tab.');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
};

const adminEmail = 'danieldna1411@gmail.com';
setAdmin(adminEmail);