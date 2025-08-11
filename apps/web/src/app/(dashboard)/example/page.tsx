import AgentScanSteps from "@/components/agent/AgentScanSteps";

export default function Page() {
    return (
        <AgentScanSteps
            endpoint="/api/ai/scan/guest/stream"
            body={{
                repositoryUrl: "https://github.com/ahnopologetic/aatx",
                analyticsProviders: ["posthog"],
            }}
            className="p-4"
        />
    );
}