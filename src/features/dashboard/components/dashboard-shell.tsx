export function DashboardShell() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl space-y-3">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Tsukiroku
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          You are signed in. Dashboard data and navigation can be added here as
          the finance features take shape.
        </p>
      </section>
    </main>
  )
}
