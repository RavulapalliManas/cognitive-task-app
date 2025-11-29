/**
 * User Authentication System
 * Uses IndexedDB (NoSQL) for primary storage with localStorage fallback
 */

import {
  createUser as dbCreateUser,
  getUserByCode as dbGetUserByCode,
  updateUserLogin,
  createSession,
  getSession,
  deleteSession,
  type User as DBUser,
} from './database';

export interface User {
  id: string;
  code: string;
  name: string;
  age: number;
  country: string;
  sex: string;
  registeredAt: number;
  lastLogin: number;
  assessmentHistory: string[];
}

const CURRENT_USER_KEY = 'cogni_current_user';

/**
 * Generate a unique 6-character alphanumeric code
 */
export function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if a code is already in use
 */
export async function isCodeTaken(code: string): Promise<boolean> {
  try {
    const user = await dbGetUserByCode(code.toUpperCase());
    return user !== undefined;
  } catch (error) {
    console.error('Error checking code:', error);
    return false;
  }
}

/**
 * Generate a unique code that doesn't exist yet
 */
export async function generateUniqueCode(): Promise<string> {
  let code = generateUserCode();
  while (await isCodeTaken(code)) {
    code = generateUserCode();
  }
  return code;
}

/**
 * Register a new user
 */
export async function registerUser(
  name: string,
  age: number,
  country: string,
  sex: string
): Promise<User> {
  const code = await generateUniqueCode();
  const timestamp = Date.now();

  const newUser: User = {
    id: `user_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    code,
    name,
    age,
    country,
    sex,
    registeredAt: timestamp,
    lastLogin: timestamp,
    assessmentHistory: [],
  };

  try {
    // Save to IndexedDB
    await dbCreateUser({
      code: newUser.code,
      name: newUser.name,
      age: newUser.age,
      gender: newUser.sex,
      createdAt: newUser.registeredAt,
      lastLogin: newUser.lastLogin,
    });

    // Create session
    await createSession(newUser.code, 24);

    // Set current user in localStorage for quick access
    setCurrentUser(newUser);

    return newUser;
  } catch (error) {
    console.error('Error registering user:', error);
    throw new Error('Failed to register user');
  }
}

/**
 * Verify user code and log them in
 */
export async function loginUser(code: string): Promise<User | null> {
  try {
    const dbUser = await dbGetUserByCode(code.toUpperCase());
    
    if (dbUser) {
      // Update last login time
      await updateUserLogin(code.toUpperCase());
      
      // Create session
      await createSession(code.toUpperCase(), 24);

      // Convert DB user to User format
      const user: User = {
        id: `user_${dbUser.createdAt}`,
        code: dbUser.code,
        name: dbUser.name,
        age: dbUser.age,
        country: 'N/A', // Not stored in DB yet
        sex: dbUser.gender,
        registeredAt: dbUser.createdAt,
        lastLogin: Date.now(),
        assessmentHistory: [],
      };

      setCurrentUser(user);
      return user;
    }

    return null;
  } catch (error) {
    console.error('Error logging in user:', error);
    return null;
  }
}

/**
 * Set current user session
 */
export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

/**
 * Get current logged-in user
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const user = getCurrentUser();
  if (user) {
    try {
      await deleteSession(user.code);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }
  
  localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Update user's assessment history
 */
export async function addAssessmentToHistory(assessmentId: string): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  // Update in-memory user
  currentUser.assessmentHistory.push(assessmentId);
  setCurrentUser(currentUser);
}

/**
 * Get user by code (for verification)
 */
export async function getUserByCode(code: string): Promise<User | null> {
  try {
    const dbUser = await dbGetUserByCode(code.toUpperCase());
    
    if (dbUser) {
      return {
        id: `user_${dbUser.createdAt}`,
        code: dbUser.code,
        name: dbUser.name,
        age: dbUser.age,
        country: 'N/A',
        sex: dbUser.gender,
        registeredAt: dbUser.createdAt,
        lastLogin: dbUser.lastLogin,
        assessmentHistory: [],
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by code:', error);
    return null;
  }
}
