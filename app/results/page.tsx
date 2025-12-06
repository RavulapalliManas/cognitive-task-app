"use client";

import { motion } from "framer-motion";
import { Card, CardBody, Button, Progress } from "@heroui/react";
import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { computeCompositeScore } from "@/lib/backend";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, BarChart, Bar
} from 'recharts';

interface LevelResult {
  level: number;
  sublevel: number;
  testType: string;
  score: number;
  accuracy: number;
  timeTaken: number;
  mistakes: number;
  timestamp: number;
  // Advanced metrics
  lure_susceptibility?: number;
  pei?: number;
  tremor_score?: number;
  drift_vector?: { x: number, y: number }[];
  hull_rt_correlation?: number;
  avg_spatial_error?: number; // L2
  tunnel_vision_risk?: number; // L3/L4
  confidence_score?: number; // L5
  arkin_dissimilarity?: number; // L7
  jerk_metric?: number; // L7
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

    // Load detailed results from new storage format "assessment_results"
    const storedResults = localStorage.getItem("assessment_results");
    let loadedResults: LevelResult[] = [];

    if (storedResults) {
      try {
        const parsed = JSON.parse(storedResults);
        loadedResults = parsed.map((r: any) => ({
          level: r.level,
          sublevel: r.sublevel,
          testType: getLevelName(r.level),
          score: r.composite_score || r.score || 0,
          accuracy: r.accuracy_score || r.accuracy || 0,
          timeTaken: r.time_score ? 0 : (r.timeTaken || 0), // If normalized score, raw time might be missing
          mistakes: r.mistakes_reported || r.mistakes || 0,
          timestamp: r.timestamp || Date.now(),
          lure_susceptibility: r.lure_susceptibility ?? r.details?.lure_susceptibility,
          pei: r.pei ?? r.details?.pei,
          tremor_score: r.tremor_score ?? r.details?.tremor_score,
          hull_rt_correlation: r.hull_rt_correlation ?? r.details?.hull_rt_correlation,
          drift_vector: r.drift_vectors ?? r.details?.drift_vectors,
          avg_spatial_error: r.hausdorff_distance ?? r.avg_spatial_error ?? r.details?.avg_spatial_error,
          tunnel_vision_risk: r.tunnel_vision_risk ?? r.details?.tunnel_vision_risk,
          confidence_score: r.confidence_score ?? r.details?.confidence_score,
          arkin_dissimilarity: r.arkin_similarity ?? r.arkin_dissimilarity ?? r.details?.arkin_dissimilarity,
          jerk_metric: r.jerk_metric ?? r.details?.jerk_metric
        }));
      } catch (e) {
        console.error("Failed to parse results", e);
      }
    } else {
      // Fallback to legacy format check (optional, but skipping for valid current flow)
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
    const names = ["", "Path Integration", "Spatial Memory", "Sustained Attention", "Dual Task", "Shape Recognition", "Intersection Drawing", "Maze Tracing", "Navigation"];
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
        overall: response.composite_score,
      });
    } catch (error) {
      //   console.error("Error computing profile:", error);
      // Fallback
      const avgScore = results.reduce((acc, r) => acc + r.score, 0) / (results.length || 1);
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

  const radarData = useMemo(() => {
    if (!cognitiveProfile) return [];
    return [
      { subject: 'Memory', A: cognitiveProfile.memory, fullMark: 100 },
      { subject: 'Attention', A: cognitiveProfile.attention, fullMark: 100 },
      { subject: 'Visuospatial', A: cognitiveProfile.visuospatial, fullMark: 100 },
      { subject: 'Recognition', A: cognitiveProfile.recognition, fullMark: 100 },
    ];
  }, [cognitiveProfile]);

  const tremorData = useMemo(() => {
    // Map across levels that track motor control (L1, L7 mainly)
    return results
      .filter(r => r.tremor_score !== undefined || r.pei !== undefined)
      .map(r => ({
        name: `${getLevelName(r.level)} P${r.sublevel}`,
        tremor: r.tremor_score || 0,
        pei: r.pei || 0
      }));
  }, [results]);

  const rtData = useMemo(() => {
    // Collect RT across levels
    return results
      .sort((a, b) => a.level - b.level || a.sublevel - b.sublevel)
      .map(r => ({
        name: `L${r.level}`,
        rt: r.timeTaken / 1000 // Seconds
      }));
  }, [results]);

  const cognitiveLoadData = useMemo(() => {
    // Compare Level 1 (Baseline) vs Level 4 (Dual Task) to show "Switching Cost"
    const l1 = results.filter(r => r.level === 1);
    const l4 = results.filter(r => r.level === 4);

    const l1Avg = l1.reduce((a, b) => a + b.score, 0) / (l1.length || 1);
    const l4Avg = l4.reduce((a, b) => a + b.score, 0) / (l4.length || 1);

    return [
      { name: 'Baseline (L1)', score: l1Avg, fill: '#3b82f6' },
      { name: 'Dual Task (L4)', score: l4Avg, fill: '#f59e0b' }
    ];
  }, [results]);

  const driftData = useMemo(() => {
    // Aggregate all drift vectors from Level 2
    const vectors: { x: number, y: number, z: number }[] = [];
    results.filter(r => r.level === 2 && r.drift_vector).forEach(r => {
      r.drift_vector?.forEach(v => {
        vectors.push({ x: v.x, y: v.y, z: 1 });
      });
    });
    return vectors;
  }, [results]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 pt-28 pb-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex justify-between items-end"
          >
            <div>
              <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
                Neuro-Dashboard
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Patient: <span className="font-bold text-blue-600">{userName}</span> • {new Date().toLocaleDateString()}
              </p>
            </div>
            {cognitiveProfile && (
              <div className="text-right">
                <div className="text-6xl font-black text-blue-600">{Math.round(cognitiveProfile.overall)}</div>
                <div className="text-gray-500 font-bold uppercase tracking-wider">Composite Score</div>
              </div>
            )}
          </motion.div>

          {loading ? (
            <div className="p-20 text-center text-2xl animate-pulse">Analyzing biomarks...</div>
          ) : !cognitiveProfile ? (
            <div className="p-20 text-center">No data found.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Cognitive Profile Radar */}
              <Card className="rounded-3xl shadow-xl bg-white dark:bg-gray-800 p-6">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Cognitive Profile</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="User" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Cognitive Drift Map (New) */}
              <Card className="rounded-3xl shadow-xl bg-white dark:bg-gray-800 p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Cognitive Drift Map</h3>
                <p className="text-gray-500 mb-6 text-sm">Spatial memory bias. Points offset from center (0,0) indicate drift direction.</p>
                <div className="h-[300px] w-full flex items-center justify-center relative">
                  {/* Crosshair background */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <div className="w-full h-0.5 bg-gray-500"></div>
                    <div className="h-full w-0.5 bg-gray-500 absolute"></div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="x" name="Horizontal Error" unit="px" domain={[-100, 100]} />
                      <YAxis type="number" dataKey="y" name="Vertical Error" unit="px" domain={[-100, 100]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Drift" data={driftData} fill="#ef4444" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {driftData.length === 0 && <div className="absolute text-gray-400">No drift data available (Level 2 required)</div>}
                </div>
              </Card>

              {/* Cognitive Load Cost */}
              <Card className="rounded-3xl shadow-xl bg-white dark:bg-gray-800 p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Cognitive Load Cost</h3>
                <p className="text-gray-500 mb-6 text-sm">Performance drop under Dual Task conditions (L1 vs L4)</p>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cognitiveLoadData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Reaction Time Analysis (New) */}
              <Card className="rounded-3xl shadow-xl bg-white dark:bg-gray-800 p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Reaction Time Trends</h3>
                <p className="text-gray-500 mb-6 text-sm">Processing speed across all task levels (Seconds)</p>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rtData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="rt" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Motor Control / Tremor Analysis */}
              <Card className="rounded-3xl shadow-xl bg-white dark:bg-gray-800 p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Motor Control Stability</h3>
                <p className="text-gray-500 mb-6 text-sm">Tremor score (lower is better) & Path Efficiency (higher is better)</p>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tremorData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="tremor" stroke="#ef4444" name="Tremor Idx" strokeWidth={2} />
                      <Line type="monotone" dataKey="pei" stroke="#10b981" name="Path Eff." strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Detailed Metrics Table */}
              <Card className="lg:col-span-2 rounded-3xl shadow-xl bg-white dark:bg-gray-800 p-6">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Digital Biomarkers</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="pb-3 pl-4">Task</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Accuracy</th>
                        <th className="pb-3">Biomarkers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {results.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 pl-4 font-medium">
                            <div className="text-gray-900 dark:text-white">{r.testType}</div>
                            <div className="text-xs text-gray-500">Level {r.level}-{r.sublevel}</div>
                          </td>
                          <td className="py-4 font-bold text-blue-600">{Math.round(r.score)}</td>
                          <td className="py-4">{(r.accuracy * 100).toFixed(0)}%</td>
                          <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                            {r.lure_susceptibility !== undefined && <div className="mb-1">Lure Susc: {(r.lure_susceptibility * 100).toFixed(1)}%</div>}
                            {r.pei !== undefined && <div className="mb-1">PEI: {r.pei.toFixed(1)}</div>}
                            {r.jerk_metric !== undefined && <div className="mb-1 text-orange-500">Jerk (Tremor): {r.jerk_metric.toFixed(1)}</div>}
                            {r.hull_rt_correlation !== undefined && <div className="mb-1 text-red-500">Hull-RT Corr: {r.hull_rt_correlation.toFixed(2)}</div>}
                            {r.arkin_dissimilarity !== undefined && <div className="mb-1">Shape Err (Arkin): {(r.arkin_dissimilarity * 100).toFixed(1)}%</div>}
                            {r.avg_spatial_error !== undefined && <div className="mb-1">Spatial Err: {r.avg_spatial_error.toFixed(2)}px</div>}
                            {r.tunnel_vision_risk !== undefined && r.tunnel_vision_risk > 0.5 && <div className="text-red-600 font-bold">⚠️ Tunnel Vision Risk</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
