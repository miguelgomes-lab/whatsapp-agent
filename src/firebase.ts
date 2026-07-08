import * as admin from 'firebase-admin'

let db: admin.firestore.Firestore

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    }
    db = admin.firestore()
  }
  return db
}
