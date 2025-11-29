"use client";

import { useState, FormEvent, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Input } from "@heroui/react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { loginUser, getCurrentUser } from "@/lib/userAuth";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").toUpperCase().slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    
    setCode(newCode);
    setError("");
    
    const nextEmptyIndex = newCode.findIndex(c => !c);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const enteredCode = code.join("");
    
    if (enteredCode.length !== 6) {
      setError("Please enter all 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await loginUser(enteredCode);

      if (user) {
        router.push("/tests/assessment");
      } else {
        setError("Invalid code. Please check and try again.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">🔑</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Welcome Back!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Enter your 6-character access code to continue
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="rounded-3xl shadow-2xl bg-white dark:bg-gray-800">
              <CardBody className="p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Access Code
                    </p>
                    <div className="flex justify-center gap-3" onPaste={handlePaste}>
                      {code.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el; }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleInputChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          className={`w-16 h-20 text-center text-3xl font-mono font-bold border-3 rounded-xl transition-all
                            ${error 
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20" 
                              : "border-gray-300 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400"
                            }
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                            focus:outline-none focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-900/50
                            uppercase
                          `}
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">❌</span>
                        <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">💡</span>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-medium mb-1">Tip:</p>
                        <p>Your code is case-insensitive. You can paste it from your clipboard.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      size="lg"
                      variant="bordered"
                      className="flex-1 py-6 text-lg font-bold border-2 text-gray-900 dark:text-white rounded-2xl"
                      onClick={() => router.back()}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="flex-1 py-6 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl"
                      isLoading={isLoading}
                      isDisabled={code.join("").length !== 6}
                    >
                      Login
                    </Button>
                  </div>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-3">
                    Don't have a code yet?
                  </p>
                  <Button
                    variant="light"
                    size="lg"
                    className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold rounded-2xl"
                    onClick={() => router.push("/auth/register")}
                  >
                    Register as New User →
                  </Button>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-center"
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              🔒 All authentication is handled locally on your device
            </p>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
