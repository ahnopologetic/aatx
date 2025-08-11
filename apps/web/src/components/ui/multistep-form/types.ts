// Note: avoid importing server-side types into client bundles to prevent circular deps
export type ScanResult = Record<string, unknown>;

export interface FormData {
  repositoryUrl: string;
  analyticsProviders: string[];
  customProvider: string;
}

export interface TrackingEvent {
  id: string;
  name: string;
  description?: string;
  properties?: {
    [key: string]: string | number | boolean | null | undefined | object | unknown;
  };
  implementation?: {
    path: string;
    line: number;
    function?: string;
    destination?: string;
  }[];
  isNew?: boolean;
  // Optional repository association (used in authed multi-repo flow)
  sourceRepoId?: string;
  sourceRepoUrl?: string;
  sourceRepoName?: string;
}

export interface StepProps {
  formData: FormData;
  trackingEvents: TrackingEvent[];
  isSubmitting?: boolean;
  isValidatingRepo?: boolean;
  repoValidationError?: string;
  onUpdateFormData: (field: keyof FormData, value: string) => void;
  onNext?: () => void;
  onBack?: () => void;
  onStartScan?: () => void;
  onAddEvent?: (event: TrackingEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const analyticsProviders = [
  { name: "Google Analytics", color: "bg-orange-500", initials: "GA" },
  { name: "Google Tag Manager", color: "bg-blue-600", initials: "GTM" },
  { name: "Segment", color: "bg-green-500", initials: "S" },
  { name: "Mixpanel", color: "bg-purple-600", initials: "MP" },
  { name: "Amplitude", color: "bg-blue-500", initials: "A" },
  { name: "Rudderstack", color: "bg-red-500", initials: "RS" },
  { name: "mParticle", color: "bg-pink-500", initials: "mP" },
  { name: "PostHog", color: "bg-yellow-500", initials: "PH" },
  { name: "Pendo", color: "bg-indigo-500", initials: "P" },
  { name: "Heap", color: "bg-teal-500", initials: "H" },
  { name: "Datadog RUM", color: "bg-violet-500", initials: "DD" },
  { name: "Snowplow (Structured Events)", color: "bg-cyan-500", initials: "SP" },
  { name: "Custom", color: "bg-gray-500", initials: "?" }
];

export const steps = [
  { id: "repository", title: "Repository URL" },
  { id: "analytics", title: "Analytics Provider" },
  { id: "scan", title: "Start Scan" },
  { id: "tracking-plan", title: "Tracking Plan" },
  { id: "action", title: "Action" },
];

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const contentVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
};