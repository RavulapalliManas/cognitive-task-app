"use client";

// Simple local storage based auth
const STORAGE_KEY = "cognitive_app_users";
const CURRENT_USER_KEY = "cognitive_app_current_user";

export interface User {
  id: string;
  name: string;
  age: number;
  country: string;
  sex: string;
  code: string; // The 6-char code (legacy, kept for unique ID generation)
  pin: string;  // The 4-digit PIN
  createdAt: string;
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const registerUser = async (
  name: string,
  age: number,
  country: string,
  sex: string,
  pin: string
): Promise<User> => {
  const users = getUsers();

  // Generate a unique 6-char code as ID (legacy compatibility)
  let code = generateId();
  while (users.some(u => u.code === code)) {
    code = generateId();
  }

  const newUser: User = {
    id: code, // Use code as ID for now
    name,
    age,
    country,
    sex,
    code,
    pin,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

  // Auto-login
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

  return newUser;
};

export const getUsers = (): User[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

export const loginUser = async (userId: string, pin: string): Promise<User | null> => {
  const users = getUsers();
  const user = users.find((u) => u.id === userId && u.pin === pin);

  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }

  return null;
};

// Legacy login for backward compatibility (if needed) or simple ID check
export const loginUserByCode = async (code: string): Promise<User | null> => {
  const users = getUsers();
  const user = users.find((u) => u.code === code);

  // For legacy flow, we might not check PIN, but we should enforce it in new flow
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  return null;
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const isLoggedIn = (): boolean => {
  return !!getCurrentUser();
};
