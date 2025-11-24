"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@heroui/react";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function SettingsPage() {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("userName") || "";
    const savedEmail = localStorage.getItem("userEmail") || "";
    const savedNotif = localStorage.getItem("notifications") === "true";
    const savedDark = localStorage.getItem("darkMode") === "true";
    
    setUserName(name);
    setEmail(savedEmail);
    setNotifications(savedNotif);
    setDarkMode(savedDark);
  }, []);

  const handleSave = () => {
    localStorage.setItem("userName", userName);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("notifications", String(notifications));
    localStorage.setItem("darkMode", String(darkMode));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white dark:bg-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Settings
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Manage your account preferences and settings
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <CardBody className="p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                    Profile Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            {/* Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <CardBody className="p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                    Preferences
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Email Notifications
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Receive updates about your test results
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications}
                          onChange={(e) => setNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Dark Mode
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Use dark theme across the application
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={darkMode}
                          onChange={(e) => setDarkMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            {/* Data Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <CardBody className="p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                    Data Management
                  </h2>
                  <div className="space-y-4">
                    <Button
                      className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                    >
                      Export My Data
                    </Button>
                    <Button
                      className="w-full md:w-auto px-6 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex justify-end gap-4"
            >
              <Button
                onClick={handleSave}
                size="lg"
                className="px-10 py-3 text-white rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-xl transition"
              >
                {saved ? "✓ Saved!" : "Save Changes"}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
