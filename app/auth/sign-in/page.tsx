"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/lib/validations/auth";
import { signInAction } from "@/actions/auth";
import { z } from "zod";
import InputField from "@/components/form/input-field";
import { Button } from "@/components/ui/button";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function SignInform() {
    const form = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: "",
        }
    })

    const { control, formState: { isSubmitting } } = form

    async function onSubmit(data: z.infer<typeof signInSchema>) {
        try {
            const result = await signInAction(data)

            if (result?.error) {
                if ("_form" in result.error && result.error._form?.[0]) {
                    form.setError("root", { message: result.error._form[0] })
                    return
                }

                for (const [field, messages] of Object.entries(result.error)) {
                    const message = messages?.[0]
                    if (message) {
                        form.setError(field as keyof z.infer<typeof signInSchema>, { message })
                    }
                }
            }
        } catch (error) {
            if (isRedirectError(error)) throw error
            form.setError("root", { message: "Failed to create account." })
        }
    }

    return (
        <main className="container mx-auto grid place-items-center h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader className="flex flex-col items-center">
                    <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                        Sign in to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6 text-xl">
                            <InputField name="email" placeholder="Email" label="Email" control={control} type="email" />
                            <InputField name="password" placeholder="Password" label="Password" control={control} type="password" />
                        </div>
                        {form.formState.errors.root?.message ? (
                            <p className="text-sm text-destructive mt-4">{form.formState.errors.root.message}</p>
                        ) : null}
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <Button type="submit" className="" disabled={isSubmitting}>
                                {isSubmitting ? "Signing in..." : "Sign in"}
                            </Button>
                            <GoogleSignInButton />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/auth/sign-up">Sign Up</Link>

                </CardFooter>
            </Card>
        </main>
    )
}
