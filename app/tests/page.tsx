"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { isLoggedIn } from "@/lib/userAuth";

export default function TestsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNewUser = () => {
    router.push("/auth/register");
  };

  const handleReturningUser = () => {
    router.push("/auth/login");
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="text-7xl mb-6">🧪</div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Cognitive Assessment
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Welcome! Before we begin, please let us know if you're a new or returning user.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="rounded-3xl shadow-2xl border-2 border-transparent hover:border-blue-400 transition-all duration-300 h-full bg-white dark:bg-gray-800">
                <CardBody className="p-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-5xl">✨</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    New User
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                    First time here? Register to get your unique access code and start your assessment journey.
                  </p>
                  <div className="space-y-3 mb-8 text-left w-full">
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">Get your unique 6-character code</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">Quick and easy registration</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">Track your progress over time</span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="w-full py-7 text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                    onClick={handleNewUser}
                  >
                    Register Now
                  </Button>
                </CardBody>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="rounded-3xl shadow-2xl border-2 border-transparent hover:border-purple-400 transition-all duration-300 h-full bg-white dark:bg-gray-800">
                <CardBody className="p-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-5xl">🔑</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Returning User
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                    Already registered? Enter your unique code to continue your assessment.
                  </p>
                  <div className="space-y-3 mb-8 text-left w-full">
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">Quick access with your code</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">Continue where you left off</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl mt-1">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">View your assessment history</span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="w-full py-7 text-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                    onClick={handleReturningUser}
                  >
                    Login with Code
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              🔒 All data is stored locally on your device. Your privacy is protected.
            </p>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
