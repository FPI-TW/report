import ChatWidget from "@/app/[locale]/[customerID]/platform/components/chat-widget"

export default function Page() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="max-w-xl text-center">
        <h1 className="mb-2 text-2xl font-semibold">DeepSeek Chat Demo</h1>
        <p className="text-muted-foreground text-sm">
          Use the floating chat button in the bottom-right corner to send a
          message. The assistant will reply using the DeepSeek chat API.
        </p>
      </div>
      <ChatWidget />
    </main>
  )
}
