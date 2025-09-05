// index.js
const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Charger la clé Firebase Admin depuis une variable d'environnement (recommandé)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Service account loaded from env var');
  } catch (err) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON', err);
    process.exit(1);
  }
} else {
  // Fallback local file (utile en dev). NE PAS commit le fichier JSON en prod.
  try {
    serviceAccount = require('./diraa-2005-firebase-adminsdk-g5wop-00fee2b3c1.json');
    console.warn('⚠️ Using local service account file — use env var in production');
  } catch (err) {
    console.error('❌ No Firebase service account provided (env or file).');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const NOTIFY_SECRET = process.env.NOTIFY_SECRET || null;

// Health route
app.get('/', (req, res) => res.send('🚀 Backend CinetPay opérationnel et connecté à Firebase !'));

// Notify route (CinetPay)
app.post('/cinetpay/notify', async (req, res) => {
  try {
    // Vérification simple de secret (header x-notify-secret ou body.secret)
    if (NOTIFY_SECRET) {
      const incoming = req.get('x-notify-secret') || req.body?.secret || req.query?.secret;
      if (!incoming || incoming !== NOTIFY_SECRET) {
        console.warn('⚠️ Notify secret mismatch or missing');
        return res.status(403).send('Forbidden');
      }
    }

    const payload = req.body || {};
    console.log('📩 Notification reçue:', payload);

    // Récupérer des champs communs (adapter selon le payload de CinetPay)
    const transaction_id = payload.transaction_id || payload.transaction?.id || `${Date.now()}`;
    const status = payload.status || payload.transaction?.status || payload.result || 'unknown';
    const amount = payload.amount || payload.transaction?.amount || null;
    const currency = payload.currency || payload.transaction?.currency || null;

    // Écrire (merge true pour éviter d'écraser)
    await db.collection('paiements').doc(String(transaction_id)).set({
      transaction_id,
      status,
      amount,
      currency,
      raw_payload: payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Paiement ${transaction_id} enregistré.`);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Erreur:', err);
    return res.status(500).send('Erreur serveur');
  }
});

// Démarrage
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur le port ${PORT}`));
