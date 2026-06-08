"use server";

import { auth } from "@/lib/auth/server";
import { signUpSchema, signInSchema, resendVerificationSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function signUpAction(data: unknown) {
    const parsed = signUpSchema.safeParse(data);

    if (!parsed.success) {
        return { error: z.flattenError(parsed.error).fieldErrors };
    }

    const { name, email, password } = parsed.data;

    const { error } = await auth.signUp.email({ name, email, password });

    if (error) {
        return { error: { _form: [error.message ?? "Failed to create account"] } };
    }

    redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationEmailAction(data: unknown) {
    const parsed = resendVerificationSchema.safeParse(data);

    if (!parsed.success) {
        return { error: z.flattenError(parsed.error).fieldErrors };
    }

    const { error } = await auth.sendVerificationEmail({
        email: parsed.data.email,
    });

    if (error) {
        return { error: { _form: [error.message ?? "Failed to send verification email"] } };
    }

    return { success: true };
}

export async function signInAction(data: unknown) {
    const parsed = signInSchema.safeParse(data);

    if (!parsed.success) {
        return { error: z.flattenError(parsed.error).fieldErrors };
    }

    const { error } = await auth.signIn.email(parsed.data);

    if (error) {
        return { error: { _form: [error.message ?? "Invalid credentials"] } };
    }

    redirect("/dashboard");
}

export async function signOutAction() {
    await auth.signOut();
    redirect("/")
}