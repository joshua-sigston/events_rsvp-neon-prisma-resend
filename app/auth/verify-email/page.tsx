"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import InputField from "@/components/form/input-field"
import { resendVerificationSchema } from "@/lib/validations/auth"
import { resendVerificationEmailAction } from "@/actions/auth"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const emailFromQuery = searchParams.get("email") ?? ""
    const [resent, setResent] = useState(false)

    const form = useForm<z.infer<typeof resendVerificationSchema>>({
        resolver: zodResolver(resendVerificationSchema),
        defaultValues: {
            email: emailFromQuery,
        },
    })

    const { control, formState: { isSubmitting } } = form

    async function onResend(data: z.infer<typeof resendVerificationSchema>) {
        setResent(false)

        const result = await resendVerificationEmailAction(data)

        if (result?.error) {
            if ("_form" in result.error && result.error._form?.[0]) {
                form.setError("root", { message: result.error._form[0] })
                return
            }

            for (const [field, messages] of Object.entries(result.error)) {
                const message = messages?.[0]
                if (message) {
                    form.setError(field as keyof z.infer<typeof resendVerificationSchema>, { message })
                }
            }
            return
        }

        setResent(true)
    }

    return (
        <main className="container mx-auto grid place-items-center h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader className="flex flex-col items-center text-center">
                    <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
                        <Mail className="size-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                        {emailFromQuery ? (
                            <>
                                We sent a verification link to{" "}
                                <span className="font-medium text-foreground">{emailFromQuery}</span>.
                            </>
                        ) : (
                            "We sent a verification link to your email address."
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground text-center">
                        Click the link in the email to verify your account. Check your spam folder if you
                        don&apos;t see it within a few minutes.
                    </p>

                    <form onSubmit={form.handleSubmit(onResend)} className="space-y-4">
                        <InputField
                            name="email"
                            placeholder="Email"
                            label="Email"
                            control={control}
                            type="email"
                        />

                        {form.formState.errors.root?.message ? (
                            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                        ) : null}

                        {resent ? (
                            <p className="text-sm text-green-600 text-center">
                                Verification email sent. Please check your inbox.
                            </p>
                        ) : null}

                        <Button type="submit" className="w-full" disabled={isSubmitting} variant="outline">
                            {isSubmitting ? "Sending..." : "Resend verification email"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/auth/sign-in" className="text-sm">
                        Back to sign in
                    </Link>
                </CardFooter>
            </Card>
        </main>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <main className="container mx-auto grid place-items-center h-screen">
                    <Card className="w-full max-w-sm">
                        <CardHeader className="flex flex-col items-center">
                            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                        </CardHeader>
                    </Card>
                </main>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    )
}
