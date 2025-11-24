"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@heroui/react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const testInfo = [
  {
    id: 1,
    title: "Memory Assessment",
    icon: "🧠",
    description: "Tests short-term and working memory capacity through recall exercises",
    details: "Evaluates your ability to store and retrieve information over brief periods",
  },
  {
    id: 2,
    title: "Attention & Focus",
    icon: "🎯",
    description: "Measures sustained attention and ability to maintain concentration",
    details: "Assesses how well you can focus on tasks and filter out distractions",
  },
  {
    id: 3,
    title: "Visuospatial Reasoning",
    icon: "🔷",
    description: "Evaluates spatial awareness using polygonal-chain recognition tasks",
    details: "Tests your ability to mentally manipulate and understand spatial relationships",
  },
  {
    id: 4,
    title: "Processing Speed",
    icon: "⚡",
    description: "Assesses reaction time and speed of cognitive processing",
    details: "Measures how quickly you can process and respond to visual information",
  },
];

export default function TestsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white dark:bg-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Cognitive Assessment
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              A comprehensive cognitive screening designed to measure multiple aspects of cognitive function in one unified test.
            </p>
          </motion.div>

          {/* What We Test For - Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              What We Test For
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testInfo.map((info, index) => (
                <motion.div
                  key={info.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                >
                  <Card className="rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:shadow-xl transition h-full">
                    <CardBody className="p-6">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="text-4xl">{info.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {info.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-2">
                            {info.description}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            {info.details}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Main Test Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12"
          >
            <Card className="rounded-3xl shadow-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardBody className="p-10">
                <div className="text-center">
                  <div className="text-6xl mb-4">🧪</div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Comprehensive Cognitive Assessment
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                    Complete all four cognitive domains in one unified test
                  </p>
                  <div className="flex items-center justify-center gap-6 my-6 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⏱️</span>
                      <span className="font-medium">20-25 minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📊</span>
                      <span className="font-medium">4 Domains</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎯</span>
                      <span className="font-medium">Clinically Validated</span>
                    </div>
                  </div>
                  <Button
                    as={Link}
                    href="/name"
                    size="lg"
                    className="px-12 py-6 text-xl text-white rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:shadow-2xl hover:scale-[1.05] transition-all mt-4"
                  >
                    Begin Assessment
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    You'll be asked to provide some basic information before starting
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
