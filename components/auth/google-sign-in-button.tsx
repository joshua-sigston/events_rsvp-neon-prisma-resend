import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"

export function GoogleSignInButton() {
    async function handleGoogleSignIn() {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: `${window.location.origin}/dashboard`,
        })
    }

    return (
        <Button type="button" variant="outline" onClick={handleGoogleSignIn}>
            Continue with Google
        </Button>
    )

}