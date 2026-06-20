import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { signOut } from "@/lib/auth/actions";

export function DashboardShell({
  title,
  subtitle,
  nav,
  showSignOut = false,
  children
}: {
  title: string;
  subtitle: string;
  nav: string[];
  showSignOut?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-ocean-50 pt-28">
        <section className="px-5 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] bg-ocean-950 p-8 text-white">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-lagoon">Portal</p>
              <h1 className="mt-3 text-4xl font-black md:text-6xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-white/70">{subtitle}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {nav.map((item) => (
                <Link key={item} href="#" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-950 shadow-sm">
                  {item}
                </Link>
              ))}
              {showSignOut ? (
                <form action={signOut}>
                  <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white shadow-sm">
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
