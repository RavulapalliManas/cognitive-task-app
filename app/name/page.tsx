"use client";

import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function NamePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    country: "",
    sex: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save user information to localStorage
    localStorage.setItem("userName", formData.name);
    localStorage.setItem("userAge", formData.age);
    localStorage.setItem("userCountry", formData.country);
    localStorage.setItem("userSex", formData.sex);
    
    // Redirect to the actual test page (you can create this later)
    router.push("/tests/assessment");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-6 pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📋</div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Before We Begin
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Please provide some basic information for our assessment
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your age"
                min="1"
                max="120"
                required
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country of Origin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="e.g., United States, India, United Kingdom"
                required
              />
            </div>

            {/* Sex */}
            <div>
              <label htmlFor="sex" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold">🔒 Privacy Notice:</span> Your information is used solely for research purposes and to personalize your assessment experience. All data is stored securely and anonymously.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full px-10 py-6 text-lg text-white shadow-xl rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:shadow-2xl hover:scale-[1.02] transition-all"
            >
              Start Assessment →
            </Button>
          </form>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}
