"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import type { ScanResult } from "./types";
import AgentScanSteps from "@/components/agent/AgentScanSteps";

// Import step components
import { RepositoryStep } from "./RepositoryStep";
import { AnalyticsStep } from "./AnalyticsStep";
import { ScanStep } from "./ScanStep";
import { TrackingPlanStep } from "./TrackingPlanStep";
import { ActionStep } from "./ActionStep";

// Import types and shared data
import {
    FormData,
    TrackingEvent,
    steps,
    contentVariants
} from "./types";
// import { useRouter } from "next/navigation";

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
    const [, setScanResult] = useState<ScanResult | null>(null);
    const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
    const [scanStarted, setScanStarted] = useState(false);

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
        } catch {
            setRepoValidationError("Failed to validate repository. Please try again.");
            return false;
        } finally {
            setIsValidatingRepo(false);
        }
    };

    const nextStep = async () => {
        posthog.capture('landing_page__onboarding: next_step clicked', { step: currentStep, formData })

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
        posthog.capture('landing_page__onboarding: start_scan clicked', { step: currentStep, formData })
        // Immediately show streaming steps UI; completion will navigate to next step
        setScanStarted(true);
    };

    // Event management handlers
    const handleAddEvent = (event: TrackingEvent) => {
        setTrackingEvents(prev => [...prev, event]);
    };

    const handleDeleteEvent = (eventId: string) => {
        setTrackingEvents(prev => prev.filter(event => event.id !== eventId));
    };

    // Action handlers
    const handleExportToSheets = () => {
        // Placeholder for actual implementation
        fetch("/api/ai/export/googlesheet/guest", {
            method: "POST",
            body: JSON.stringify({
                repositoryUrl: formData.repositoryUrl,
                analyticsProviders: formData.analyticsProviders,
                trackingEvents: trackingEvents,
                spreadsheetTitle: "Analytics Tracking Plan - " + new URL(formData.repositoryUrl).pathname.replace('/', '').replace('/', '-'),
            }),
        });
    };

    const handleImplementWithCoder = () => {
        // Placeholder for actual implementation
        console.log("Implementing with AATX Coder:", { formData, trackingEvents });
    };

    const handleSaveToDatabase = async () => {
        try {
            const response = await fetch("/api/repositories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repositoryUrl: formData.repositoryUrl,
                    analyticsProviders: formData.analyticsProviders,
                    events: trackingEvents.map(e => ({
                        name: e.name,
                        description: e.description,
                        properties: e.properties,
                        implementation: e.implementation,
                        isNew: e.isNew === true,
                    })),
                }),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || "Failed to save repository");
            }

            const { repository } = await response.json();
            toast.success("Repository and events saved");
            // navigate to repository detail page if available in client environment
            if (typeof window !== "undefined") {
                window.location.href = `/repositories/${repository.id}`;
            }
        } catch (err) {
            toast.error((err as Error).message);
        }
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
            case 3:
                return trackingEvents.length > 0; // Tracking plan step
            case 4:
                return true; // Action step
            default:
                return true;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <RepositoryStep
                        formData={formData}
                        repoValidationError={repoValidationError}
                        isValidatingRepo={isValidatingRepo}
                        onUpdateFormData={updateFormData}
                    />
                );
            case 1:
                return (
                    <AnalyticsStep
                        formData={formData}
                        onUpdateFormData={updateFormData}
                        onToggleProvider={toggleAnalyticsProvider}
                    />
                );
            case 2: {
                const selectedProviders = formData.analyticsProviders.map(provider =>
                    provider === "Custom" ? formData.customProvider : provider
                );
                return (
                    <>
                        {!scanStarted ? (
                            <ScanStep formData={formData} />
                        ) : (
                            <AgentScanSteps
                                body={{ repositoryUrl: formData.repositoryUrl, analyticsProviders: selectedProviders }}
                                autoStart
                                className="w-full px-8"
                                onComplete={(res) => {
                                    try {
                                        if (res.parsedObject && typeof res.parsedObject === 'object') {
                                            const obj = res.parsedObject as Record<string, unknown>;
                                            if (Array.isArray(obj.events)) {
                                                const events: TrackingEvent[] = (obj.events as TrackingEvent[]).map((event: TrackingEvent, index: number) => ({
                                                    id: `event-${index}`,
                                                    name: event.name,
                                                    description: event.description,
                                                    properties: event.properties,
                                                    implementation: event.implementation,
                                                    isNew: false,
                                                }));
                                                setTrackingEvents(events);
                                                setScanResult(obj as unknown as ScanResult);
                                                toast.success("Repository scan completed successfully!");
                                                setCurrentStep(3);
                                            } else {
                                                toast.error("Scan did not return events. Please try again.");
                                            }
                                        } else {
                                            toast.error("No structured result detected in final output.");
                                        }
                                    } catch (e) {
                                        toast.error("Failed to parse scan result.");
                                    }
                                }}
                            />
                        )}
                    </>
                );
            }
            case 3:
                return (
                    <TrackingPlanStep
                        trackingEvents={trackingEvents}
                        onAddEvent={handleAddEvent}
                        onDeleteEvent={handleDeleteEvent}
                    />
                );
            case 4:
                return (
                    <ActionStep
                        formData={formData}
                        trackingEvents={trackingEvents}
                        onExportToSheets={handleExportToSheets}
                        onImplementWithCoder={handleImplementWithCoder}
                        onSaveToDatabase={window.location.href === "/dashboard" ? handleSaveToDatabase : undefined}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-3xl mx-auto py-8">
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
                                {renderStepContent()}
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
                            {/* Hide next button on the last step since we have action buttons */}
                            {currentStep < 4 && (
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        type="button"
                                        onClick={
                                            currentStep === 2 ? handleStartScan : nextStep
                                        }
                                        disabled={!isStepValid() || isSubmitting || isValidatingRepo}
                                        className={cn(
                                            "flex items-center gap-1 transition-all duration-300 rounded-2xl",
                                            currentStep === 2 ? "bg-green-600 hover:bg-green-700" : "",
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
                                                {currentStep === 2 ? "Start Scan" : "Next"}
                                                {currentStep === 2 ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            )}
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