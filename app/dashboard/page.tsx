"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, CardBody, Divider } from "@heroui/react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Utility to format date
const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

export default function DashboardPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [user, setUser] = useState<string>("");
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get user from URL or localStorage
        let u = searchParams.get("user");
        if (!u) {
            u = localStorage.getItem("current_user");
        }

        if (!u) {
            // Redirect to login if no user found
            router.push("/name");
            return;
        }

        setUser(u);

        // Fetch history
        const data = localStorage.getItem(`assessment_results_${u}`);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    // Sort by timestamp ascending
                    const sorted = parsed.sort((a, b) => a.timestamp - b.timestamp);
                    setHistory(sorted);
                }
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
        setLoading(false);
    }, [searchParams, router]);

    // Derived states
    const lastTest = history.length > 0 ? history[history.length - 1] : null;

    const nextTestInfo = useMemo(() => {
        if (!lastTest) return { date: new Date(), daysLeft: 0, isDue: true };

        const lastDate = new Date(lastTest.timestamp);
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + 14); // 2 weeks later

        const now = new Date();
        const diffTime = nextDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            date: nextDate,
            daysLeft: diffDays,
            isDue: diffDays <= 0
        };
    }, [lastTest]);

    const chartData = useMemo(() => {
        return history.map((entry, idx) => ({
            name: `Test ${idx + 1}`,
            date: formatDate(entry.timestamp),
            score: Math.round(entry.composite_score || 0)
        }));
    }, [history]);

    const handleStartAssessment = () => {
        router.push(`/tests/assessment?user=${encodeURIComponent(user)}`);
    };

    if (loading) return null;

    return (
        <>
            <Navbar />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                                Hello, {user} 👋
                            </h1>
                            <p className="text-gray-500 text-lg mt-2">
                                Track your cognitive health journey.
                            </p>
                        </div>
                        <Button
                            size="lg"
                            color={nextTestInfo.isDue ? "primary" : "default"}
                            variant={nextTestInfo.isDue ? "shadow" : "flat"}
                            className="font-bold text-lg px-8"
                            onClick={handleStartAssessment}
                        >
                            {nextTestInfo.isDue ? "Start Assessment Now" : `Next Test in ${nextTestInfo.daysLeft} Days`}
                        </Button>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Last Test Portal */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="h-full p-6 shadow-xl bg-white dark:bg-gray-800 rounded-3xl border-l-8 border-blue-500">
                                <CardBody>
                                    <h3 className="text-xl font-bold text-gray-500 uppercase tracking-wider mb-4">Last Assessment</h3>
                                    {lastTest ? (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">
                                                    {Math.round(lastTest.composite_score || 0)}
                                                    <span className="text-2xl text-gray-400 font-normal">/100</span>
                                                </div>
                                                <div className="text-gray-500">
                                                    Completed on {new Date(lastTest.timestamp).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="text-6xl">📊</div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No assessments completed yet.
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </motion.div>

                        {/* Next Test Portal */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className={`h-full p-6 shadow-xl rounded-3xl border-l-8 ${nextTestInfo.isDue ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-purple-500 bg-white dark:bg-gray-800'}`}>
                                <CardBody>
                                    <h3 className="text-xl font-bold text-gray-500 uppercase tracking-wider mb-4">Next Scheduled</h3>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            {nextTestInfo.isDue ? (
                                                <div className="text-4xl font-black text-green-600 dark:text-green-400 mb-2">
                                                    Ready Now
                                                </div>
                                            ) : (
                                                <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                                                    {nextTestInfo.date.toLocaleDateString()}
                                                </div>
                                            )}
                                            <div className="text-gray-500">
                                                Recommended interval: 14 days
                                            </div>
                                        </div>
                                        <div className="text-6xl">📅</div>
                                    </div>
                                </CardBody>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Trends Graph */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="p-8 shadow-xl bg-white dark:bg-gray-800 rounded-3xl">
                            <CardBody>
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Trend</h3>
                                    <div className="text-sm text-gray-500">Composite Score History</div>
                                </div>

                                {history.length > 1 ? (
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#9CA3AF"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    stroke="#9CA3AF"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    domain={[0, 100]}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="score"
                                                    stroke="#4F46E5"
                                                    strokeWidth={4}
                                                    dot={{ r: 6, fill: "#4F46E5", strokeWidth: 2, stroke: "#fff" }}
                                                    activeDot={{ r: 8 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <p>Complete more assessments to see your trend line.</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </motion.div>
                </div>
            </div>
            <Footer />
        </>
    );
}
