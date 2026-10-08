import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, KeyRound, Mail, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"

// Simple SVG components for brand icons as placeholders
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <img 
    src="https://cdn.21st.dev/assets/mirror/a6/a60266dab17c1c00981c7077fa025aa84c92782e0657ca2f78b7f70cbb8d5a56.svg" 
    alt="Google" 
    {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} 
  />
)

const MicrosoftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <img 
    src="https://cdn.21st.dev/assets/mirror/72/726aa11548b3771591ccbd747f744fbc8acc6879594c14edc740f2c0a00f016b.svg" 
    alt="Microsoft" 
    {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} 
  />
)

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => {
  let isDark = false
  try {
    const themeContext = useTheme()
    isDark = themeContext?.theme === 'dark'
  } catch {
    isDark = false
  }

  return (
    <img 
      src={`https://svgl.app/library/apple${isDark ? '_dark' : ''}.svg`} 
      alt="Apple" 
      {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} 
    />
  )
}

export interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  isSignUp?: boolean
  selectedRole?: string
  onRoleChange?: (role: string) => void
  onToggleMode?: () => void
  onEmailSubmit?: (data: { email: string; password?: string; name?: string; role?: string }) => void
  onSocialSignIn?: (provider: 'google' | 'microsoft' | 'apple' | 'sso') => void
  onEmailLink?: () => void
}

const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(
  ({ 
    className, 
    title,
    description,
    isSignUp = false,
    selectedRole = 'clinician',
    onRoleChange,
    onToggleMode,
    onEmailSubmit, 
    onSocialSignIn, 
    onEmailLink, 
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      const name = (formData.get("name") as string) || ''
      onEmailSubmit?.({ email, password, name, role: selectedRole })
    }

    return (
      <Card ref={ref} className={cn("w-full max-w-md mx-auto", className)} {...props}>
        <CardHeader className="text-left">
          <CardTitle className="text-2xl">
            {title || (isSignUp ? "Create your account" : "Sign in with email")}
          </CardTitle>
          <CardDescription>
            {description || (isSignUp 
              ? "Join the Diabeto senior diabetes care network today." 
              : "Access verified clinical dashboards, care protocols, and patient insights.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Social Sign-in */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sign in with</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" type="button" onClick={() => onSocialSignIn?.('google')} title="Google">
                  <GoogleIcon className="size-4 fill-primary" />
                </Button>
                <Button variant="outline" type="button" onClick={() => onSocialSignIn?.('microsoft')} title="Microsoft">
                  <MicrosoftIcon className="size-4 fill-primary" />
                </Button>
                <Button variant="outline" type="button" onClick={() => onSocialSignIn?.('apple')} title="Apple">
                  <AppleIcon className="size-5" />
                </Button>
                <Button variant="outline" type="button" onClick={() => onSocialSignIn?.('sso')} title="Single Sign-On">
                  <KeyRound className="h-5 w-5" />
                  <span className="ml-1.5 text-xs font-semibold">SSO</span>
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" type="text" placeholder="Dr. Rajesh Kulkarni" required />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="jdoe.mobbin@gmail.com" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} className="pl-9 pr-10" required />
                  <Button 
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {onRoleChange && (
                <div className="space-y-2">
                  <Label htmlFor="role">Account Role</Label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="clinician">🩺 Clinician (Doctor / Endocrinologist)</option>
                    <option value="coach">🌿 Health Coach / Care Coordinator</option>
                    <option value="caregiver">👧 Family Caregiver</option>
                    <option value="patient">👴 Senior Patient (Sanctuary)</option>
                    <option value="admin">🏢 Clinic Administrator</option>
                  </select>
                </div>
              )}

              <Button type="submit" className="w-full">
                {isSignUp ? "Create Account & Sign In" : "Sign In"}
              </Button>
            </form>

            {onToggleMode && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-xs text-primary underline hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign up for free"}
                </button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-4">
          <Button variant="ghost" type="button" className="w-full text-muted-foreground" onClick={() => onEmailLink?.()}>
            <Sparkles className="mr-2 h-4 w-4" />
            Or email me a link
          </Button>
          <p className="text-xs text-muted-foreground text-center w-full">
            By logging in, you agree to our{' '}
            <a href="#" className="underline hover:text-primary">
              Terms of Service
            </a>{' '}
            &{' '}
            <a href="#" className="underline hover:text-primary">
              Privacy Policy
            </a>
          </p>
        </CardFooter>
      </Card>
    )
  }
)
AuthForm.displayName = "AuthForm"

export { AuthForm }
