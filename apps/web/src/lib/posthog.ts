import { PostHog } from "posthog-node"

// NOTE: This is a Node.js client, so you can use it for sending events from the server side to PostHog.

export function captureEvent(eventName: string, properties?: Record<string, any>) {
  const posthog = PostHogClient();
  if (posthog) {
    posthog.capture(eventName, properties);
  }
}

export default function PostHogClient() {
  const posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  })
  return posthogClient
}
