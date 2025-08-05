"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepProps, fadeInUp } from "./types";

type RepositoryStepProps = Pick<StepProps, 'formData' | 'repoValidationError' | 'isValidatingRepo' | 'onUpdateFormData'>

export const RepositoryStep = ({
  formData,
  repoValidationError,
  isValidatingRepo,
  onUpdateFormData,
}: RepositoryStepProps) => {
  return (
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
          <div className="relative">
            <Input
              id="repositoryUrl"
              placeholder="https://github.com/username/repository"
              value={formData.repositoryUrl}
              onChange={(e) => onUpdateFormData("repositoryUrl", e.target.value)}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              disabled={isValidatingRepo}
            />
            {isValidatingRepo && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
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
  );
};