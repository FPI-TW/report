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
          "relative mx-4 my-8 h-3/4 max-h-[85dvh] w-full overflow-hidden rounded-sm shadow-2xl sm:h-full",
          "sm:mx-6 sm:my-10 md:m-12 lg:m-16 xl:m-24",
          "grid grid-cols-1 md:grid-cols-2",
          "place-items-center"
        )}
        style={style}
      >
        <Background customerID={customerID} />

        {/* Left visual space on larger screens only */}
        <div className="hidden h-full w-full md:block" aria-hidden="true" />

        {/* Form */}
        <LoginForm customerID={customerID} />
      </section>
    </div>
  )
}

const style = {
  boxShadow: "rgba(0, 0, 0, 0.6) 5px 15px 25px",
} as React.CSSProperties
