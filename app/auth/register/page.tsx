"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Input, Select, SelectItem } from "@heroui/react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { registerUser } from "@/lib/userAuth";
import { countries } from "@/lib/countries";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    country: "",
    sex: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const ageNum = parseInt(formData.age);
    if (!formData.age) {
      newErrors.age = "Age is required";
    } else if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      newErrors.age = "Please enter a valid age (1-120)";
    }

    if (!formData.country) {
      newErrors.country = "Country is required";
    }

    if (!formData.sex) {
      newErrors.sex = "Sex is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await registerUser(
        formData.name.trim(),
        parseInt(formData.age),
        formData.country,
        formData.sex
      );

      setGeneratedCode(user.code);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ submit: "Registration failed. Please try again." });
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    router.push("/tests/assessment");
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
    }
  };

  if (generatedCode) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 pt-28 pb-20">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Card className="rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <CardBody className="p-12">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="text-8xl mb-6"
                    >
                      ✅
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                      Registration Complete
                    </h2>
                    <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 font-medium">
                      Save your access code below
                    </p>

                    <div className="bg-blue-600 rounded-xl p-8 mb-8">
                      <p className="text-white text-sm font-bold mb-4 uppercase tracking-wider">
                        Your Access Code
                      </p>
                      <div className="bg-white rounded-lg p-6 mb-4">
                        <p className="text-7xl font-mono font-black text-blue-600 tracking-widest">
                          {generatedCode}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="w-full bg-white text-blue-600 font-bold hover:bg-gray-100 rounded-2xl"
                        onClick={handleCopyCode}
                      >
                        📋 Copy Code to Clipboard
                      </Button>
                    </div>

                    <div className="bg-red-50 dark:bg-red-950 border-3 border-red-500 dark:border-red-600 rounded-xl p-6 mb-8">
                      <div className="flex items-start gap-3">
                        <span className="text-4xl">⚠️</span>
                        <div className="text-left">
                          <p className="font-black text-red-900 dark:text-red-100 mb-2 text-lg">
                            SAVE THIS CODE NOW!
                          </p>
                          <p className="text-red-800 dark:text-red-200 font-semibold">
                            Screenshot or write down this code. You cannot recover it later. You need this code to login.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full py-7 text-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg rounded-2xl"
                      onClick={handleContinue}
                    >
                      Continue to Assessment →
                    </Button>
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 pt-28 pb-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">📝</div>
            <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              Create Account
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 font-medium">
              Fill out the form below to get your access code
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <CardBody className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Full Name *
                    </label>
                    <Input
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      isInvalid={!!errors.name}
                      errorMessage={errors.name}
                      size="lg"
                      variant="bordered"
                      classNames={{
                        input: "text-lg font-medium text-gray-900 dark:text-white",
                        inputWrapper: "h-14 border-2 border-gray-300 dark:border-gray-700",
                      }}
                      isRequired
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Age *
                    </label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      isInvalid={!!errors.age}
                      errorMessage={errors.age}
                      size="lg"
                      variant="bordered"
                      min={1}
                      max={120}
                      classNames={{
                        input: "text-lg font-medium text-gray-900 dark:text-white",
                        inputWrapper: "h-14 border-2 border-gray-300 dark:border-gray-700",
                      }}
                      isRequired
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Country *
                    </label>
                    <Select
                      placeholder="Select your country"
                      selectedKeys={formData.country ? [formData.country] : []}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      isInvalid={!!errors.country}
                      errorMessage={errors.country}
                      size="lg"
                      variant="bordered"
                      classNames={{
                        trigger: "h-14 border-2 border-gray-300 dark:border-gray-700",
                        value: "text-lg font-medium text-gray-900 dark:text-white",
                        listboxWrapper: "max-h-[400px]",
                        popoverContent: "bg-white dark:bg-gray-800",
                      }}
                      listboxProps={{
                        itemClasses: {
                          base: "data-[hover=true]:bg-blue-100 dark:data-[hover=true]:bg-blue-900 text-gray-900 dark:text-white",
                        },
                      }}
                      isRequired
                    >
                      {countries.map((country) => (
                        <SelectItem key={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Sex *
                    </label>
                    <Select
                      placeholder="Select your sex"
                      selectedKeys={formData.sex ? [formData.sex] : []}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      isInvalid={!!errors.sex}
                      errorMessage={errors.sex}
                      size="lg"
                      variant="bordered"
                      classNames={{
                        trigger: "h-14 border-2 border-gray-300 dark:border-gray-700",
                        value: "text-lg font-medium text-gray-900 dark:text-white",
                        listboxWrapper: "max-h-[400px]",
                        popoverContent: "bg-white dark:bg-gray-800",
                      }}
                      listboxProps={{
                        itemClasses: {
                          base: "data-[hover=true]:bg-blue-100 dark:data-[hover=true]:bg-blue-900 text-gray-900 dark:text-white",
                        },
                      }}
                      isRequired
                    >
                      <SelectItem key="Male">Male</SelectItem>
                      <SelectItem key="Female">Female</SelectItem>
                      <SelectItem key="Other">Other</SelectItem>
                      <SelectItem key="Prefer not to say">
                        Prefer not to say
                      </SelectItem>
                    </Select>
                  </div>

                  {errors.submit && (
                    <div className="bg-red-100 dark:bg-red-950 border-2 border-red-500 rounded-lg p-4">
                      <p className="text-red-900 dark:text-red-100 font-bold">{errors.submit}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      size="lg"
                      variant="bordered"
                      className="flex-1 py-6 text-lg font-bold border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl"
                      onClick={() => router.back()}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="flex-1 py-6 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl"
                      isLoading={isSubmitting}
                    >
                      Create Account
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-center"
          >
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              🔒 All data stored locally on your device
            </p>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
);
 }
