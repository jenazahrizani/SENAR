import { getApps, initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Baca service account dari root project
const serviceAccountPath = resolve(__dirname, '../../service-account.json');
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  console.log('✅ Service account loaded from service-account.json');
} catch (error) {
  console.error('❌ Failed to load service-account.json:', error);
  throw new Error(
    '❌ Service account file not found. Make sure service-account.json exists in the root directory.'
  );
}

const adminApp = getApps().length === 0
  ? initializeAdminApp({
      credential: cert(serviceAccount),
    })
  : getApps()[0];

const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };