"use client";

import { Button, Card, CardBody } from "@heroui/react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function HomePage() {
  const [isDark, setIsDark] = useState(false);
  const { scrollY } = useScroll();
  
  // Parallax transforms
  const brainY = useTransform(scrollY, [0, 500], [0, -150]);
  const brainOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const titleY = useTransform(scrollY, [0, 500], [0, -100]);
  const subtextY = useTransform(scrollY, [0, 500], [0, -80]);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) {
      setIsDark(saved === "true");
      document.documentElement.classList.toggle("dark", saved === "true");
    }
  }, []);

  return (
    <>
      <Navbar />
    <div className={`min-h-screen w-full flex flex-col items-center px-6 pt-28 overflow-x-hidden transition-colors ${isDark ? 'bg-gray-900' : 'bg-white'}`}>

      {/* Brain Image — NO GLOW / NO SHADOW */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        whileHover={{ scale: 1.02 }}
        style={{ y: brainY, opacity: brainOpacity }}
        className="flex justify-center mb-4"
      >
        <Image
          src="/images/img1.png"
          width={300}
          height={300}
          alt="Brain Illustration"
          className=""
        />
      </motion.div>

      {/* HERO TITLE */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        style={{ y: titleY }}
        className={`text-5xl md:text-6xl font-semibold tracking-tight text-center ${isDark ? 'text-white' : 'text-gray-900'}`}
      >
        Cognitive Screening
      </motion.h1>

      {/* SUBTEXT */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        style={{ y: subtextY }}
        className={`mt-5 text-lg leading-relaxed max-w-xl text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
      >
        A clinically-inspired, precisely crafted assessment designed to measure 
        memory, attention, visuospatial reasoning, and reaction time in a unified test.
      </motion.p>

      {/* CTA BUTTON */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mt-10"
      >
        <Button
          as={Link}
          href="/name"
          size="lg"
          className="
            px-10 py-6 text-lg text-white shadow-xl rounded-full
            bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500
            hover:shadow-2xl hover:scale-[1.04] transition-all
          "
        >
          Begin Assessment
        </Button>
      </motion.div>

      {/* FEATURE CARDS */}
      <section id="features" className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 py-20 mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}>
          <Card className={`rounded-3xl shadow-lg border transition hover:shadow-xl ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-100'}`}>
            <CardBody className="text-center p-6">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Clinically Aligned</h3>
              <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Grounded in cognitive neuroscience principles applied in early diagnostics.
              </p>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}>
          <Card className={`rounded-3xl shadow-lg border transition hover:shadow-xl ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-100'}`}>
            <CardBody className="text-center p-6">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Minimalistic Design</h3>
              <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                A calm, minimal interface designed to reduce distractions and eliminate any unknown variables during the test.
              </p>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7 }}>
          <Card className={`rounded-3xl shadow-lg border transition hover:shadow-xl ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-100'}`}>
            <CardBody className="text-center p-6">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Instant Insights</h3>
              <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Receive a quick breakdown of your cognitive performance after each test.
              </p>
            </CardBody>
          </Card>
        </motion.div>

      </section>

      {/* WHY SECTION — RESEARCH-BACKED, EDUCATIONAL */}
      <section id="about" className="w-full max-w-3xl pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={`text-3xl font-semibold text-center mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          Why This Screening Matters
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className={`text-lg leading-relaxed text-center mb-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
        >
          Early cognitive changes often begin subtly — far before they become visible 
          in daily life. Digital tasks that challenge memory, attention, decision speed, 
          and visuospatial reasoning can reveal patterns that traditional self-report 
          methods miss. Our test is designed as a first step, not a diagnosis, encouraging 
          users to seek professional assessment when meaningful differences appear.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className={`border rounded-2xl p-6 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
        >
          <h3 className={`text-xl font-semibold mb-3 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Polygonal-Chain Tasks and Visuospatial Reasoning
          </h3>

          <p className={`leading-relaxed text-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Polygonal-chain–based tests, which involve tracing or interpreting 
            sequentially connected line segments, are powerful tools for assessing 
            visuospatial working memory, perceptual integration, and planning. 
            Research in cognitive aging and mild cognitive impairment (MCI) has shown that:
          </p>

          <ul className={`mt-4 space-y-3 list-disc list-inside ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>
              Tasks involving mental reconstruction of polygonal paths detect early 
              deficits in spatial working memory and parietal-lobe mediated processing.
            </li>

            <li>
              Polygon-based reasoning challenges require simultaneous integration of 
              geometric orientation and executive planning — domains sensitive to 
              early neurodegenerative change.
            </li>

            <li>
              Studies highlight that visuospatial disorganization appears earlier 
              than language or episodic-memory decline in several cognitive disorders.
            </li>

            <li>
              Performance variability in polygonal-chain tasks correlates with 
              dysfunction in frontoparietal networks responsible for attention, 
              set-shifting, and spatial transformation.
            </li>
          </ul>

          <p className={`mt-4 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            By including polygonal-chain and mixed visuospatial tasks in our assessment, 
            users gain early insight into cognitive patterns that may warrant deeper 
            clinical evaluation. We encourage individuals who score below baseline or 
            observe consistent declines to consult licensed clinicians, neurologists, 
            or neuropsychologists for comprehensive testing.
          </p>
        </motion.div>
      </section>
    </div>

    <Footer />
    </>
  );
}
