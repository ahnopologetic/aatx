"use client";

import { motion } from "framer-motion";
import { Check, FileSpreadsheet, Code, Save } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StepProps, fadeInUp } from "./types";

interface ActionStepProps extends Pick<StepProps, 'formData' | 'trackingEvents'> {
  onExportToSheets?: () => void;
  onImplementWithCoder?: () => void;
  onSaveToDatabase?: () => void;
}

export const ActionStep = ({
  formData,
  trackingEvents,
  onExportToSheets,
  onImplementWithCoder,
  onSaveToDatabase,
}: ActionStepProps) => {
  const handleExportToSheets = () => {
    onExportToSheets?.();
    toast.success("Exporting to Google Sheets...");
  };

  const handleImplementWithCoder = () => {
    onImplementWithCoder?.();
    toast.success("Starting AATX Coder implementation...");
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
                  <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Export to Google Sheets</h3>
                  <p className="text-sm text-muted-foreground">
                    Export your tracking plan to a Google Sheets document for team collaboration
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleExportToSheets}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Now
              </Button>
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

            {onSaveToDatabase && (
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
            )}
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