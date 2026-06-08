import { z } from "zod"

export const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email({ error: "Invalid email address" }),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    })

export const signInSchema = z.object({
    email: z.email({ error: "Invalid email address" }),
    password: z.string().min(1, "Password is required"),
})

export const resendVerificationSchema = z.object({
    email: z.email({ error: "Invalid email address" }),
})

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
