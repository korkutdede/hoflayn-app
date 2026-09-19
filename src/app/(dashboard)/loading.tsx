export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="h-40 animate-pulse rounded-xl bg-zinc-100" />
      <div className="h-32 animate-pulse rounded-xl bg-zinc-100" />
    </div>
  );
}
