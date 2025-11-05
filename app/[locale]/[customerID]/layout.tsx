export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="relative bg-neutral-200">{children}</div>
}
