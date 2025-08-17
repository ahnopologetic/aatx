"use client";

import { motion } from "framer-motion";
import { Loader2, LogIn } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepProps, fadeInUp } from "./types";
import { Button } from "../button";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

type RepositoryStepProps = Pick<StepProps, 'formData' | 'repoValidationError' | 'isValidatingRepo' | 'onUpdateFormData'>

export const RepositoryStep = ({
  formData,
  repoValidationError,
  isValidatingRepo,
  onUpdateFormData,
}: RepositoryStepProps) => {
  const router = useRouter()
  return (
    <>
      <CardHeader>
        <CardTitle>Repository URL</CardTitle>
        <CardDescription>Enter the repository URL you want to scan for analytics tracking</CardDescription>
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
            <div className="flex flex-col gap-2 mb-2">
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive"
              >
                {repoValidationError}
              </motion.p>
              <motion.div variants={fadeInUp} className="text-xs text-muted-foreground">
                <Button variant="link" className="cursor-pointer py-2 px-4 border-1 transition-all duration-300 hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 hover:text-white" onClick={() => {
                  onUpdateFormData("repositoryUrl", "")
                  router.push("/login")
                  posthog.capture("repository_step_log_in_to_scan_private_repos: clicked")
                }}>
                  <GitHubLogoIcon className="h-4 w-4 mr-2" />
                  Log in to scan private repos
                </Button>
              </motion.div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Supported platforms: GitHub, GitLab, Bitbucket
          </p>
        </motion.div>
      </CardContent>
    </>
  );
};