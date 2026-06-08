import Link from "next/link";


export default function Home() {
  return (
    <main className="container grid place-items-center mx-auto h-screen">Home
      <div className="container mx-auto grid place-items-center ">
        <Link href="/auth/sign-up">Sign Up</Link>
      </div>
    </main>
  );
}
