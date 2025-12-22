import firebase from "firebase/app";
import "firebase/auth";

/*
  FIREBASE SETUP STEPS:
  1. Go to console.firebase.google.com
  2. Create a new project.
  3. Go to "Project settings" -> "General" -> "Your apps" -> Add Web App.
  4. Copy the "firebaseConfig" object.
  5. Go to "Build" -> "Authentication" -> "Sign-in method" -> Enable Google.
  6. Add your API keys to your environment variables (e.g., .env file).
*/

const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyDummyKeyForDemo-PleaseReplace";

// Detect if we are using the dummy key or if the key is missing
const isMockMode = !API_KEY || API_KEY === "AIzaSyDummyKeyForDemo-PleaseReplace";

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-app",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Only initialize real Firebase if we have a valid-looking key
if (!isMockMode) {
  try {
    // Check if firebase is already initialized to avoid re-initialization error
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    console.warn("Falling back to Mock Mode due to initialization failure.");
  }
}

// --- MOCK IMPLEMENTATION STATE ---
// This is used when no real API key is provided
let mockUser: Partial<firebase.User> | null = null;
const mockListeners: Array<(user: firebase.User | null) => void> = [];

const notifyListeners = () => {
  mockListeners.forEach(listener => listener(mockUser as firebase.User));
};

// --- EXPORTED FUNCTIONS ---

export const loginWithGoogle = async () => {
  if (isMockMode) {
    console.log("%c [Mock Mode] Logging in...", "color: orange; font-weight: bold;");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    mockUser = {
      uid: "mock-user-123",
      displayName: "Demo Student",
      email: "student@example.com",
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      metadata: {} as any,
      providerData: [],
      refreshToken: "mock-token",
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => "mock-token",
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
    } as unknown as firebase.User;
    
    notifyListeners();
    return mockUser;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  if (isMockMode) {
    console.log("%c [Mock Mode] Logging out...", "color: orange; font-weight: bold;");
    mockUser = null;
    notifyListeners();
    return;
  }

  try {
    await firebase.auth().signOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

export const subscribeToAuthChanges = (callback: (user: firebase.User | null) => void) => {
  if (isMockMode) {
    // Register listener
    mockListeners.push(callback);
    // Trigger immediately with current state
    callback(mockUser as firebase.User);
    
    // Return unsubscribe function
    return () => {
      const index = mockListeners.indexOf(callback);
      if (index > -1) mockListeners.splice(index, 1);
    };
  }

  return firebase.auth().onAuthStateChanged(callback);
};