
import { UserData, Message, CallLog } from '../types';

const USERS_KEY = 'siya_users_db_v2';
const SESSION_KEY = 'siya_active_session_v2';

const getDB = (): Record<string, UserData> => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : {};
};

const saveDB = (db: Record<string, UserData>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(db));
};

export const registerUser = (identity: string, password: string, fullName: string): boolean => {
  const db = getDB();
  if (db[identity]) return false;

  db[identity] = {
    identity,
    password,
    fullName,
    history: { professional: [], personal: [] },
    callLogs: []
  };
  saveDB(db);
  return true;
};

export const loginUser = (identity: string, password: string): UserData | null => {
  const db = getDB();
  const user = db[identity];
  if (user && user.password === password) {
    localStorage.setItem(SESSION_KEY, identity);
    return user;
  }
  return null;
};

export const loginAsGuest = (): UserData => {
    let guestId = localStorage.getItem('siya_guest_id');
    if (!guestId) {
        guestId = 'guest_' + Math.floor(Math.random() * 100000);
        localStorage.setItem('siya_guest_id', guestId);
    }
    
    const db = getDB();
    if (!db[guestId]) {
        db[guestId] = {
            identity: guestId,
            fullName: 'Guest User',
            history: { professional: [], personal: [] },
            callLogs: []
        };
        saveDB(db);
    }
    
    localStorage.setItem(SESSION_KEY, guestId);
    return db[guestId];
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

export const updateMessageReaction = (
    identity: string,
    mode: 'professional' | 'personal',
    messageId: string,
    reaction: string | undefined
) => {
    const db = getDB();
    if (db[identity]) {
        const history = db[identity].history[mode];
        const msgIndex = history.findIndex(m => m.id === messageId);
        if (msgIndex !== -1) {
            history[msgIndex].reaction = reaction;
            saveDB(db);
        }
    }
};

export const saveCallLog = (identity: string, log: CallLog) => {
  const db = getDB();
  if (db[identity]) {
    if (!db[identity].callLogs) db[identity].callLogs = [];
    db[identity].callLogs.unshift(log); // Add to start
    saveDB(db);
  }
};
