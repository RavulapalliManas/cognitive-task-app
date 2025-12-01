"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/userAuth";
import AssessmentCanvas from "./canvas";
import { useAssessment } from "./useassessment";
import { Button, Card, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

type TestPhase = "intro" | "countdown" | "testing" | "completed";
type LevelTimeData = {
    startTime: number;
    endTime: number | null;
    duration: number;
};

// Test configuration: 7 levels, 5 sublevels each
const MAX_LEVELS = 7;
const SUBLEVELS_PER_LEVEL = 5;

export default function AssessmentPage() {
    const router = useRouter();
    const {
        points,
        currentLevel,
        currentSublevel,
        testType,
        start,
        recordClick,
        finish,
        startTime,
        mistakes,
        submissions,
        trueOrder,
        driftParameters,
        highlightSchedule,
    } = useAssessment();

    const [phase, setPhase] = useState<TestPhase>("intro");
    const [countdown, setCountdown] = useState(3);
    const [showLevelTransition, setShowLevelTransition] = useState(false);
    const [showSublevelTransition, setShowSublevelTransition] = useState(false);
    const [nextLevelInfo, setNextLevelInfo] = useState<{level: number, sublevel: number, type: string} | null>(null);
    const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
    const [globalElapsedTime, setGlobalElapsedTime] = useState(0);
    const [levelTimes, setLevelTimes] = useState<Record<string, LevelTimeData>>({});
    const [currentLevelStartTime, setCurrentLevelStartTime] = useState<number | null>(null);
    const [currentLevelElapsedTime, setCurrentLevelElapsedTime] = useState(0);

    // Auto-advance when polygon is closed
    useEffect(() => {
        if (submissions.length === trueOrder.length && trueOrder.length > 0 && phase === "testing") {
            // Polygon is complete, wait 2 seconds then advance
            const timer = setTimeout(() => {
                handleNextLevel();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [submissions.length, trueOrder.length, phase]);

    // Check authentication
    useEffect(() => {
        if (!isLoggedIn()) {
            router.replace("/tests");
        }
    }, [router]);

    // Countdown timer
    useEffect(() => {
        if (phase === "countdown" && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (phase === "countdown" && countdown === 0) {
            // Start appropriate level/sublevel after countdown
            if (!globalStartTime) {
                // First level, first sublevel
                setGlobalStartTime(Date.now());
                startLevel(1, 1);
            } else if (nextLevelInfo) {
                // Next level/sublevel
                startLevel(nextLevelInfo.level, nextLevelInfo.sublevel);
                setNextLevelInfo(null);
            }
        }
    }, [phase, countdown, globalStartTime, nextLevelInfo]);

    // Global time tracking (updates every 100ms)
    useEffect(() => {
        if (globalStartTime && phase === "testing") {
            const interval = setInterval(() => {
                setGlobalElapsedTime(Date.now() - globalStartTime);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [globalStartTime, phase]);

    // Current level time tracking
    useEffect(() => {
        if (currentLevelStartTime && phase !== "completed" && phase !== "intro" && phase !== "countdown") {
            const interval = setInterval(() => {
                setCurrentLevelElapsedTime(Date.now() - currentLevelStartTime);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [currentLevelStartTime, phase]);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
    };

    const getTestType = (level: number): "basic" | "memory" | "attention" | "recognition" | "intersection" | "reconstruction" => {
        if (level === 1) return "basic";
        if (level === 2) return "memory";
        if (level === 3) return "attention";
        if (level === 4) return "attention"; // Combined test uses attention base
        if (level === 5) return "recognition";
        if (level === 6) return "intersection";
        if (level === 7) return "reconstruction";
        return "basic";
    };

    const getLevelName = (level: number): string => {
        if (level === 1) return "Basic Test";
        if (level === 2) return "Memory Test";
        if (level === 3) return "Attention Test";
        if (level === 4) return "Combined Test";
        if (level === 5) return "Shape Recognition";
        if (level === 6) return "Intersection Detection";
        if (level === 7) return "Memory Reconstruction";
        return "Test";
    };

    const startLevel = async (level: number, sublevel: number) => {
        setPhase("testing");
        setCurrentLevelStartTime(Date.now());
        const type = getTestType(level);
        await start(level, sublevel, type);
    };

    const handleFinish = async () => {
        // Record final level time
        if (currentLevelStartTime) {
            const endTime = Date.now();
            const key = `${currentLevel}-${currentSublevel}`;
            setLevelTimes(prev => ({
                ...prev,
                [key]: {
                    startTime: currentLevelStartTime,
                    endTime,
                    duration: endTime - currentLevelStartTime,
                }
            }));
        }

        const result = await finish();
        setPhase("completed");
        console.log("Assessment result:", result);
        console.log("Level times:", levelTimes);
        console.log("Total time:", globalElapsedTime);
    };

    const handleNextLevel = async () => {
        // Record current sublevel time
        if (currentLevelStartTime) {
            const endTime = Date.now();
            const key = `${currentLevel}-${currentSublevel}`;
            setLevelTimes(prev => ({
                ...prev,
                [key]: {
                    startTime: currentLevelStartTime,
                    endTime,
                    duration: endTime - currentLevelStartTime,
                }
            }));
        }

        const nextSublevel = currentSublevel + 1;
        const nextLevel = currentLevel;

        // Check if we need to advance to next level or next sublevel
        if (nextSublevel > SUBLEVELS_PER_LEVEL) {
            // Move to next level
            if (currentLevel >= MAX_LEVELS) {
                // Assessment complete
                handleFinish();
                return;
            }

            const newLevel = currentLevel + 1;
            setNextLevelInfo({
                level: newLevel,
                sublevel: 1,
                type: getLevelName(newLevel)
            });
            setShowLevelTransition(true);
            setTimeout(() => {
                setShowLevelTransition(false);
                setPhase("countdown");
                setCountdown(3);
            }, 3000);
        } else {
            // Move to next sublevel
            setNextLevelInfo({
                level: nextLevel,
                sublevel: nextSublevel,
                type: `${getLevelName(nextLevel)} - Part ${nextSublevel}`
            });
            setShowSublevelTransition(true);
            setTimeout(() => {
                setShowSublevelTransition(false);
                setPhase("countdown");
                setCountdown(3);
            }, 2000);
        }
    };

    const handleBeginAssessment = () => {
        setPhase("countdown");
        setCountdown(3);
    };

    const progress = submissions.length / (trueOrder.length || 1) * 100;

    return (
        <div className="min-h-screen bg-gray-50 dark:from-gray-900">
            {/* Level Transition Overlay */}
            <AnimatePresence>
                {showLevelTransition && nextLevelInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <div className="text-white text-8xl mb-6">✅</div>
                            <h2 className="text-white text-6xl font-black mb-4">Level {nextLevelInfo.level - 1} Complete!</h2>
                            <p className="text-white text-3xl font-medium">Get ready for Level {nextLevelInfo.level}</p>
                            <p className="text-white/80 text-2xl mt-2 capitalize">{getLevelName(nextLevelInfo.level)}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sublevel Transition Overlay */}
            <AnimatePresence>
                {showSublevelTransition && nextLevelInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >
                            <div className="text-white text-7xl mb-4">🎯</div>
                            <h2 className="text-white text-5xl font-black mb-3">Part {nextLevelInfo.sublevel - 1} Complete!</h2>
                            <p className="text-white text-2xl font-medium">Next: Part {nextLevelInfo.sublevel}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Countdown Overlay */}
            <AnimatePresence>
                {phase === "countdown" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-white text-[20rem] font-black"
                        >
                            {countdown > 0 ? countdown : "GO!"}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HUD - Always visible during test */}
            <AnimatePresence>
                {phase === "testing" && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b-4 border-blue-500 shadow-xl"
                    >
                        <div className="max-w-7xl mx-auto px-8 py-6">
                            <div className="flex items-center justify-between gap-8">
                                {/* Level Info */}
                                <div className="flex items-center gap-4">
                                    <div className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-2xl">
                                        Level {currentLevel}/{MAX_LEVELS}
                                    </div>
                                    <div className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-2xl">
                                        Part {currentSublevel}/{SUBLEVELS_PER_LEVEL}
                                    </div>
                                    <div className="px-6 py-3 bg-purple-600 text-white rounded-2xl capitalize font-bold text-xl">
                                        {getLevelName(currentLevel)}
                                    </div>
                                </div>

                                {/* Timers with Hourglass */}
                                <div className="flex items-center gap-6">
                                    <motion.div
                                        animate={{ rotate: [0, 180] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="text-5xl"
                                    >
                                        ⏳
                                    </motion.div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="text-base font-bold text-gray-700 dark:text-gray-300 w-16">Level:</div>
                                            <div className="font-mono text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                                                {formatTime(currentLevelElapsedTime)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-base font-bold text-gray-700 dark:text-gray-300 w-16">Total:</div>
                                            <div className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                                {formatTime(globalElapsedTime)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="flex-1 max-w-md">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                            Progress: {submissions.length}/{trueOrder.length}
                                        </div>
                                        <Progress 
                                            value={progress} 
                                            className="h-3"
                                            color="success"
                                            size="lg"
                                        />
                                    </div>
                                </div>

                                {/* Mistakes */}
                                <div className="flex flex-col items-center gap-1 bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-2xl">
                                    <div className="text-base font-bold text-gray-700 dark:text-gray-300">Mistakes</div>
                                    <div className={`text-4xl font-black ${mistakes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {mistakes}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`${phase !== "intro" && phase !== "completed" && phase !== "countdown" && !showLevelTransition ? "pt-32" : ""} px-6 py-8`}>
                {/* Intro Screen */}
                {phase === "intro" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-5xl mx-auto"
                    >
                        <Card className="p-16 bg-white dark:bg-gray-800 shadow-2xl rounded-3xl">
                            <div className="text-center mb-12">
                                <div className="text-8xl mb-6">🧠</div>
                                <h1 className="text-7xl font-black mb-6 text-gray-900 dark:text-white">
                                    Cognitive Assessment
                                </h1>
                                <p className="text-3xl text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                    Complete 4 levels with 5 parts each<br />
                                    Take your time and do your best!
                                </p>
                            </div>

                            <div className="space-y-6 mb-12">
                                <div className="p-6 bg-blue-100 dark:bg-blue-900/40 rounded-3xl border-4 border-blue-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">1️⃣</div>
                                        <h3 className="text-3xl font-black text-blue-700 dark:text-blue-300">Level 1: Basic Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Click numbered dots in order. 5 parts with increasing complexity.
                                    </p>
                                </div>

                                <div className="p-6 bg-purple-100 dark:bg-purple-900/40 rounded-3xl border-4 border-purple-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">2️⃣</div>
                                        <h3 className="text-3xl font-black text-purple-700 dark:text-purple-300">Level 2: Memory Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Some numbers hidden. Watch yellow flashing dots to remember!
                                    </p>
                                </div>

                                <div className="p-6 bg-green-100 dark:bg-green-900/40 rounded-3xl border-4 border-green-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">3️⃣</div>
                                        <h3 className="text-3xl font-black text-green-700 dark:text-green-300">Level 3: Attention Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Dots drift around! Stay focused on moving targets.
                                    </p>
                                </div>

                                <div className="p-6 bg-orange-100 dark:bg-orange-900/40 rounded-3xl border-4 border-orange-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">4️⃣</div>
                                        <h3 className="text-3xl font-black text-orange-700 dark:text-orange-300">Level 4: Combined Test</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Memory + Attention together! Hidden numbers AND drifting dots.
                                    </p>
                                </div>

                                <div className="p-6 bg-pink-100 dark:bg-pink-900/40 rounded-3xl border-4 border-pink-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">5️⃣</div>
                                        <h3 className="text-3xl font-black text-pink-700 dark:text-pink-300">Level 5: Shape Recognition</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Identify shapes from point clouds. Rate your confidence!
                                    </p>
                                </div>

                                <div className="p-6 bg-cyan-100 dark:bg-cyan-900/40 rounded-3xl border-4 border-cyan-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">6️⃣</div>
                                        <h3 className="text-3xl font-black text-cyan-700 dark:text-cyan-300">Level 6: Intersection Detection</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Watch moving polygons and detect when they overlap!
                                    </p>
                                </div>

                                <div className="p-6 bg-rose-100 dark:bg-rose-900/40 rounded-3xl border-4 border-rose-500">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="text-5xl">7️⃣</div>
                                        <h3 className="text-3xl font-black text-rose-700 dark:text-rose-300">Level 7: Memory Reconstruction</h3>
                                    </div>
                                    <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Memorize a shape, then recreate it from memory!
                                    </p>
                                </div>
                            </div>

                            <Button
                                color="primary"
                                size="lg"
                                variant="shadow"
                                onClick={handleBeginAssessment}
                                className="text-4xl py-12 font-black w-full rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-2xl"
                            >
                                Start Assessment
                            </Button>
                            
                            <p className="text-center text-2xl text-gray-600 dark:text-gray-400 mt-8 font-medium">
                                ℹ️ 7 Levels × 5 Parts = 35 Total Tests • The test will begin after a 3-second countdown
                            </p>
                        </Card>
                    </motion.div>
                )}

                {/* Test Canvas */}
                {phase !== "intro" && phase !== "completed" && phase !== "countdown" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-7xl mx-auto"
                    >
                        <Card className="p-8 bg-white dark:bg-gray-800 shadow-2xl">
                            <AssessmentCanvas
                                points={points}
                                onClickPoint={recordClick}
                                testType={testType}
                                driftParameters={driftParameters}
                                highlightSchedule={highlightSchedule}
                                startTime={startTime}
                                submissions={submissions}
                                trueOrder={trueOrder}
                                mistakes={mistakes}
                            />
                        </Card>
                    </motion.div>
                )}

                {/* Completion Screen */}
                {phase === "completed" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-4xl mx-auto"
                    >
                        <Card className="p-12 bg-white dark:bg-gray-800 shadow-2xl text-center">
                            <div className="text-6xl mb-6">🎉</div>
                            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                Assessment Complete!
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                                Great job! Your results are being processed.
                            </p>
                            <Button
                                color="primary"
                                size="lg"
                                variant="shadow"
                                onClick={() => window.location.href = "/results"}
                                className="text-xl py-6 px-12 font-bold rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
                            >
                                View Results
                            </Button>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
