import LoginForm from "./components/login-form"
import { cn } from "@/lib/utils"
import Background from "./components/background"

type Props = {
  params: Promise<{ customerID: string }>
}

export default async function Page({ params }: Props) {
  const { customerID } = await params

  return (
    <div className="flex h-dvh w-dvw items-center justify-center overflow-hidden">
      <section
        className={cn(
          "relative m-24 size-full max-h-3/4 overflow-hidden rounded-sm shadow-2xl",
          "flex items-center justify-center"
        )}
        style={style}
      >
        <Background customerID={customerID} />

        {/* Content */}
        <div className="w-1/2"></div>
        <LoginForm customerID={customerID} />
      </section>
    </div>
  )
}

const style = {
  boxShadow: "rgba(0, 0, 0, 0.6) 5px 15px 25px",
} as React.CSSProperties
