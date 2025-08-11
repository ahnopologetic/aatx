"use client";

import { motion } from "framer-motion";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StepProps, fadeInUp, analyticsProviders } from "./types";

type ScanStepProps = Pick<StepProps, 'formData'>

export const ScanStep = ({ formData }: ScanStepProps) => {
  return (
    <>
      <CardHeader>
        <CardTitle>Ready to Start Scan</CardTitle>
        <CardDescription>
          Review your settings and start the analytics tracking scan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 my-4">
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
  );
};