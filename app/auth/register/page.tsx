"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Input, Select, SelectItem, Autocomplete, AutocompleteItem } from "@heroui/react";
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
    pin: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!formData.pin) {
      newErrors.pin = "PIN is required";
    } else if (formData.pin.length !== 4 || isNaN(Number(formData.pin))) {
      newErrors.pin = "PIN must be 4 digits";
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
      await registerUser(
        formData.name.trim(),
        parseInt(formData.age),
        formData.country,
        formData.sex,
        formData.pin
      );

      // Successfully registered and logged in
      router.push("/tests/assessment");
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ submit: "Registration failed. Please try again." });
      setIsSubmitting(false);
    }
  };

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
              Join to start your assessment
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

                  <div className="grid grid-cols-2 gap-4">
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
                        Sex *
                      </label>
                      <Select
                        placeholder="Select"
                        selectedKeys={formData.sex ? [formData.sex] : []}
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                        isInvalid={!!errors.sex}
                        errorMessage={errors.sex}
                        size="lg"
                        variant="bordered"
                        classNames={{
                          trigger: "h-14 border-2 border-gray-300 dark:border-gray-700",
                          value: "text-lg font-medium text-gray-900 dark:text-white",
                        }}
                        isRequired
                      >
                        <SelectItem key="Male">Male</SelectItem>
                        <SelectItem key="Female">Female</SelectItem>
                        <SelectItem key="Other">Other</SelectItem>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Country *
                    </label>
                    <Autocomplete
                      placeholder="Type to search country..."
                      className="max-w-full"
                      onSelectionChange={(key) => setFormData({ ...formData, country: key as string })}
                      isInvalid={!!errors.country}
                      errorMessage={errors.country}
                      size="lg"
                      variant="bordered"
                      inputProps={{
                        classNames: {
                          input: "text-lg font-medium",
                          inputWrapper: "h-14 border-2 border-gray-300 dark:border-gray-700"
                        }
                      }}
                    >
                      {countries.map((country) => (
                        <AutocompleteItem key={country}>
                          {country}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                      Create 4-Digit PIN *
                    </label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      placeholder="****"
                      maxLength={4}
                      value={formData.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                        setFormData({ ...formData, pin: val });
                      }}
                      isInvalid={!!errors.pin}
                      errorMessage={errors.pin}
                      size="lg"
                      variant="bordered"
                      classNames={{
                        input: "text-lg font-mono font-bold text-center tracking-widest text-gray-900 dark:text-white",
                        inputWrapper: "h-14 border-2 border-gray-300 dark:border-gray-700",
                      }}
                      isRequired
                    />
                    <p className="text-xs text-gray-500 mt-1">You will use this PIN to log back in.</p>
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
                      Start Assessment
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
