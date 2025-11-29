/**
 * IndexedDB wrapper for storing user data and assessment results
 * This provides a NoSQL database interface for the cognitive assessment app
 */

const DB_NAME = "CognitiveAssessmentDB";
const DB_VERSION = 1;

// Store names
const STORES = {
  USERS: "users",
  ASSESSMENTS: "assessments",
  SESSIONS: "sessions",
} as const;

interface User {
  code: string; // 6-character unique code
  name: string;
  age: number;
  gender: string;
  createdAt: number;
  lastLogin: number;
}

interface AssessmentResult {
  id: string;
  userCode: string;
  timestamp: number;
  level1: LevelData;
  level2: LevelData;
  level3: LevelData;
  totalTime: number;
  totalMistakes: number;
}

interface LevelData {
  mistakes: number;
  timeElapsed: number;
  submissions: Array<{
    selected_index: number;
    timestamp: number;
  }>;
}

interface Session {
  userCode: string;
  loginTime: number;
  expiresAt: number;
}

/**
 * Initialize the IndexedDB database
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create users store
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const userStore = db.createObjectStore(STORES.USERS, { keyPath: "code" });
        userStore.createIndex("name", "name", { unique: false });
        userStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Create assessments store
      if (!db.objectStoreNames.contains(STORES.ASSESSMENTS)) {
        const assessmentStore = db.createObjectStore(STORES.ASSESSMENTS, { keyPath: "id" });
        assessmentStore.createIndex("userCode", "userCode", { unique: false });
        assessmentStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Create sessions store
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: "userCode" });
        sessionStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
  });
}

/**
 * Generic database operation helper
 */
async function performTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const request = operation(store);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

// ============= USER OPERATIONS =============

/**
 * Create a new user in the database
 */
export async function createUser(user: User): Promise<void> {
  await performTransaction(STORES.USERS, "readwrite", (store) => store.add(user));
}

/**
 * Get user by their unique code
 */
export async function getUserByCode(code: string): Promise<User | undefined> {
  return performTransaction(STORES.USERS, "readonly", (store) => store.get(code));
}

/**
 * Update user's last login time
 */
export async function updateUserLogin(code: string): Promise<void> {
  const user = await getUserByCode(code);
  if (user) {
    user.lastLogin = Date.now();
    await performTransaction(STORES.USERS, "readwrite", (store) => store.put(user));
  }
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(): Promise<User[]> {
  return performTransaction(STORES.USERS, "readonly", (store) => store.getAll());
}

// ============= ASSESSMENT OPERATIONS =============

/**
 * Save assessment results
 */
export async function saveAssessment(assessment: AssessmentResult): Promise<void> {
  await performTransaction(STORES.ASSESSMENTS, "readwrite", (store) => store.add(assessment));
}

/**
 * Get all assessments for a specific user
 */
export async function getUserAssessments(userCode: string): Promise<AssessmentResult[]> {
  const db = await initDB();
  const transaction = db.transaction(STORES.ASSESSMENTS, "readonly");
  const store = transaction.objectStore(STORES.ASSESSMENTS);
  const index = store.index("userCode");
  const request = index.getAll(userCode);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get the latest assessment for a user
 */
export async function getLatestAssessment(userCode: string): Promise<AssessmentResult | undefined> {
  const assessments = await getUserAssessments(userCode);
  if (assessments.length === 0) return undefined;
  
  return assessments.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest
  );
}

/**
 * Get all assessments (for admin purposes)
 */
export async function getAllAssessments(): Promise<AssessmentResult[]> {
  return performTransaction(STORES.ASSESSMENTS, "readonly", (store) => store.getAll());
}

// ============= SESSION OPERATIONS =============

/**
 * Create a new session for a logged-in user
 */
export async function createSession(userCode: string, expiresInHours: number = 24): Promise<void> {
  const session: Session = {
    userCode,
    loginTime: Date.now(),
    expiresAt: Date.now() + expiresInHours * 60 * 60 * 1000,
  };
  await performTransaction(STORES.SESSIONS, "readwrite", (store) => store.put(session));
}

/**
 * Get active session for a user
 */
export async function getSession(userCode: string): Promise<Session | undefined> {
  const session = await performTransaction<Session | undefined>(
    STORES.SESSIONS,
    "readonly",
    (store) => store.get(userCode)
  );
  
  if (session && session.expiresAt > Date.now()) {
    return session;
  }
  
  // Session expired, delete it
  if (session) {
    await deleteSession(userCode);
  }
  
  return undefined;
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(userCode: string): Promise<void> {
  await performTransaction(STORES.SESSIONS, "readwrite", (store) => store.delete(userCode));
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(STORES.SESSIONS, "readwrite");
  const store = transaction.objectStore(STORES.SESSIONS);
  const request = store.getAll();

  request.onsuccess = () => {
    const sessions = request.result as Session[];
    const now = Date.now();
    
    sessions.forEach((session) => {
      if (session.expiresAt < now) {
        store.delete(session.userCode);
      }
    });
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============= UTILITY FUNCTIONS =============

/**
 * Clear all data from the database (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const stores = [STORES.USERS, STORES.ASSESSMENTS, STORES.SESSIONS];
  
  for (const storeName of stores) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
  }
  
  db.close();
}

/**
 * Export data for backup
 */
export async function exportData(): Promise<{
  users: User[];
  assessments: AssessmentResult[];
}> {
  const users = await getAllUsers();
  const assessments = await getAllAssessments();
  
  return { users, assessments };
}

// Export types for use in other files
export type { User, AssessmentResult, LevelData, Session };
