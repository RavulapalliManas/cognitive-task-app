"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/userAuth";
import AssessmentCanvas from "./canvas";
import { useAssessment } from "./useassessment";
import { Button, Card, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

type TestPhase = "intro" | "countdown" | "level1" | "level2" | "level3" | "completed";
type LevelTimeData = {
    startTime: number;
    endTime: number | null;
    duration: number;
};

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
    const [nextLevelInfo, setNextLevelInfo] = useState<{level: number, type: string} | null>(null);
    const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
    const [globalElapsedTime, setGlobalElapsedTime] = useState(0);
    const [levelTimes, setLevelTimes] = useState<Record<number, LevelTimeData>>({});
    const [currentLevelStartTime, setCurrentLevelStartTime] = useState<number | null>(null);
    const [currentLevelElapsedTime, setCurrentLevelElapsedTime] = useState(0);

    // Auto-advance when polygon is closed
    useEffect(() => {
        if (submissions.length === trueOrder.length && trueOrder.length > 0 && phase !== "completed") {
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
            // Start appropriate level after countdown
            if (!globalStartTime) {
                // First level
                setGlobalStartTime(Date.now());
                startLevel(1, "basic");
            } else if (nextLevelInfo) {
                // Next level
                if (nextLevelInfo.level === 2) {
                    startLevel(2, "memory");
                } else if (nextLevelInfo.level === 3) {
                    startLevel(3, "attention");
                }
                setNextLevelInfo(null);
            }
        }
    }, [phase, countdown, globalStartTime, nextLevelInfo]);

    // Global time tracking
    useEffect(() => {
        if (globalStartTime && phase !== "completed" && phase !== "intro" && phase !== "countdown") {
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

    const startLevel = async (level: number, type: "basic" | "memory" | "attention") => {
        setPhase(`level${level}` as TestPhase);
        setCurrentLevelStartTime(Date.now());
        await start(level, 1, type);
    };

    const handleFinish = async () => {
        // Record final level time
        if (currentLevelStartTime) {
            const endTime = Date.now();
            setLevelTimes(prev => ({
                ...prev,
                [currentLevel]: {
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
        // Record current level time
        if (currentLevelStartTime) {
            const endTime = Date.now();
            setLevelTimes(prev => ({
                ...prev,
                [currentLevel]: {
                    startTime: currentLevelStartTime,
                    endTime,
                    duration: endTime - currentLevelStartTime,
                }
            }));
        }

        // Move to next level with transition
        if (phase === "level1") {
            setNextLevelInfo({level: 2, type: "Memory Test"});
            setShowLevelTransition(true);
            setTimeout(() => {
                setShowLevelTransition(false);
                setPhase("countdown");
                setCountdown(3);
            }, 3000);
        } else if (phase === "level2") {
            setNextLevelInfo({level: 3, type: "Attention Test"});
            setShowLevelTransition(true);
            setTimeout(() => {
                setShowLevelTransition(false);
                setPhase("countdown");
                setCountdown(3);
            }, 3000);
        } else if (phase === "level3") {
            handleFinish();
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
                            <p className="text-white/80 text-2xl mt-2">{nextLevelInfo.type}</p>
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
                {phase !== "intro" && phase !== "completed" && phase !== "countdown" && !showLevelTransition && (
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
                                        Level {currentLevel}
                                    </div>
                                    <div className="px-6 py-3 bg-purple-600 text-white rounded-2xl capitalize font-bold text-xl">
                                        {testType}
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
                                    You'll complete three simple tests.<br />
                                    Take your time and do your best!
                                </p>
                            </div>

                            <div className="space-y-8 mb-12">
                                <div className="p-8 bg-blue-100 dark:bg-blue-900/40 rounded-3xl border-4 border-blue-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="text-6xl">1️⃣</div>
                                        <h3 className="text-4xl font-black text-blue-700 dark:text-blue-300">Basic Test</h3>
                                    </div>
                                    <p className="text-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Click the numbered dots in order to connect them and form a shape.
                                    </p>
                                </div>

                                <div className="p-8 bg-purple-100 dark:bg-purple-900/40 rounded-3xl border-4 border-purple-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="text-6xl">2️⃣</div>
                                        <h3 className="text-4xl font-black text-purple-700 dark:text-purple-300">Memory Test</h3>
                                    </div>
                                    <p className="text-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        Some numbers will be hidden. Watch for yellow flashing dots to help you remember!
                                    </p>
                                </div>

                                <div className="p-8 bg-green-100 dark:bg-green-900/40 rounded-3xl border-4 border-green-500">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="text-6xl">3️⃣</div>
                                        <h3 className="text-4xl font-black text-green-700 dark:text-green-300">Attention Test</h3>
                                    </div>
                                    <p className="text-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        The dots will move slightly. Stay focused and click them in the right order!
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
                                ℹ️ The test will begin after a 3-second countdown
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
