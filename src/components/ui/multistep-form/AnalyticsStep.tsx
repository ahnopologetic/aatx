"use client";

import { motion } from "framer-motion";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { StepProps, fadeInUp, analyticsProviders } from "./types";

type AnalyticsStepProps = Pick<StepProps, 'formData' | 'onUpdateFormData'> & {
  onToggleProvider: (providerName: string) => void;
}

export const AnalyticsStep = ({
  formData,
  onUpdateFormData,
  onToggleProvider,
}: AnalyticsStepProps) => {
  return (
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
                onClick={() => onToggleProvider(provider.name)}
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
                  onCheckedChange={() => onToggleProvider(provider.name)}
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
              onChange={(e) => onUpdateFormData("customProvider", e.target.value)}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </motion.div>
        )}
      </CardContent>
    </>
  );
};