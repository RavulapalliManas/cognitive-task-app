
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  const handleLogin = () => {
    if (!name.trim()) return;
    // Save to localStorage for persistence
    localStorage.setItem("current_user", name.trim());
    router.push(`/dashboard?user=${encodeURIComponent(name.trim())}`);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-28 pb-10 px-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 shadow-2xl bg-white dark:bg-gray-800 rounded-3xl">
            <CardBody className="flex flex-col gap-6 text-center">
              <div className="text-6xl mb-2">👤</div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">Welcome Back</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Enter your name to access your dashboard and history.
              </p>

              <Input
                size="lg"
                variant="bordered"
                label="Your Name"
                placeholder="e.g. John Doe"
                value={name}
                onValueChange={setName}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                classNames={{
                  inputWrapper: "h-14"
                }}
              />

              <Button
                size="lg"
                color="primary"
                className="w-full font-bold text-lg h-14"
                onClick={handleLogin}
                isDisabled={!name.trim()}
              >
                Go to Dashboard
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}
