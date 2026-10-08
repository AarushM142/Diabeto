import { AuthForm } from "@/components/ui/sign-in"

// A simple SVG for the puzzle graphic to demonstrate layout
export const PuzzleGraphic = () => (
    <svg width="250" height="150" viewBox="0 0 250 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(50, 20) rotate(15 75 75)">
            <path d="M75 0 C50 0, 50 25, 25 25 S0 50, 0 75 S25 125, 50 125 S75 100, 75 100 L100 100 C100 100, 125 75, 125 75 S150 50, 150 50 S125 25, 100 25 L75 25 L75 0Z" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
        </g>
        <g transform="translate(70, 40) rotate(-10 75 75)">
            <path d="M75 150 C100 150, 100 125, 125 125 S150 100, 150 75 S125 25, 100 25 S75 50, 75 50 L50 50 C50 50, 25 75, 25 75 S0 100, 0 100 S25 125, 50 125 L75 125 L75 150Z" fill="#F97316" stroke="#1E293B" strokeWidth="2"/>
        </g>
    </svg>
)

export default function AuthFormDemo() {
  const handleSocialSignIn = (provider: string) => {
    console.log(`Signing in with ${provider}...`)
  }

  const handleEmailSubmit = (data: { email: string; password?: string }) => {
    console.log("Form submitted:", data)
  }
  
  const handleEmailLink = () => {
    console.log("Requesting email link...")
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#FBF8F3] dark:bg-muted/20">
        <AuthForm 
          onSocialSignIn={handleSocialSignIn}
          onEmailSubmit={handleEmailSubmit}
          onEmailLink={handleEmailLink}
          className="shadow-xl"
        />
    </div>
  )
}
