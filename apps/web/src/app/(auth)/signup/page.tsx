import { Suspense } from 'react'
import { SignupForm } from '@/components/signup-form'

export default function SignupPage() {
    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center mx-auto">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">Join AATX Analytics</h1>
                    <p className="text-sm text-muted-foreground">
                        Create your account to get started
                    </p>
                </div>
                <Suspense fallback={<div>Loading...</div>}>
                    <SignupForm />
                </Suspense>
            </div>
        </div>
    )
}
