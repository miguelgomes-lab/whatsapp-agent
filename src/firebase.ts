import * as admin from 'firebase-admin'

let db: admin.firestore.Firestore

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    if (!admin.apps.length) {
      // Suporta FIREBASE_SERVICE_ACCOUNT (JSON completo) ou variáveis separadas
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        })
      } else {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || ''
        const privateKey = rawKey.replace(/\\n/g, '\n')
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        })
      }
    }
    db = admin.firestore()
  }
  return db
}
