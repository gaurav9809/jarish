import { UserData, Message } from '../types';

const USERS_KEY = 'siya_users_db_v1';
const SESSION_KEY = 'siya_active_session_v1';

// --- CONFIGURATION ---
// Step 1: Go to https://www.emailjs.com/ (Sign Up Free)
// Step 2: Add Service (Gmail) -> Copy Service ID
// Step 3: Create Template -> Use {{otp_code}} in the message body -> Copy Template ID
// Step 4: Go to Account -> Copy Public Key

// NOTE: These are demo placeholder keys. They may not work if the quota is exceeded or keys are invalid.
// The app will fallback to alert() if email fails.
const EMAILJS_SERVICE_ID: string = 'service_1mt1ixk';   
const EMAILJS_TEMPLATE_ID: string = 'template_nnozjfs'; 
const EMAILJS_PUBLIC_KEY: string = 'O25235Sj4imhkG8fo'; 

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
  const isEmail = identity.includes('@');

  // Try to use EmailJS if configured AND it is an email address
  try {
      const isConfigured = 
          window.emailjs && 
          EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID_HERE' && 
          EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE';

      if (isConfigured && isEmail) {
          await window.emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_TEMPLATE_ID,
              {
                  // Send multiple variations to ensure template matches one of them
                  to_email: identity,
                  email: identity,
                  user_email: identity,
                  recipient: identity,
                  reply_to: identity,
                  
                  message: `Your SIYA verification code is: ${otp}`,
                  otp_code: otp,
              },
              EMAILJS_PUBLIC_KEY
          );
          console.log(`[SIYA SECURITY] Email sent to ${identity}`);
      } else {
          // If it's a phone number or not configured, throw specific error to trigger fallback
          if (!isEmail) {
              throw new Error("Identity is a mobile number (Simulating SMS).");
          }
          throw new Error("EmailJS keys are missing or default.");
      }
  } catch (error: any) {
      console.warn("EmailJS delivery failed or skipped. Falling back to Dev Mode.");
      
      // Fix for [object Object] error log
      let errorMsg = "Unknown error";
      if (error && typeof error === 'object') {
          // EmailJS SDK error objects usually have a 'text' property
          if (error.text) errorMsg = error.text;
          else if (error.message) errorMsg = error.message;
          else errorMsg = JSON.stringify(error);
      } else {
          errorMsg = String(error);
      }
      
      console.error("Auth Service Error:", errorMsg); 
      
      // FALLBACK: Alert the OTP so the user can continue
      // If it was a mobile number, we present it as an "SMS" simulation.
      const prefix = isEmail ? "[DEV MODE] Email delivery failed" : "[DEV MODE] SMS Simulation";
      alert(`${prefix}\n(Reason: ${errorMsg})\n\nYour Verification Code is: ${otp}`);
  }
  
  // Always return the generated OTP so the UI flow continues
  return otp;
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

export const loginAsGuest = (): UserData => {
    const guestId = 'guest_' + Math.floor(Math.random() * 10000);
    const guestUser: UserData = {
        identity: guestId,
        fullName: 'Guest User',
        history: {
            professional: [],
            personal: []
        }
    };
    
    // We don't save guest to the main DB to keep it clean, 
    // but we save the session so they stay logged in on refresh until logout.
    localStorage.setItem(SESSION_KEY, guestId);
    
    // We need to temporarily store guest data in DB or a separate store 
    // so getSessionUser() works. For simplicity, we add to DB but mark it?
    // actually, let's just add them to DB.
    const db = getDB();
    db[guestId] = guestUser;
    saveDB(db);

    return guestUser;
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