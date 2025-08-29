import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import { posthog } from "posthog-js";

export function AskAATXCoderButton({ trackingPlanId }: { trackingPlanId: string }) {
    return <Button variant="outline" onClick={() => {
        console.log('Ask AATX Coder', trackingPlanId);
        // TODO: move to a new page
        posthog.capture('ask_aatx_coder_button: clicked', { trackingPlanId });
    }}>
        <Code className="mr-2 h-4 w-4" />
        Ask AATX Coder
    </Button>;
}