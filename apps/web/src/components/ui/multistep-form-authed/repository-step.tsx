"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, GitBranch, Info, Search } from "lucide-react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { fadeInUp } from "@/components/ui/multistep-form/types";
import { captureEvent } from "../../../../lib/posthog";

import { captureEvent } from "../../lib/posthog";


type SelectedRepository = {
    id: string;
    fullName?: string;
    url: string;
    label?: "app" | "web_app" | "desktop_app" | "server" | "custom";
    customLabel?: string;
};

type StepProps = {
    formData: { selectedRepositories?: SelectedRepository[] } & Record<string, any>;
    repoValidationError?: string;
    isValidatingRepo?: boolean;
    onUpdateFormData: (field: string, value: string) => void;
    onUpdateSelectedRepositories?: (repos: SelectedRepository[]) => void;
};

export const AuthedRepositoryStep = ({
    formData,
    repoValidationError,
    isValidatingRepo,
    onUpdateFormData,
    onUpdateSelectedRepositories,
}: StepProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [availableRepos, setAvailableRepos] = useState<SelectedRepository[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);

    const filteredRepos = useMemo(() => {
        if (!searchQuery) return availableRepos;
        const q = searchQuery.toLowerCase();
        return availableRepos.filter((r) => r.fullName?.toLowerCase().includes(q) ?? false);
    }, [availableRepos, searchQuery]);

    const selectedIds = new Set((formData.selectedRepositories ?? []).map(r => r.id));

    const toggleSelect = (repo: SelectedRepository) => {
        const current = formData.selectedRepositories ?? [];
        const exists = current.find(r => r.id === repo.id);
        const next = exists ? current.filter(r => r.id !== repo.id) : [...current, repo];
        onUpdateSelectedRepositories?.(next);
        if (!exists) {
            onUpdateFormData("repositoryUrl", repo.url);
            captureEvent('repository: added', {
                repository_id: repo.id,
            });
        }

        else if (next.length > 0) onUpdateFormData("repositoryUrl", next[0].url);
        else onUpdateFormData("repositoryUrl", "");
    };

    const setLabel = (
        repoId: string,
        label: SelectedRepository["label"],
        customLabel?: string
    ) => {
        const current = formData.selectedRepositories ?? [];
        const next = current.map(r => r.id === repoId ? { ...r, label, customLabel } : r);
        onUpdateSelectedRepositories?.(next);
    };

    const labels: { key: NonNullable<SelectedRepository["label"]>; label: string }[] = [
        { key: "app", label: "App" },
        { key: "web_app", label: "Web app" },
        { key: "desktop_app", label: "Desktop app" },
        { key: "server", label: "Server" },
        { key: "custom", label: "Custom" },
    ];

    useEffect(() => {
        let ignore = false;
        const load = async () => {
            setIsLoadingRepos(true);
            try {
                const response = await fetch("/api/repositories/sources/github");
                if (!response.ok) {
                    throw new Error("Failed to load repositories");
                }
                const data = await response.json();
                if (!ignore) setAvailableRepos(data);
            } finally {
                if (!ignore) setIsLoadingRepos(false);
            }
        };
        load();
        return () => { ignore = true; };
    }, []);

    return (
        <>
            <CardHeader>
                <CardTitle>Select repositories</CardTitle>
                <CardDescription>
                    Install our GitHub App to your organization, then pick one or more repositories to scan.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 my-2">
                <motion.div variants={fadeInUp} className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="text-sm">
                            <div className="font-medium">Grant org access via GitHub App</div>
                            <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
                                <li>Click Install GitHub App and choose your organization.</li>
                                <li>Select &quot;All repositories&quot; or &quot;Only select repositories&quot; you want us to access.</li>
                                <li>Return here and select repositories below. You can change access anytime in GitHub.</li>
                            </ol>
                            <div className="mt-3 flex gap-2">
                                <Button asChild size="sm">
                                    <a href="https://github.com/apps/agenticanalytics" target="_blank" rel="noreferrer">
                                        Install GitHub App <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>I&apos;ve installed it</Button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <Separator />

                <motion.div variants={fadeInUp} className="space-y-3">
                    <Label className="flex items-center gap-2"><Search className="h-4 w-4" /> Search repositories</Label>
                    <Input
                        placeholder="owner/name"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        disabled={isLoadingRepos}
                    />
                </motion.div>

                <motion.div variants={fadeInUp} className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                        {isLoadingRepos ? "Loading repositories..." : `${filteredRepos.length} repositories`}
                    </div>
                    <div className="max-h-72 overflow-auto rounded-md border">
                        {filteredRepos.length === 0 && !isLoadingRepos ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                                <GitBranch className="h-5 w-5 mx-auto mb-2" />
                                No repositories to show. After installing the app, click &quot;I&apos;ve installed it&quot;.
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {filteredRepos?.map((repo) => {
                                    const isSelected = selectedIds.has(repo.id);
                                    return (
                                        <li key={repo.id} className={cn("p-3 flex items-center justify-between gap-3 cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-muted/50")} onClick={() => toggleSelect(repo)}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-6 w-6 rounded-sm", isSelected ? "bg-primary" : "bg-muted")} />
                                                <div>
                                                    <div className="text-sm font-medium">{repo.fullName}</div>
                                                    <div className="text-xs text-muted-foreground">{repo.url}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {labels.map(l => (
                                                    <Badge
                                                        key={l.key}
                                                        variant={repo.label === l.key ? "default" : "outline"}
                                                        className={cn("cursor-pointer", !isSelected && "opacity-50 pointer-events-none")}
                                                        onClick={() => isSelected && setLabel(repo.id, l.key)}
                                                    >
                                                        {l.label}
                                                    </Badge>
                                                ))}
                                                {repo.label === "custom" && isSelected && (
                                                    <Input
                                                        value={repo.customLabel ?? ""}
                                                        onChange={(e) => setLabel(repo.id, "custom", e.target.value)}
                                                        placeholder="Custom label"
                                                        className="h-8 w-36"
                                                    />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </motion.div>

                {repoValidationError && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive">
                        {repoValidationError}
                    </motion.p>
                )}

                <motion.p variants={fadeInUp} className="text-xs text-muted-foreground">
                    We&apos;ll only request read-only code access to detect analytics patterns. You can revoke access anytime in GitHub.
                </motion.p>
            </CardContent>
        </>
    );
};

export default AuthedRepositoryStep;



        if (!exists) {
            posthog.capture('repository: added', {
                repository_id: repo.id,
            });

            posthog.capture('repository: added', {
                repository_id: repo.id,
            });
        }

            posthog.capture('repository: added', {
                repository_id: repo.id,
            });

export default AuthedRepositoryStep;
