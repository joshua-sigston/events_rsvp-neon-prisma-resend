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
import { signUpSchema } from "@/lib/validations/auth";
import { signUpAction } from "@/actions/auth";
import { z } from "zod";
import InputField from "@/components/form/input-field";
import { Button } from "@/components/ui/button";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function SignUpform() {
    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        }
    })

    const { control, formState: { isSubmitting } } = form

    async function onSubmit(data: z.infer<typeof signUpSchema>) {
        try {
            const result = await signUpAction(data)

            if (result?.error) {
                if ("_form" in result.error && result.error._form?.[0]) {
                    form.setError("root", { message: result.error._form[0] })
                    return
                }

                for (const [field, messages] of Object.entries(result.error)) {
                    const message = messages?.[0]
                    if (message) {
                        form.setError(field as keyof z.infer<typeof signUpSchema>, { message })
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
                    <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                        Create an Account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            <InputField name="name" placeholder="Name" label="Name" control={control} />
                            <InputField name="email" placeholder="Email" label="Email" control={control} type="email" />
                            <InputField name="password" placeholder="Password" label="Password" control={control} type="password" />
                            <InputField name="confirmPassword" placeholder="Confirm password" label="Confirm password" control={control} type="password" />
                        </div>
                        {form.formState.errors.root?.message ? (
                            <p className="text-sm text-destructive mt-4">{form.formState.errors.root.message}</p>
                        ) : null}
                        <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                            {isSubmitting ? "Creating account..." : "Sign up"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Link href="/auth/sign-in">Sign In</Link>
                    <GoogleSignInButton />
                </CardFooter>
            </Card>
        </main>
    )
}
