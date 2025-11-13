import { Toaster } from "@/components/ui/sonner"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <Toaster richColors closeButton />
      <section
        className="relative mx-auto flex h-screen max-w-7xl flex-col px-6 py-6"
        style={{
          background:
            "radial-gradient(1000px circle at 15% 0%, rgba(221, 174, 88, 0.12), transparent 70%), radial-gradient(900px circle at 85% 30%, rgba(221, 174, 88, 0.06), transparent 75%)",
        }}
      >
        {children}
      </section>
    </div>
  )
}
