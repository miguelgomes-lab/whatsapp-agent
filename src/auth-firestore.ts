import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys'
import { getFirestore } from './firebase'

const SESSION_DOC = 'whatsapp_session'
const COLLECTION = 'baileys_auth'

export async function useFirestoreAuthState() {
  const db = getFirestore()

  const writeData = async (key: string, data: any) => {
    const value = JSON.stringify(data, BufferJSON.replacer)
    await db.collection(COLLECTION).doc(SESSION_DOC).set({ [key]: value }, { merge: true })
  }

  const readData = async (key: string) => {
    const doc = await db.collection(COLLECTION).doc(SESSION_DOC).get()
    if (!doc.exists) return null
    const raw = doc.data()?.[key]
    if (!raw) return null
    return JSON.parse(raw, BufferJSON.reviver)
  }

  const removeData = async (key: string) => {
    await db.collection(COLLECTION).doc(SESSION_DOC).update({ [key]: null })
  }

  // Carregar ou criar credenciais
  const creds = (await readData('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const data: Record<string, any> = {}
          for (const id of ids) {
            let value = await readData(`key_${type}_${id}`)
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value)
            }
            data[id] = value
          }
          return data
        },
        set: async (data: Record<string, Record<string, any>>) => {
          for (const [type, ids] of Object.entries(data)) {
            for (const [id, value] of Object.entries(ids)) {
              if (value) {
                await writeData(`key_${type}_${id}`, value)
              } else {
                await removeData(`key_${type}_${id}`)
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      await writeData('creds', creds)
    },
  }
}
