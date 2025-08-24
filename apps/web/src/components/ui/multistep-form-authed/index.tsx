"use client"

import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { captureEvent } from "@/lib/posthog";

import { useState } from "react";
import { toast } from "sonner";

import AgentScanSteps from "@/components/agent/AgentScanSteps";
import { ActionStep } from "@/components/ui/multistep-form/ActionStep";
import { AnalyticsStep } from "@/components/ui/multistep-form/AnalyticsStep";
import { TrackingPlanStep } from "@/components/ui/multistep-form/TrackingPlanStep";
import { AuthedRepositoryStep } from "./repository-step";

import {
    FormData as GuestFormData,
    TrackingEvent,
    contentVariants,
    steps as guestSteps
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
    const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
    const [scanStarted, setScanStarted] = useState(false);
    const [scanStatuses, setScanStatuses] = useState<Record<string, "idle" | "queued" | "success" | "error">>({});
    const [currentScanningRepo, setCurrentScanningRepo] = useState<AuthedFormData["selectedRepositories"][0] | null>(null);
    const [currentScanIndex, setCurrentScanIndex] = useState(0);
    const [allReposScanned, setAllReposScanned] = useState(false);
    const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
    const [repoPatterns, setRepoPatterns] = useState<Record<string, any>>({});
    const [repoClonedPaths, setRepoClonedPaths] = useState<Record<string, string>>({});

    const updateFormData = (field: keyof AuthedFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === "repositoryUrl" && repoValidationError) setRepoValidationError("");
    };

    const updateSelectedRepositories = (repos: AuthedFormData["selectedRepositories"]) => {
        setFormData((prev) => ({ ...prev, selectedRepositories: repos }));
        if (repos.length === 0) {
            setRepoValidationError("Please select at least one repository");
            setExpandedRepos(new Set());
        } else {
            if (repoValidationError) setRepoValidationError("");
            // Always expand the first repository
            setExpandedRepos(new Set([repos[0].id]));
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

    const nextStep = async () => {
        posthog.capture('authed_onboarding: next_step clicked', { step: currentStep })
        if (currentStep === 0) {
            if (!formData.selectedRepositories || formData.selectedRepositories.length === 0) {
                setRepoValidationError("Please select at least one repository");
                return;
            }
            // Sync primary URL for downstream scan step
            updateFormData("repositoryUrl", formData.selectedRepositories[0].url);
        }
        if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
    };

    const prevStep = () => { if (currentStep > 0) setCurrentStep((prev) => prev - 1); };

    const handleStartScan = async () => {
        posthog.capture('authed_onboarding: start_scan clicked', { step: currentStep })
        if (!formData.selectedRepositories || formData.selectedRepositories.length === 0) return;

        setIsSubmitting(true);
        setScanStarted(true);
        setCurrentScanIndex(0);
        setAllReposScanned(false);

        // Initialize statuses
        const initStatuses: Record<string, "idle" | "queued" | "success" | "error"> = {};
        for (const r of formData.selectedRepositories) initStatuses[r.id] = "queued";
        setScanStatuses(initStatuses);

        // Start scanning the first repository and expand it
        const firstRepo = formData.selectedRepositories[0];
        setCurrentScanningRepo(firstRepo);
        setScanStatuses(prev => ({ ...prev, [firstRepo.id]: "queued" }));
        setExpandedRepos(new Set([firstRepo.id]));
    };

    const handleScanComplete = (result: { finishReason: string | null; usage?: Record<string, unknown>; text?: string; parsedObject?: unknown }) => {
        if (!currentScanningRepo || !formData.selectedRepositories) return;

        // Save patterns and cloned path for current repo
        if (result.parsedObject && typeof result.parsedObject === 'object') {
            const parsedResult = result.parsedObject as any;

            // Save patterns
            if (parsedResult.patterns) {
                setRepoPatterns(prev => ({ ...prev, [currentScanningRepo.id]: parsedResult.patterns }));
            }

            // Save cloned path
            if (parsedResult.clonedPath) {
                setRepoClonedPaths(prev => ({ ...prev, [currentScanningRepo.id]: parsedResult.clonedPath }));
            }

            // Parse and add events
            const events = parsedResult.events || [];
            if (Array.isArray(events)) {
                const resultEvents: TrackingEvent[] = events.map((event: any, index: number) => ({
                    id: `event-${currentScanningRepo.id}-${index}`,
                    name: event.name,
                    description: event.description,
                    properties: event.properties,
                    implementation: event.implementation,
                    isNew: false,
                    sourceRepoId: String(currentScanningRepo.id),
                    sourceRepoUrl: currentScanningRepo.url,
                    sourceRepoName: currentScanningRepo.fullName,
                }));
                setTrackingEvents(prev => [...prev, ...resultEvents]);
            }
        }

        // Mark current repo as success
        setScanStatuses(prev => ({ ...prev, [currentScanningRepo.id]: "success" }));

        // Move to next repository or finish
        const nextIndex = currentScanIndex + 1;
        if (nextIndex < formData.selectedRepositories.length) {
            setCurrentScanIndex(nextIndex);
            const nextRepo = formData.selectedRepositories[nextIndex];
            setCurrentScanningRepo(nextRepo);
            setScanStatuses(prev => ({ ...prev, [nextRepo.id]: "queued" }));
            // Expand the next repository
            setExpandedRepos(prev => new Set([...prev, nextRepo.id]));
        } else {
            // All repos scanned
            setCurrentScanningRepo(null);
            setAllReposScanned(true);
            setIsSubmitting(false);

            const numSuccess = Object.values(scanStatuses).filter(status => status === "success").length + 1; // +1 for current
            const total = formData.selectedRepositories.length;
            toast.success(`Scans finished: ${numSuccess}/${total} succeeded`);

            // Move to next step after a short delay
            setTimeout(() => {
                setCurrentStep(3);
            }, 1500);
        }
    };

    const toggleRepoExpansion = (repoId: string) => {
        setExpandedRepos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(repoId)) {
                newSet.delete(repoId);
            } else {
                newSet.add(repoId);
            }
            return newSet;
        });
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
                        foundPatterns: repoPatterns[repo.id] || [],
                        clonedPath: repoClonedPaths[repo.id] || "",
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
                    <div className="px-8 py-6 space-y-6">
                        <div className="text-sm text-muted-foreground">
                            {!scanStarted
                                ? "We will scan all selected repositories to detect tracking implementations. Click on a repository to view its scan progress."
                                : `Scanning ${currentScanIndex + 1} of ${formData.selectedRepositories?.length || 0} repositories...`
                            }
                        </div>

                        {/* Repository Blocks */}
                        <div className="space-y-4">
                            {(formData.selectedRepositories || []).map((repo, index) => {
                                const isExpanded = expandedRepos.has(repo.id);
                                const isCurrentlyScanning = currentScanningRepo?.id === repo.id;
                                const repoStatus = scanStatuses[repo.id];

                                return (
                                    <div key={repo.id} className={cn(
                                        "border rounded-lg overflow-hidden",
                                        isCurrentlyScanning ? "border-blue-500 bg-blue-50/50" : "",
                                        repoStatus === "success" ? "border-green-500 bg-green-50/50" : "",
                                        repoStatus === "error" ? "border-red-500 bg-red-50/50" : ""
                                    )}>
                                        <Collapsible open={isExpanded} onOpenChange={() => toggleRepoExpansion(repo.id)}>
                                            <CollapsibleTrigger asChild>
                                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                                                    <div className="flex items-center gap-3">
                                                        <ChevronDown className={cn(
                                                            "w-4 h-4 transition-transform",
                                                            isExpanded ? "transform rotate-0" : "transform -rotate-90"
                                                        )} />
                                                        <div>
                                                            <div className="font-medium flex items-center gap-2">
                                                                {repo.fullName || repo.url}
                                                                {isCurrentlyScanning && (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{repo.url}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm">
                                                        {repoStatus === "queued" && isCurrentlyScanning && (
                                                            <span className="text-blue-600 font-medium">Scanning...</span>
                                                        )}
                                                        {repoStatus === "queued" && !isCurrentlyScanning && (
                                                            <span className="text-blue-600">Queued</span>
                                                        )}
                                                        {repoStatus === "success" && <span className="text-green-600 font-medium">✓ Complete</span>}
                                                        {repoStatus === "error" && <span className="text-red-600 font-medium">✗ Error</span>}
                                                        {!repoStatus && <span className="text-muted-foreground">Waiting</span>}
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="border-t bg-muted/20 p-4 overflow-y-auto">
                                                    {isCurrentlyScanning ? (
                                                        <AgentScanSteps
                                                            endpoint="/api/ai/scan/user/stream"
                                                            body={{
                                                                repositoryUrl: repo.url,
                                                                analyticsProviders: formData.analyticsProviders.map(p => p === "Custom" ? formData.customProvider : p),
                                                                userId: user?.id
                                                            }}
                                                            autoStart={true}
                                                            onComplete={handleScanComplete}
                                                            className="max-h-128 overflow-y-auto"
                                                            variant="rows"
                                                        />
                                                    ) : repoStatus === "success" ? (
                                                        <div className="space-y-3">
                                                            <div className="text-sm text-green-600 font-medium">✓ Scan completed successfully</div>
                                                            {repoPatterns[repo.id] && (
                                                                <div className="text-xs">
                                                                    <div className="font-medium text-muted-foreground mb-1">Found Patterns:</div>
                                                                    <div className="bg-green-50 p-2 rounded border">
                                                                        <pre className="text-xs">{JSON.stringify(repoPatterns[repo.id], null, 2)}</pre>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {repoClonedPaths[repo.id] && (
                                                                <div className="text-xs">
                                                                    <div className="font-medium text-muted-foreground mb-1">Cloned to:</div>
                                                                    <div className="bg-green-50 p-2 rounded border font-mono">{repoClonedPaths[repo.id]}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : repoStatus === "error" ? (
                                                        <div className="text-sm text-red-600">
                                                            ✗ Scan failed. Please try again or contact support.
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground">
                                                            Waiting for scan to start...
                                                        </div>
                                                    )}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </div>
                                );
                            })}
                        </div>

                        {allReposScanned && (
                            <div className="text-center py-4">
                                <div className="text-green-600 font-medium">✓ All repositories scanned successfully!</div>
                                <div className="text-sm text-muted-foreground mt-1">Moving to tracking plan review...</div>
                            </div>
                        )}
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
                        onImplementWithCoder={async () => {
                            if (!user) {
                                toast.error("Please log in to implement with AATX Coder", {
                                    action: { label: "Log in", onClick: () => { window.location.href = "/login"; } },
                                });
                                return;
                            }

                            try {
                                const response = await fetch('/api/ai/code/user', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        repositoryId: formData.selectedRepositories[0].id,
                                        repositoryUrl: formData.selectedRepositories[0].url,
                                        events: trackingEvents.filter(e => e.isNew),
                                    }),
                                })

                                const result = await response.json()

                                if (!response.ok) {
                                    if (response.status === 403) {
                                        // Usage limit reached
                                        toast.error(result.message || "Usage limit reached", {
                                            action: {
                                                label: "Upgrade",
                                                onClick: () => { window.location.href = result.upgrade_url || "/pricing"; }
                                            },
                                        });
                                    } else {
                                        toast.error(result.error || "Failed to implement with AATX Coder");
                                    }
                                    return;
                                }

                                console.log(result)
                                toast.success("Code implementation started with AATX Coder!");
                            } catch (error) {
                                console.error('AATX Coder error:', error);
                                toast.error("Failed to connect to AATX Coder");
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


                    captureEvent("repository: added", { repository_id: result.id });
