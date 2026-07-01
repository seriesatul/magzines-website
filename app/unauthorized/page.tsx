import Link from "next/link";

export default function UnauthorizedPage(): React.ReactElement {
  return (
    <main className="container flex min-h-screen max-w-xl flex-col justify-center gap-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-normal text-primary">Access denied</p>
      <h1 className="text-4xl font-bold tracking-normal">Admin permission required</h1>
      <p className="text-muted-foreground">
        Your account is signed in, but it does not have permission to open the admin panel.
      </p>
      <Link className="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/">
        Go home
      </Link>
    </main>
  );
}
