"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, FileSpreadsheet, Code, Save, Download, Clipboard } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { StepProps, fadeInUp } from "./types";

interface ActionStepProps extends Pick<StepProps, 'formData' | 'trackingEvents'> {
  onImplementWithCoder?: () => void;
  onSaveToDatabase?: () => void;
}

export const ActionStep = ({
  formData,
  trackingEvents,
  onImplementWithCoder,
  onSaveToDatabase,
}: ActionStepProps) => {
  const [copyFormat, setCopyFormat] = useState<"spreadsheet" | "json" | "yaml">("spreadsheet");

  const eventsCsv = useMemo(() => {
    const header = [
      "Event Name",
      "Description",
      "Type",
      "Properties",
      "Implementation Files",
      "Implementation Lines",
      "Functions",
      "Destinations",
      "Status",
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = trackingEvents.map((event) => {
      const properties = event.properties
        ? Object.entries(event.properties)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n")
        : "";
      const implementationFiles = event.implementation?.map((impl) => impl.path).join("\n") || "";
      const implementationLines = event.implementation?.map((impl) => String(impl.line)).join("\n") || "";
      const functions = event.implementation?.map((impl) => impl.function || "").join("\n") || "";
      const destinations = event.implementation?.map((impl) => impl.destination || "").join("\n") || "";

      return [
        event.name,
        event.description || "",
        event.isNew ? "Manual" : "Detected",
        properties,
        implementationFiles,
        implementationLines,
        functions,
        destinations,
        event.isNew ? "New" : "Existing",
      ].map(escapeCsv);
    });

    const allRows = [header, ...rows];
    return allRows.map((r) => r.join(",")).join("\n");
  }, [trackingEvents]);

  const jsonPayload = useMemo(() => {
    return {
      repositoryUrl: formData.repositoryUrl,
      analyticsProviders: formData.analyticsProviders,
      trackingEvents,
      exportedAt: new Date().toISOString(),
    };
  }, [formData.repositoryUrl, formData.analyticsProviders, trackingEvents]);

  const eventsTsvForPaste = useMemo(() => {
    const header = [
      "Event Name",
      "Description",
      "Type",
      "Properties",
      "Implementation Files",
      "Implementation Lines",
      "Functions",
      "Destinations",
      "Status",
    ];

    const clean = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      return String(value).replace(/\t/g, " ");
    };

    const rows = trackingEvents.map((event) => {
      const properties = event.properties
        ? Object.entries(event.properties)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("; ")
        : "";
      const implementationFiles = event.implementation?.map((impl) => impl.path).join("; ") || "";
      const implementationLines = event.implementation?.map((impl) => String(impl.line)).join("; ") || "";
      const functions = event.implementation?.map((impl) => impl.function || "").filter(Boolean).join("; ") || "";
      const destinations = event.implementation?.map((impl) => impl.destination || "").filter(Boolean).join("; ") || "";

      const cells = [
        event.name,
        event.description || "",
        event.isNew ? "Manual" : "Detected",
        properties,
        implementationFiles,
        implementationLines,
        functions,
        destinations,
        event.isNew ? "New" : "Existing",
      ].map(clean);

      return cells.join("\t");
    });

    return [header.join("\t"), ...rows].join("\n");
  }, [trackingEvents]);

  const jsonToYaml = (value: any, indentLevel = 0): string => {
    const indent = " ".repeat(indentLevel);
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") {
      // Quote strings to be safe
      return JSON.stringify(value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      return value
        .map((item) => `${indent}- ${jsonToYaml(item, indentLevel + 2).replace(/^\s+/, "")}`)
        .join("\n");
    }
    // Object
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => `${indent}${k}: ${typeof v === "object" && v !== null && !Array.isArray(v) ? "\n" + jsonToYaml(v, indentLevel + 2) : jsonToYaml(v, indentLevel + 2)}`)
      .join("\n");
  };

  const handleDownloadCsv = () => {
    try {
      const csv = eventsCsv;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const repoPart = (() => {
        try {
          return new URL(formData.repositoryUrl).pathname.replace(/^\//, "").replace(/\//g, "-");
        } catch {
          return "repository";
        }
      })();
      a.href = url;
      a.download = `analytics-tracking-plan-${repoPart}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (err) {
      toast.error("Failed to download CSV");
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      let text = "";
      if (copyFormat === "spreadsheet") {
        // Use TSV optimized for spreadsheet paste
        text = eventsTsvForPaste;
      } else if (copyFormat === "json") {
        text = JSON.stringify(jsonPayload, null, 2);
      } else {
        // yaml
        const yaml = `repositoryUrl: ${jsonToYaml(jsonPayload.repositoryUrl)}\nanalyticsProviders:\n${jsonPayload.analyticsProviders
          .map((p) => `  - ${jsonToYaml(p)}`)
          .join("\n")}\ntrackingEvents:\n${jsonToYaml(jsonPayload.trackingEvents, 2)}\nexportedAt: ${jsonToYaml(jsonPayload.exportedAt)}`;
        text = yaml;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleImplementWithCoder = () => {
    onImplementWithCoder?.();
  };

  const handleSaveToDatabase = async () => {
    if (!onSaveToDatabase) return;
    await onSaveToDatabase();
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Choose Your Next Action</CardTitle>
        <CardDescription>
          Export your tracking plan or implement new analytics tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 my-4">
        <motion.div variants={fadeInUp} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg border-2 p-6 cursor-pointer hover:border-green-300 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-green-50 dark:from-background dark:to-green-950/20"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                  <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Download CSV</h3>
                  <p className="text-sm text-muted-foreground">
                    Download your tracking events as a CSV file (spreadsheet-ready)
                  </p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={handleDownloadCsv}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg border-2 p-6 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-blue-50 dark:from-background dark:to-blue-950/20"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <Clipboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Copy to Clipboard</h3>
                  <p className="text-sm text-muted-foreground">Copy your plan as Spreadsheet, JSON, or YAML</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={copyFormat} onValueChange={(v) => setCopyFormat(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spreadsheet">Spreadsheet (Paste)</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="yaml">YAML</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" onClick={handleCopyToClipboard}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg border-2 p-6 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-blue-50 dark:from-background dark:to-blue-950/20"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Implement with AATX Coder</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically implement analytics tracking code in your repository
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                onClick={handleImplementWithCoder}
              >
                <Code className="h-4 w-4 mr-2" />
                Start Implementation
              </Button>
            </motion.div>

            {
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg border-2 p-6 cursor-pointer hover:border-amber-300 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-amber-50 dark:from-background dark:to-amber-950/20"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                    <Save className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Save to Database</h3>
                    <p className="text-sm text-muted-foreground">
                      Persist detected and manually added events to your repository
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={handleSaveToDatabase}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Repository & Events
                </Button>
              </motion.div>
            }
          </div>

          <div className="rounded-xl border p-6 bg-gradient-to-br from-muted/50 to-muted/20">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Project Summary
            </h4>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-muted/50">
                <span className="text-muted-foreground">Repository:</span>
                <span className="font-medium text-primary truncate max-w-xs">{formData.repositoryUrl}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-muted/50">
                <span className="text-muted-foreground">Analytics Providers:</span>
                <span className="font-medium">{formData.analyticsProviders.length} selected</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-muted/50">
                <span className="text-muted-foreground">Total Events:</span>
                <span className="font-bold text-lg">{trackingEvents.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {trackingEvents.filter(e => e.isNew).length}
                  </div>
                  <div className="text-xs text-muted-foreground">New Events</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {trackingEvents.filter(e => !e.isNew).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Detected Events</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </>
  );
};