import { UserData, Message } from '../types';

const USERS_KEY = 'siya_users_db_v1';
const SESSION_KEY = 'siya_active_session_v1';

// --- CONFIGURATION ---
// Step 1: Go to https://www.emailjs.com/ (Sign Up Free)
// Step 2: Add Service (Gmail) -> Copy Service ID
// Step 3: Create Template -> Use {{otp_code}} in the message body -> Copy Template ID
// Step 4: Go to Account -> Copy Public Key

const EMAILJS_SERVICE_ID: string = 'service_1mt1ixk';   // Example: 'service_xq9...'
const EMAILJS_TEMPLATE_ID: string = 'template_nnozjfs'; // Example: 'template_k8s...'
const EMAILJS_PUBLIC_KEY: string = 'O25235Sj4imhkG8fo;';   // Example: 'user_9s8f...'

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
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  // Try to use EmailJS if configured
  if (
      window.emailjs && 
      EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID_HERE' && 
      EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE'
  ) {
      try {
          await window.emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_TEMPLATE_ID,
              {
                  to_email: identity,   // This must match {{to_email}} in your template 'To' field (optional)
                  message: `Your SIYA verification code is: ${otp}`,
                  otp_code: otp,        // This matches {{otp_code}} in your template body
              },
              EMAILJS_PUBLIC_KEY
          );
          // Only log success, do NOT log the OTP code
          console.log(`[SIYA SECURITY] Email sent to ${identity}`);
          return otp;
      } catch (error) {
          console.error("EmailJS Failed:", error);
          throw new Error("Failed to send email");
      }
  } else {
      // Configuration is missing. 
      // Do not fallback to alert/console logging the OTP.
      console.error("EmailJS keys are missing or default.");
      alert("EmailJS configuration is incomplete. Cannot send OTP.");
      throw new Error("EmailJS configuration missing.");
  }
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

// Types definition for window object
declare global {
    interface Window {
        emailjs: any;
    }
}