"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button, Progress } from "@heroui/react";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { computeCompositeScore } from "@/lib/backend";

interface LevelResult {
  level: number;
  sublevel: number;
  testType: string;
  score: number;
  accuracy: number;
  timeTaken: number;
  mistakes: number;
  timestamp: number;
}

interface CognitiveProfile {
  memory: number;
  attention: number;
  visuospatial: number;
  recognition: number;
  overall: number;
}

export default function ResultsPage() {
  const [userName, setUserName] = useState("User");
  const [results, setResults] = useState<LevelResult[]>([]);
  const [cognitiveProfile, setCognitiveProfile] = useState<CognitiveProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setUserName(name);

    // Load all results from localStorage (35 total: 7 levels × 5 sublevels)
    const loadedResults: LevelResult[] = [];
    for (let level = 1; level <= 7; level++) {
      for (let sublevel = 1; sublevel <= 5; sublevel++) {
        const key = `assessment_${level}_${sublevel}`;
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          loadedResults.push({
            level,
            sublevel,
            testType: getLevelName(level),
            score: parsed.score || 0,
            accuracy: parsed.accuracy || 0,
            timeTaken: parsed.time_taken_ms || 0,
            mistakes: parsed.mistakes || 0,
            timestamp: parsed.timestamp || Date.now(),
          });
        }
      }
    }

    setResults(loadedResults);

    // Compute composite cognitive profile
    if (loadedResults.length > 0) {
      computeProfile(loadedResults);
    } else {
      setLoading(false);
    }
  }, []);

  const getLevelName = (level: number): string => {
    const names = ["", "Basic", "Memory", "Attention", "Combined", "Recognition", "Intersection", "Reconstruction"];
    return names[level] || "Test";
  };

  const computeProfile = async (results: LevelResult[]) => {
    try {
      // Group results by level
      const levelScores: Record<number, number[]> = {};
      results.forEach(r => {
        if (!levelScores[r.level]) levelScores[r.level] = [];
        levelScores[r.level].push(r.score);
      });

      // Compute averages per level
      const levelAverages = Object.entries(levelScores).map(([level, scores]) => ({
        level: parseInt(level),
        average_score: scores.reduce((a, b) => a + b, 0) / scores.length,
      }));

      // Call backend to compute composite score
      const response = await computeCompositeScore(levelAverages);

      setCognitiveProfile({
        memory: response.cognitive_profile.memory,
        attention: response.cognitive_profile.attention,
        visuospatial: response.cognitive_profile.visuospatial,
        recognition: response.cognitive_profile.recognition,
        overall: response.overall_score,
      });
    } catch (error) {
      console.error("Error computing profile:", error);
      // Fallback to simple averaging
      const avgScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;
      setCognitiveProfile({
        memory: avgScore,
        attention: avgScore,
        visuospatial: avgScore,
        recognition: avgScore,
        overall: avgScore,
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Average";
    return "Needs Improvement";
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Simple radar chart with CSS
  const RadarChart = ({ profile }: { profile: CognitiveProfile }) => {
    const domains = [
      { name: "Memory", value: profile.memory, color: "bg-blue-500" },
      { name: "Attention", value: profile.attention, color: "bg-green-500" },
      { name: "Visuospatial", value: profile.visuospatial, color: "bg-purple-500" },
      { name: "Recognition", value: profile.recognition, color: "bg-orange-500" },
    ];

    return (
      <div className="grid grid-cols-2 gap-6">
        {domains.map((domain, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {domain.name}
              </span>
              <span className={`text-lg font-bold ${getScoreColor(domain.value)}`}>
                {Math.round(domain.value)}
              </span>
            </div>
            <Progress
              value={domain.value}
              className="h-3"
              classNames={{
                indicator: domain.color,
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white dark:bg-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Cognitive Profile: {userName}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Comprehensive analysis of your cognitive performance across 7 domains
            </p>
          </motion.div>

          {loading ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Computing your cognitive profile...
              </p>
            </div>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🧠</div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                No Results Yet
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Complete the cognitive assessment to see your results
              </p>
              <Button
                size="lg"
                className="bg-blue-500 text-white hover:bg-blue-600 text-xl px-8 py-6 rounded-2xl"
                onClick={() => (window.location.href = "/tests/assessment")}
              >
                Take Assessment
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Overall Score Card */}
              {cognitiveProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mb-8"
                >
                  <Card className="rounded-3xl shadow-2xl border-4 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
                    <CardBody className="p-10">
                      <div className="text-center mb-8">
                        <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                          {Math.round(cognitiveProfile.overall)}
                        </div>
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Overall Cognitive Score
                        </div>
                        <div className={`text-xl font-semibold ${getScoreColor(cognitiveProfile.overall)}`}>
                          {getScoreLabel(cognitiveProfile.overall)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                            {results.length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Tests Completed
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                            {Math.round((results.filter(r => r.score >= 75).length / results.length) * 100)}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Success Rate
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
                          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                            {formatTime(results.reduce((acc, r) => acc + r.timeTaken, 0))}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Total Time
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              )}

              {/* Cognitive Domain Breakdown */}
              {cognitiveProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mb-8"
                >
                  <Card className="rounded-3xl shadow-xl bg-white dark:bg-gray-800">
                    <CardBody className="p-8">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        🧩 Cognitive Domain Analysis
                      </h2>
                      <RadarChart profile={cognitiveProfile} />
                    </CardBody>
                  </Card>
                </motion.div>
              )}

              {/* Level-by-Level Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  📊 Detailed Performance
                </h2>

                {/* Group by level */}
                {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                  const levelResults = results.filter((r) => r.level === level);
                  if (levelResults.length === 0) return null;

                  const avgScore = levelResults.reduce((acc, r) => acc + r.score, 0) / levelResults.length;
                  const avgTime = levelResults.reduce((acc, r) => acc + r.timeTaken, 0) / levelResults.length;

                  return (
                    <Card key={level} className="mb-4 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                              Level {level}: {getLevelName(level)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {levelResults.length} parts completed
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-4xl font-black ${getScoreColor(avgScore)}`}>
                              {Math.round(avgScore)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Average Score
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                          {levelResults.map((result) => (
                            <div
                              key={`${result.level}-${result.sublevel}`}
                              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-center"
                            >
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                Part {result.sublevel}
                              </div>
                              <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                                {Math.round(result.score)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(result.timeTaken)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex gap-4 justify-center"
              >
                <Button
                  size="lg"
                  className="bg-blue-500 text-white hover:bg-blue-600 text-xl px-8 py-6 rounded-2xl"
                  onClick={() => (window.location.href = "/tests/assessment")}
                >
                  Retake Assessment
                </Button>
                <Button
                  size="lg"
                  variant="bordered"
                  className="border-2 border-gray-300 dark:border-gray-600 text-xl px-8 py-6 rounded-2xl"
                  onClick={() => window.print()}
                >
                  Print Results
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
