import { UserData, Message } from '../types';

const USERS_KEY = 'siya_users_db_v1';
const SESSION_KEY = 'siya_active_session_v1';

// --- Helpers ---

const getDB = (): Record<string, UserData> => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : {};
};

const saveDB = (db: Record<string, UserData>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(db));
};

// --- Auth Services ---

export const sendOTP = async (identity: string): Promise<string> => {
  // SIMULATION: In a real app, this calls an SMS/Email API.
  // Here we generate a random 4-digit code and alert it.
  return new Promise((resolve) => {
    setTimeout(() => {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      // For demo purposes, we return the OTP to be displayed or logged
      console.log(`[SIYA SECURITY] OTP for ${identity}: ${otp}`);
      resolve(otp);
    }, 1000);
  });
};

export const registerUser = (identity: string, password: string, fullName: string): boolean => {
  const db = getDB();
  if (db[identity]) return false; // User exists

  db[identity] = {
    identity,
    password, // In real app, hash this!
    fullName,
    history: {
      professional: [],
      personal: []
    }
  };
  saveDB(db);
  return true;
};

export const loginUser = (identity: string, password: string): UserData | null => {
  const db = getDB();
  const user = db[identity];
  if (user && user.password === password) {
    // Create Session
    localStorage.setItem(SESSION_KEY, identity);
    return user;
  }
  return null;
};

export const getSessionUser = (): UserData | null => {
  const identity = localStorage.getItem(SESSION_KEY);
  if (!identity) return null;
  const db = getDB();
  return db[identity] || null;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

// --- Data Persistence ---

export const saveChatHistory = (
  identity: string, 
  mode: 'professional' | 'personal', 
  messages: Message[]
) => {
  const db = getDB();
  if (db[identity]) {
    db[identity].history[mode] = messages;
    saveDB(db);
  }
};