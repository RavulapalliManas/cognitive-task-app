/**
 * Local User Authentication System
 * Manages user registration, login, and session storage using browser localStorage
 */

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

const USERS_STORAGE_KEY = 'cogni_users';
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
 * Get all users from localStorage
 */
function getAllUsers(): User[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save users to localStorage
 */
function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

/**
 * Check if a code is already in use
 */
export function isCodeTaken(code: string): boolean {
  const users = getAllUsers();
  return users.some(user => user.code === code);
}

/**
 * Generate a unique code that doesn't exist yet
 */
export function generateUniqueCode(): string {
  let code = generateUserCode();
  while (isCodeTaken(code)) {
    code = generateUserCode();
  }
  return code;
}

/**
 * Register a new user
 */
export function registerUser(
  name: string,
  age: number,
  country: string,
  sex: string
): User {
  const users = getAllUsers();
  const code = generateUniqueCode();
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

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  return newUser;
}

/**
 * Verify user code and log them in
 */
export function loginUser(code: string): User | null {
  const users = getAllUsers();
  const user = users.find(u => u.code.toUpperCase() === code.toUpperCase());

  if (user) {
    user.lastLogin = Date.now();
    saveUsers(users);
    setCurrentUser(user);
    return user;
  }

  return null;
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
export function logoutUser(): void {
  if (typeof window === 'undefined') return;
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
export function addAssessmentToHistory(assessmentId: string): void {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);

  if (userIndex !== -1) {
    users[userIndex].assessmentHistory.push(assessmentId);
    saveUsers(users);
    setCurrentUser(users[userIndex]);
  }
}

/**
 * Get user by code (for verification)
 */
export function getUserByCode(code: string): User | null {
  const users = getAllUsers();
  return users.find(u => u.code.toUpperCase() === code.toUpperCase()) || null;
}

/**
 * Get total number of registered users
 */
export function getTotalUsers(): number {
  return getAllUsers().length;
}
