import { SignOutBtn } from "@/components/auth/sign-out-btn";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = " force-dynamic";

export default async function DashboardPage() {
    const session = await requireAuth();

    return (
        <main className="container mx-auto">
            <h1>Dashboard</h1>
            <p>Welcome, {session.user.name}</p>
            <SignOutBtn />
        </main>
    );
}
