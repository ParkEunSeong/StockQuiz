import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyD0LGwk4PLHK8B8H0ofFh3c3GXyzwXoR5o',
  authDomain: 'stocknews-8edaf.firebaseapp.com',
  projectId: 'stocknews-8edaf',
  storageBucket: 'stocknews-8edaf.firebasestorage.app',
  messagingSenderId: '436452495850',
  appId: '1:436452495850:web:9f9518b482375be0826293',
  measurementId: 'G-P64E02CRJS',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

let authPromise: Promise<string> | undefined
export function getFirebaseUid(): Promise<string> {
  authPromise ??= (async () => {
    await auth.authStateReady()
    return (auth.currentUser ?? (await signInAnonymously(auth)).user).uid
  })().catch(error => {
    authPromise = undefined
    throw error
  })
  return authPromise
}

if (typeof window !== 'undefined') {
  void isAnalyticsSupported().then(supported => {
    if (supported) getAnalytics(firebaseApp)
  }).catch(() => {})
}
