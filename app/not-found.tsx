import Link from "next/link";

export default function NotFoundPage(): React.ReactElement {
  return (
    <main className="container flex min-h-screen max-w-2xl flex-col justify-center gap-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-normal text-primary">404</p>
      <h1 className="text-4xl font-bold tracking-normal">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for is not available yet.
      </p>
      <Link className="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/">
        Go home
      </Link>
    </main>
  );
}
