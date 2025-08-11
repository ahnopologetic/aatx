"use client"

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import AgentScanSteps from "@/components/agent/AgentScanSteps";

import { AnalyticsStep } from "@/components/ui/multistep-form/AnalyticsStep";
import { ScanStep } from "@/components/ui/multistep-form/ScanStep";
import { TrackingPlanStep } from "@/components/ui/multistep-form/TrackingPlanStep";
import { ActionStep } from "@/components/ui/multistep-form/ActionStep";
import { AuthedRepositoryStep } from "./repository-step";

import type { ScanResult } from "@/components/ui/multistep-form/types";

import {
    FormData as GuestFormData,
    TrackingEvent,
    steps as guestSteps,
    contentVariants
} from "@/components/ui/multistep-form/types";

export type AuthedFormData = Omit<GuestFormData, "selectedRepositories"> & {
    selectedRepositories: {
        id: string;
        fullName?: string;
        url: string;
        label?: "app" | "web_app" | "desktop_app" | "server" | "custom";
        customLabel?: string;
    }[];
};

const steps = [
    { id: "repository", title: "Select Repositories" },
    ...guestSteps.slice(1),
];

type OnboardingFormProps = { user?: User };

const AuthedMultiStepForm = ({ user }: OnboardingFormProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidatingRepo, setIsValidatingRepo] = useState(false);
    const [repoValidationError, setRepoValidationError] = useState<string>("");
    const [formData, setFormData] = useState<AuthedFormData>({
        repositoryUrl: "",
        analyticsProviders: [],
        customProvider: "",
        selectedRepositories: [],
    });
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
    const [scanStarted, setScanStarted] = useState(false);
    const [scanStatuses, setScanStatuses] = useState<Record<string, "idle" | "queued" | "success" | "error">>({});

    const updateFormData = (field: keyof AuthedFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === "repositoryUrl" && repoValidationError) setRepoValidationError("");
    };

    const updateSelectedRepositories = (repos: AuthedFormData["selectedRepositories"]) => {
        setFormData((prev) => ({ ...prev, selectedRepositories: repos }));
        if (repos.length === 0) setRepoValidationError("Please select at least one repository");
        else if (repoValidationError) setRepoValidationError("");
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
        const urlPattern = /^https?:\/\/(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/[^\/]+\/[^\/]+((\/(tree|branch)\/[^\/]+)?)\/?$/;
        if (!urlPattern.test(url)) {
            setRepoValidationError("Please enter a valid repository URL from GitHub, GitLab, or Bitbucket");
            return false;
        }
        setIsValidatingRepo(true);
        setRepoValidationError("");
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        } catch {
            setRepoValidationError("Failed to validate repository. Please try again.");
            return false;
        } finally {
            setIsValidatingRepo(false);
        }
    };

    const nextStep = async () => {
        posthog.capture('authed_onboarding: next_step clicked', { step: currentStep })
        if (currentStep === 0) {
            if (!formData.selectedRepositories || formData.selectedRepositories.length === 0) {
                setRepoValidationError("Please select at least one repository");
                return;
            }
            // Sync primary URL for downstream scan step
            updateFormData("repositoryUrl", formData.selectedRepositories[0].url);
            const isValid = await validateRepositoryUrl(formData.repositoryUrl || formData.selectedRepositories[0].url);
            if (!isValid) return;
        }
        if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
    };

    const prevStep = () => { if (currentStep > 0) setCurrentStep((prev) => prev - 1); };

    const handleStartScan = async () => {
        posthog.capture('authed_onboarding: start_scan clicked', { step: currentStep })
        if (!formData.selectedRepositories || formData.selectedRepositories.length === 0) return;
        setIsSubmitting(true);
        const selectedProviders = formData.analyticsProviders.map(p => p === "Custom" ? formData.customProvider : p);
        // initialize statuses
        const initStatuses: Record<string, "idle" | "queued" | "success" | "error"> = {};
        for (const r of formData.selectedRepositories) initStatuses[r.id] = "queued";
        setScanStatuses(initStatuses);
        // run scans in parallel and wait for all to finish before proceeding
            const results = await Promise.allSettled(
            formData.selectedRepositories.map(async (repo) => {
                try {
                    const resp = await fetch("/api/ai/scan/user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        keepalive: true,
                        body: JSON.stringify({ repositoryUrl: repo.url, analyticsProviders: selectedProviders }),
                    });
                    if (resp.ok) {
                        const { result } = await resp.json();
                        const resultEvents: TrackingEvent[] = (result.events as TrackingEvent[]).map((event: TrackingEvent, index: number) => ({
                            id: `event-${index}`,
                            name: event.name,
                            description: event.description,
                            properties: event.properties,
                            implementation: event.implementation,
                            isNew: false,
                            sourceRepoId: String(repo.id),
                            sourceRepoUrl: repo.url,
                            sourceRepoName: repo.fullName,
                        }));
                        setTrackingEvents(events => [...events, ...resultEvents]);
                        setScanStatuses(prev => ({ ...prev, [repo.id]: "success" }));
                        return result
                    } else {
                        setScanStatuses(prev => ({ ...prev, [repo.id]: "error" }));
                    }
                } catch {
                    setScanStatuses(prev => ({ ...prev, [repo.id]: "error" }));
                }
            })
        );
        const numSuccess = results.filter(r => r.status === "fulfilled").length;
        const total = results.length;
        toast.success(`Scans finished: ${numSuccess}/${total} succeeded`);
        setScanStarted(true);
        setScanResult(
            results
                .filter(r => r.status === "fulfilled")
                .flatMap(r => {
                    const result = (r as PromiseFulfilledResult<any>).value as ScanResult;
                    if (!result?.events || !Array.isArray(result.events)) return [];
                    return result.events;
                })
                .reduce((acc, event) => {
                    if (event && event.name) {
                        // Clone event and remove 'name' from value
                        const { name, ...rest } = event;
                        acc[name] = rest;
                    }
                    return acc;
                }, {} as Record<string, Omit<TrackingEvent, "name">>)
        );
        setIsSubmitting(false);
        setCurrentStep(3);
    };

    const handleAddEvent = (event: TrackingEvent) => setTrackingEvents(prev => [...prev, event]);
    const handleDeleteEvent = (eventId: string) => setTrackingEvents(prev => prev.filter(e => e.id !== eventId));

    const handleSaveToDatabase = async () => {
        if (!user) {
            toast.error("Please log in to save your repository and events", {
                action: { label: "Log in", onClick: () => { window.location.href = "/login"; } },
            });
            return;
        }
        try {
            // Group events by sourceRepoId (or fall back to the first selected repo if none)
            const eventsByRepo: Record<string, TrackingEvent[]> = {};
            const selected = formData.selectedRepositories || [];
            const defaultRepoId = selected[0] ? String(selected[0].id) : undefined;
            for (const event of trackingEvents) {
                const repoId = event.sourceRepoId || defaultRepoId;
                if (!repoId) continue;
                if (!eventsByRepo[repoId]) eventsByRepo[repoId] = [];
                eventsByRepo[repoId].push(event);
            }

            // Build list of repos to save (ensure repos with zero events are also created)
            const reposToSave = selected.map(r => ({
                id: String(r.id),
                url: r.url,
                fullName: r.fullName,
                events: eventsByRepo[String(r.id)] || [],
            }));

            // Save sequentially to keep UX simple; could parallelize if needed
            const createdRepoIds: string[] = [];
            for (const repo of reposToSave) {
                const response = await fetch("/api/repositories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        repositoryUrl: repo.url,
                        analyticsProviders: formData.analyticsProviders,
                        events: (repo.events || []).map(e => ({
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
                    throw new Error(error || `Failed to save repository ${repo.fullName || repo.url}`);
                }
                const { repository } = await response.json();
                createdRepoIds.push(repository.id);
            }

            toast.success(`Saved ${createdRepoIds.length} repos${createdRepoIds.length ? " and events" : ""}`);
            if (typeof window !== "undefined" && createdRepoIds.length === 1) {
                window.location.href = `/repositories/${createdRepoIds[0]}`;
            }
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 0:
                return (formData.selectedRepositories?.length ?? 0) > 0 && !repoValidationError;
            case 1:
                return formData.analyticsProviders.length > 0 && (!formData.analyticsProviders.includes("Custom") || formData.customProvider.trim() !== "");
            case 2:
                return true;
            case 3:
                // Allow proceeding even when there are no events
                return true;
            case 4:
                return true;
            default:
                return true;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <AuthedRepositoryStep
                        formData={formData as any}
                        repoValidationError={repoValidationError}
                        isValidatingRepo={isValidatingRepo}
                        onUpdateFormData={(f, v) => updateFormData(f as keyof AuthedFormData, v)}
                        onUpdateSelectedRepositories={updateSelectedRepositories as any}
                    />
                );
            case 1:
                return (
                    <AnalyticsStep
                        formData={formData as any}
                        onUpdateFormData={(f, v) => updateFormData(f as keyof AuthedFormData, v)}
                        onToggleProvider={toggleAnalyticsProvider}
                    />
                );
            case 2: {
                return (
                    <div className="px-8 py-6 space-y-4">
                        <div className="text-sm text-muted-foreground">We will scan all selected repositories in the background.</div>
                        <ul className="space-y-2">
                            {(formData.selectedRepositories || []).map(repo => (
                                <li key={repo.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="text-sm">
                                        <div className="font-medium">{repo.fullName || repo.url}</div>
                                        <div className="text-xs text-muted-foreground">{repo.url}</div>
                                    </div>
                                    <div className="text-xs">
                                        {scanStatuses[repo.id] === "queued" && <span className="text-blue-600">Queued</span>}
                                        {scanStatuses[repo.id] === "success" && <span className="text-green-600">Done</span>}
                                        {scanStatuses[repo.id] === "error" && <span className="text-red-600">Error</span>}
                                        {!scanStatuses[repo.id] && <span className="text-muted-foreground">Idle</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            }
            case 3:
                return (
                    <TrackingPlanStep
                        trackingEvents={trackingEvents}
                        onAddEvent={event => setTrackingEvents(prev => [...prev, event])}
                        onDeleteEvent={id => setTrackingEvents(prev => prev.filter(e => e.id !== id))}
                        repositories={(formData.selectedRepositories || []).map(r => ({ id: String(r.id), name: r.fullName, url: r.url }))}
                    />
                );
            case 4:
                return (
                    <ActionStep
                        formData={formData as any}
                        trackingEvents={trackingEvents}
                        repositories={(formData.selectedRepositories || []).map(r => ({ id: String(r.id), name: r.fullName, url: r.url }))}
                        onImplementWithCoder={() => {
                            if (!user) {
                                toast.error("Please log in to implement with AATX Coder", {
                                    action: { label: "Log in", onClick: () => { window.location.href = "/login"; } },
                                });
                                return;
                            }
                        }}
                        onSaveToDatabase={handleSaveToDatabase}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-3xl mx-auto py-8">
            <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="flex justify-between mb-2">
                    {steps.map((step, index) => (
                        <motion.div key={index} className="flex flex-col items-center" whileHover={{ scale: 1.1 }}>
                            <motion.div
                                className={cn(
                                    "w-4 h-4 rounded-full cursor-pointer transition-colors duration-300",
                                    index < currentStep ? "bg-primary" : index === currentStep ? "bg-primary ring-4 ring-primary/20" : "bg-muted",
                                )}
                                onClick={() => { if (index <= currentStep) setCurrentStep(index); }}
                                whileTap={{ scale: 0.95 }}
                            />
                            <motion.span className={cn("text-xs mt-1.5 hidden sm:block", index === currentStep ? "text-primary font-medium" : "text-muted-foreground")}>{steps[index].title}</motion.span>
                        </motion.div>
                    ))}
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
                    <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.3 }} />
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                <Card className="rounded-3xl overflow-hidden">
                    <div>
                        <AnimatePresence mode="wait">
                            <motion.div key={currentStep} initial="hidden" animate="visible" exit="exit" variants={contentVariants}>
                                {renderStepContent()}
                            </motion.div>
                        </AnimatePresence>

                        <CardFooter className="flex justify-between pt-6 pb-4">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0} className="flex items-center gap-1 transition-all duration-300 rounded-2xl">
                                    <ChevronLeft className="h-4 w-4" /> Back
                                </Button>
                            </motion.div>
                            {currentStep < 4 && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="button"
                                        onClick={currentStep === 2 ? handleStartScan : nextStep}
                                        disabled={!isStepValid() || isSubmitting || isValidatingRepo}
                                        className={cn("flex items-center gap-1 transition-all duration-300 rounded-2xl", currentStep === 2 ? "bg-green-600 hover:bg-green-700" : "")}
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
                                                {currentStep === 2 ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            )}
                        </CardFooter>
                    </div>
                </Card>
            </motion.div>

            <motion.div className="mt-4 text-center text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </motion.div>
        </div>
    );
};

export default AuthedMultiStepForm;

