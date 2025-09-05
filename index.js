require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// --- Initialisation Firebase Admin ---
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

// --- Route pour recevoir le NotifyUrl CinetPay ---
app.post("/cinetpay/notify", async (req, res) => {
  try {
    console.log("📩 Nouvelle notification :", req.body);

    const { transaction_id, status, amount, currency } = req.body;

    // Sauvegarde dans Firestore
    await db.collection("paiements").doc(transaction_id.toString()).set({
      transaction_id,
      status,
      amount,
      currency,
      date: new Date(),
    });

    console.log("✅ Paiement sauvegardé dans Firestore");
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Erreur :", error);
    res.status(500).send("Erreur serveur");
  }
});

// --- Route de test ---
app.get("/", (req, res) => {
  res.send("🚀 Backend CinetPay opérationnel !");
});

// --- Lancement serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});