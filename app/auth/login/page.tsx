"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardBody, Button, Input } from "@heroui/react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { loginUser, getUsers, User } from "@/lib/userAuth";

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setPin("");
    setError("");
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (pin === selectedUser.pin) {
      setIsLoading(true);
      await loginUser(selectedUser.id, pin);
      router.push("/tests/assessment");
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">🔑</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Who is taking the test?
            </h1>
          </motion.div>

          {/* User Grid */}
          {!selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {users.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-xl text-gray-500 mb-6">No users found.</p>
                  <Button color="primary" size="lg" onClick={() => router.push('/auth/register')}>
                    Create First User
                  </Button>
                </div>
              ) : (
                users.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card
                      isPressable
                      onPress={() => handleUserClick(user)}
                      className="w-full hover:scale-105 transition-transform"
                    >
                      <CardBody className="p-8 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400">{user.country}</p>
                      </CardBody>
                    </Card>
                  </motion.div>
                ))
              )}
              {/* Add User Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: users.length * 0.1 }}
              >
                <Card
                  isPressable
                  onPress={() => router.push('/auth/register')}
                  className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <CardBody className="p-8 flex flex-col items-center justify-center gap-4 h-full min-h-[200px]">
                    <div className="text-5xl text-gray-400">+</div>
                    <h3 className="text-xl font-bold text-gray-500">New User</h3>
                  </CardBody>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* PIN Entry Modal / View */}
          <AnimatePresence>
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              >
                <Card className="w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl">
                  <CardBody className="p-10 text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Hello, {selectedUser.name.split(' ')[0]}!</h2>
                    <p className="text-gray-500 mb-8">Enter your 4-digit PIN to continue</p>

                    <form onSubmit={handlePinSubmit}>
                      <Input
                        type="password"
                        inputMode="numeric"
                        autoFocus
                        placeholder="****"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                          setPin(val);
                          setError("");
                        }}
                        className="mb-6 text-center text-4xl font-mono tracking-[1em]"
                        classNames={{
                          input: "text-center text-4xl font-bold h-16",
                          inputWrapper: "h-20"
                        }}
                      />
                      {error && <p className="text-red-500 font-bold mb-4 animate-pulse">{error}</p>}

                      <div className="flex gap-4">
                        <Button
                          size="lg"
                          variant="flat"
                          onPress={() => setSelectedUser(null)}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          size="lg"
                          color="primary"
                          type="submit"
                          isLoading={isLoading}
                          isDisabled={pin.length !== 4}
                          className="flex-1 font-bold"
                        >
                          Login
                        </Button>
                      </div>
                    </form>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      <Footer />
    </>
  );
}
