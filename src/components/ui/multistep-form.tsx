"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const steps = [
  { id: "repository", title: "Repository URL" },
  { id: "analytics", title: "Analytics Provider" },
  { id: "scan", title: "Start Scan" },
];

interface FormData {
  repositoryUrl: string;
  analyticsProviders: string[];
  customProvider: string;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const analyticsProviders = [
  { name: "Google Analytics", color: "bg-orange-500", initials: "GA" },
  { name: "Google Tag Manager", color: "bg-blue-600", initials: "GTM" },
  { name: "Segment", color: "bg-green-500", initials: "S" },
  { name: "Mixpanel", color: "bg-purple-600", initials: "MP" },
  { name: "Amplitude", color: "bg-blue-500", initials: "A" },
  { name: "Rudderstack", color: "bg-red-500", initials: "RS" },
  { name: "mParticle", color: "bg-pink-500", initials: "mP" },
  { name: "PostHog", color: "bg-yellow-500", initials: "PH" },
  { name: "Pendo", color: "bg-indigo-500", initials: "P" },
  { name: "Heap", color: "bg-teal-500", initials: "H" },
  { name: "Datadog RUM", color: "bg-violet-500", initials: "DD" },
  { name: "Snowplow (Structured Events)", color: "bg-cyan-500", initials: "SP" },
  { name: "Custom", color: "bg-gray-500", initials: "?" }
];

const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
};

const OnboardingForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingRepo, setIsValidatingRepo] = useState(false);
  const [repoValidationError, setRepoValidationError] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    repositoryUrl: "",
    analyticsProviders: [],
    customProvider: "",
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (field === "repositoryUrl" && repoValidationError) {
      setRepoValidationError("");
    }
  };

  const toggleAnalyticsProvider = (providerName: string) => {
    setFormData((prev) => {
      const providers = [...prev.analyticsProviders];
      if (providers.includes(providerName)) {
        return { ...prev, analyticsProviders: providers.filter((p) => p !== providerName) };
      } else {
        return { ...prev, analyticsProviders: [...providers, providerName] };
      }
    });
  };

  const validateRepositoryUrl = async (url: string): Promise<boolean> => {
    // Enhanced URL validation to support /branch/<branch_name> and /tree/<branch_name> at the end
    // Accepts URLs from GitHub, GitLab, or Bitbucket
    const urlPattern = /^https?:\/\/(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/[^\/]+\/[^\/]+((\/(tree|branch)\/[^\/]+)?)\/?$/;
    if (!urlPattern.test(url)) {
      setRepoValidationError("Please enter a valid repository URL from GitHub, GitLab, or Bitbucket");
      return false;
    }

    setIsValidatingRepo(true);
    setRepoValidationError("");

    try {
      // Simulate repository validation API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo purposes, randomly succeed or fail
      const isValid = Math.random() > 0.3;

      if (!isValid) {
        setRepoValidationError("Repository not found. If you want to scan a private repo or repo from your organization, please log in.");
        return false;
      }

      return true;
    } catch (error) {
      setRepoValidationError("Failed to validate repository. Please try again.");
      return false;
    } finally {
      setIsValidatingRepo(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 0) {
      // Validate repository URL before proceeding
      const isValid = await validateRepositoryUrl(formData.repositoryUrl);
      if (!isValid) return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStartScan = async () => {
    setIsSubmitting(true);

    // Simulate starting the scan
    setTimeout(async () => {
      toast.success("Repository scan started successfully!");
      const selectedProviders = formData.analyticsProviders.map(provider =>
        provider === "Custom" ? formData.customProvider : provider
      );

      const response = await fetch("/api/ai/scan/guest", {
        method: "POST",
        body: JSON.stringify({ repositoryUrl: formData.repositoryUrl, analyticsProviders: selectedProviders }),
      })

      const result = await response.json()

      console.log({ result })
      setIsSubmitting(false);
    }, 2000);
  };

  // Check if step is valid for next button
  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.repositoryUrl.trim() !== "" && !repoValidationError;
      case 1:
        return formData.analyticsProviders.length > 0 &&
          (!formData.analyticsProviders.includes("Custom") || formData.customProvider.trim() !== "");
      case 2:
        return true; // Start scan step
      default:
        return true;
    }
  };

  const preventDefault = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full w-xl mx-auto py-8">
      {/* Progress indicator */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center"
              whileHover={{ scale: 1.1 }}
            >
              <motion.div
                className={cn(
                  "w-4 h-4 rounded-full cursor-pointer transition-colors duration-300",
                  index < currentStep
                    ? "bg-primary"
                    : index === currentStep
                      ? "bg-primary ring-4 ring-primary/20"
                      : "bg-muted",
                )}
                onClick={() => {
                  // Only allow going back or to completed steps
                  if (index <= currentStep) {
                    setCurrentStep(index);
                  }
                }}
                whileTap={{ scale: 0.95 }}
              />
              <motion.span
                className={cn(
                  "text-xs mt-1.5 hidden sm:block",
                  index === currentStep
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {step.title}
              </motion.span>
            </motion.div>
          ))}
        </div>
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="rounded-3xl overflow-hidden">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
              >
                {/* Step 1: Repository URL */}
                {currentStep === 0 && (
                  <>
                    <CardHeader>
                      <CardTitle>Repository URL</CardTitle>
                      <CardDescription>
                        Enter the repository URL you want to scan for analytics tracking
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 my-4">
                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label htmlFor="repositoryUrl">Repository URL</Label>
                        <Input
                          id="repositoryUrl"
                          placeholder="https://github.com/username/repository"
                          value={formData.repositoryUrl}
                          onChange={(e) =>
                            updateFormData("repositoryUrl", e.target.value)
                          }
                          className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        {repoValidationError && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-destructive"
                          >
                            {repoValidationError}
                          </motion.p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Supported platforms: GitHub, GitLab, Bitbucket
                        </p>
                      </motion.div>
                    </CardContent>
                  </>
                )}

                {/* Step 2: Analytics Provider Selection */}
                {currentStep === 1 && (
                  <>
                    <CardHeader>
                      <CardTitle>Select Analytics Tracking Providers</CardTitle>
                      <CardDescription>
                        Choose all analytics providers you are using in your repository. You can select multiple providers.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 my-4">
                      <motion.div variants={fadeInUp} className="space-y-4">
                        <Label>Select your analytics providers</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {analyticsProviders.map((provider, index) => (
                            <motion.div
                              key={provider.name}
                              className={cn(
                                "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:shadow-md",
                                formData.analyticsProviders.includes(provider.name)
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:bg-accent"
                              )}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                  delay: 0.05 * index,
                                  duration: 0.3,
                                },
                              }}
                              onClick={() => toggleAnalyticsProvider(provider.name)}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                                provider.color
                              )}>
                                {provider.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {provider.name}
                                </span>
                              </div>
                              <Checkbox
                                checked={formData.analyticsProviders.includes(provider.name)}
                                onCheckedChange={() => toggleAnalyticsProvider(provider.name)}
                                className="pointer-events-none"
                              />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {formData.analyticsProviders.includes("Custom") && (
                        <motion.div
                          variants={fadeInUp}
                          initial="hidden"
                          animate="visible"
                          className="space-y-2"
                        >
                          <Label htmlFor="customProvider">Custom Provider Name</Label>
                          <Input
                            id="customProvider"
                            placeholder="Enter your custom analytics provider"
                            value={formData.customProvider}
                            onChange={(e) =>
                              updateFormData("customProvider", e.target.value)
                            }
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </motion.div>
                      )}
                    </CardContent>
                  </>
                )}

                {/* Step 3: Start Scan */}
                {currentStep === 2 && (
                  <>
                    <CardHeader>
                      <CardTitle>Ready to Start Scan</CardTitle>
                      <CardDescription>
                        Review your settings and start the analytics tracking scan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <motion.div variants={fadeInUp} className="space-y-4">
                        <div className="rounded-lg border p-4 space-y-3">
                          <h4 className="font-medium">Scan Configuration</h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">Repository:</p>
                              <p className="text-sm text-muted-foreground">{formData.repositoryUrl}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Analytics Providers:</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {formData.analyticsProviders.map((providerName) => {
                                  const provider = analyticsProviders.find(p => p.name === providerName);
                                  const displayName = providerName === "Custom" ? formData.customProvider : providerName;

                                  return (
                                    <div key={providerName} className="flex items-center space-x-2 bg-secondary rounded-full px-3 py-1">
                                      {provider && (
                                        <div className={cn(
                                          "w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                                          provider.color
                                        )}>
                                          {provider.initials}
                                        </div>
                                      )}
                                      <span className="text-xs font-medium">{displayName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The scan will analyze your repository for analytics tracking implementations,
                          identify tracking events, and provide insights on your analytics setup.
                        </p>
                      </motion.div>
                    </CardContent>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <CardFooter className="flex justify-between pt-6 pb-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 transition-all duration-300 rounded-2xl"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="button"
                  onClick={
                    currentStep === steps.length - 1 ? handleStartScan : nextStep
                  }
                  disabled={!isStepValid() || isSubmitting || isValidatingRepo}
                  className={cn(
                    "flex items-center gap-1 transition-all duration-300 rounded-2xl",
                    currentStep === steps.length - 1 ? "bg-green-600 hover:bg-green-700" : "",
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Starting Scan...
                    </>
                  ) : isValidatingRepo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Validating...
                    </>
                  ) : (
                    <>
                      {currentStep === steps.length - 1 ? "Start Scan" : "Next"}
                      {currentStep === steps.length - 1 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </div>
        </Card>
      </motion.div>

      {/* Step indicator */}
      <motion.div
        className="mt-4 text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
      </motion.div>
    </div>
  );
};

export default OnboardingForm;
