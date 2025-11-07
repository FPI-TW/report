import Image from "next/image"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-5 bg-zinc-50 font-sans dark:bg-black">
      <Image src="/image/logo.webp" alt="logo" width={227} height={51} />
      <h2 className="text-xl font-semibold">廷豐報告機器人</h2>
      <section className="space-y-1 text-center">
        <p>此為客製化功能，請聯繫我們取得客戶專屬連結！</p>
        <p>郵件：Sonic.Huang@fpitw.com</p>
        <p>電話：+886 (02)7728-7068#500</p>
        <p>傳真：+886 (02)2278-7918</p>
      </section>
    </div>
  )
}
