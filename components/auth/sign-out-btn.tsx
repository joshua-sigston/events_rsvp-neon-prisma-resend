import { authClient } from "@/lib/auth/client";
import { Button } from "../ui/button";
import { redirect } from "next/navigation";


export function SignOutBtn() {
    async function handleSignOut() {
        await authClient.signOut();
        redirect("/auth/sign-in");
    }

    return (
        <Button type="button" variant="outline" onClick={handleSignOut}>
            Sign Out
        </Button>
    )
}