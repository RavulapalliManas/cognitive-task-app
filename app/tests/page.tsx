"use client";

import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function TestsPage() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/name");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-28 pb-10 px-6 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-4xl"
        >
          <h1 className="text-5xl font-black mb-8 text-gray-900 dark:text-white">
            Begin Your Assessment
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="p-8 bg-white dark:bg-gray-800 shadow-xl rounded-3xl hover:scale-[1.02] transition-transform cursor-pointer" isPressable onPress={handleStart}>
              <CardBody className="text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold mb-2">New Assessment</h3>
                <p className="text-gray-500">Start a new cognitive evaluation session.</p>
              </CardBody>
            </Card>

            <Card className="p-8 bg-white dark:bg-gray-800 shadow-xl rounded-3xl hover:scale-[1.02] transition-transform cursor-pointer" isPressable onPress={handleStart}>
              <CardBody className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-2xl font-bold mb-2">My Dashboard</h3>
                <p className="text-gray-500">View your previous results and trends.</p>
              </CardBody>
            </Card>
          </div>

          <Button
            size="lg"
            color="primary"
            className="font-bold text-xl px-12 py-8 rounded-2xl shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600"
            onClick={handleStart}
          >
            Enter Portal
          </Button>

        </motion.div>
      </div>
      <Footer />
    </>
  );
}
