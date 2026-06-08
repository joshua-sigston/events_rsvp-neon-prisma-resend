import { auth } from "@/lib/auth/server";

export const proxy = auth.middleware({
    loginUrl: "/auth/sign-in",
});

export const config = {
    matcher: [
        "/dashboard",
        "/dashboard/:path*",
        "/events",
        "/events/:path*",
    ],
};