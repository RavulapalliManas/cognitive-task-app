"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@heroui/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Secure credentials - in production, use environment variables and server-side auth
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "cognitest2025",
};

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userData, setUserData] = useState<any[]>([]);

  useEffect(() => {
    const auth = sessionStorage.getItem("adminAuth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    
    // Load user data from localStorage
    const storedUsers = localStorage.getItem("allUserData");
    if (storedUsers) {
      setUserData(JSON.parse(storedUsers));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      setError("");
    } else {
      setError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuth");
    setUsername("");
    setPassword("");
  };

  const filteredUsers = userData.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md w-full"
          >
            <Card className="rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-8">
                <div className="text-center mb-8">
                  <div className="text-4xl mb-4">🔒</div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Admin Login
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Enter your credentials to access the admin dashboard
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
                      placeholder="Enter username"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full px-10 py-6 text-lg text-white shadow-xl rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:shadow-2xl hover:scale-[1.02] transition-all"
                  >
                    Login
                  </Button>
                </form>

                <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Demo credentials: admin / cognitest2025
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white dark:bg-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-center mb-12"
          >
            <div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Admin Dashboard
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Monitor user performance and metrics
              </p>
            </div>
            <Button
              onClick={handleLogout}
              className="px-6 py-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
            >
              Logout
            </Button>
          </motion.div>

          {/* Statistics Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-6 text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {userData.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Total Users
                </div>
              </CardBody>
            </Card>
            <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-6 text-center">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {userData.reduce((acc, u) => acc + u.testsCompleted, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Tests Completed
                </div>
              </CardBody>
            </Card>
            <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-6 text-center">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {Math.round(
                    userData.reduce((acc, u) => acc + u.averageScore, 0) /
                      userData.length
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Avg. Score
                </div>
              </CardBody>
            </Card>
            <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardBody className="p-6 text-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {userData.filter((u) => u.testsCompleted >= 3).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Active Users
                </div>
              </CardBody>
            </Card>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Search users by name or email..."
            />
          </motion.div>

          {/* User List */}
          <div className="space-y-4">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition">
                  <CardBody className="p-6">
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedUser(selectedUser === user.id ? null : user.id)
                      }
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                            {user.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex gap-6 items-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {user.testsCompleted}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Tests
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {user.averageScore}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Avg Score
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {new Date(user.lastActive).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Last Active
                            </div>
                          </div>
                          <div className="text-gray-400">
                            {selectedUser === user.id ? "▲" : "▼"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedUser === user.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
                      >
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Test Results
                        </h4>
                        <div className="space-y-3">
                          {user.results?.map((result: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {result.test} Test
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(result.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex gap-6">
                                <div className="text-center">
                                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    {result.score}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Score
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {result.percentile}%
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Percentile
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
