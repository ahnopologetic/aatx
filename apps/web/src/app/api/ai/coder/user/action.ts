type CoderState = 'idle' | 'running' | 'background' | 'review' | 'creating-pr' | 'success'

type CoderResult = {
    pullRequestUrl: string
    branchName: string
    eventsImplemented: number
}

type CoderStateResponse = {
    state: CoderState
    result?: CoderResult | null
}

export async function getCoderState(trackingPlanId: string): Promise<CoderStateResponse> {
    // TODO: get the coder state from the database
    return {
        state: 'idle',
        result: null
    }
}