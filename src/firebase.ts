import * as admin from 'firebase-admin'

let db: admin.firestore.Firestore

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    if (!admin.apps.length) {
      // Normalizar a private key — funciona com \n literais ou quebras de linha reais
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || ''
      const privateKey = rawKey.includes('\\n')
        ? rawKey.replace(/\\n/g, '\n')
        : rawKey

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      })
    }
    db = admin.firestore()
  }
  return db
}
