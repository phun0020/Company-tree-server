const admin = require('firebase-admin');
const serviceAccount = require('./CompanyTree-28202703c8a3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;