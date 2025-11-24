"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@heroui/react";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ResultsPage() {
  const [userName, setUserName] = useState("User");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUserName(name);
    
    // Load results from localStorage
    const savedResults = localStorage.getItem("testResults");
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
    : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white dark:bg-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Your Results, {userName}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Track your cognitive performance over time
            </p>
          </motion.div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardBody className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {averageScore}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Average Score
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                      {results.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Tests Completed
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                      {results.length > 0 ? 'Top 25%' : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Overall Ranking
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          {/* Results List */}
          <div className="space-y-4">
            {results.map((result: any, index: number) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              >
                <Card className="rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition">
                  <CardBody className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                          {result.testName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Completed on {new Date(result.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-6 items-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {result.score}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Score
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {result.percentile}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Percentile
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg text-gray-700 dark:text-gray-300">
                            {result.time}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Time
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          {results.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No Results Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Complete your first test to see results here
              </p>
              <Button
                as="a"
                href="/tests"
                size="lg"
                className="px-10 py-3 text-white rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
              >
                Start Testing
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
