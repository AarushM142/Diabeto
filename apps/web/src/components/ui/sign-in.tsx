import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Lock, Mail, User as UserIcon, Sparkles, ShieldCheck } from "lucide-react"

// Clean SVG for Google authentication
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
)

export interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  isSignUp?: boolean
  selectedRole?: string
  loading?: boolean
  onRoleChange?: (role: string) => void
  onToggleMode?: () => void
  onEmailSubmit?: (data: { email: string; password?: string; name?: string; role?: string }) => void
  onGoogleSignIn?: () => void
  onEmailLink?: () => void
}

const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(
  ({ 
    className, 
    title,
    description,
    isSignUp = false,
    selectedRole = 'clinician',
    loading = false,
    onRoleChange,
    onToggleMode,
    onEmailSubmit, 
    onGoogleSignIn, 
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
      <Card ref={ref} className={cn("w-full max-w-md mx-auto border-none shadow-none bg-transparent", className)} {...props}>
        <CardHeader className="text-left px-0 pt-0 pb-4">
          <CardTitle className="text-xl font-bold font-serif text-[var(--text-forest)]">
            {title || (isSignUp ? "Create your Diabeto Account" : "Sign in to Diabeto")}
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-muted)]">
            {description || (isSignUp 
              ? "Register for personalized glycemic monitoring and family care coordination." 
              : "Access verified clinical dashboards, care protocols, and patient insights.")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-0 py-0">
          <div className="space-y-4">
            {/* Google Authentication */}
            <Button 
              variant="outline" 
              type="button" 
              disabled={loading}
              onClick={() => onGoogleSignIn?.()} 
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl bg-white hover:bg-neutral-50 border-[var(--border-stone)] text-sm font-semibold text-[var(--text-forest)] shadow-xs transition-all"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </Button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border-stone)]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[var(--surface-white)] px-3 text-[var(--text-dim)]">or continue with email</span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name" className="text-xs font-semibold text-[var(--text-forest)]">
                    Full Name
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
                    <Input 
                      id="auth-name" 
                      name="name" 
                      type="text" 
                      placeholder="Dr. Rajesh Kulkarni" 
                      className="pl-9 h-10 rounded-xl bg-[var(--surface-clay)] border-[var(--border-stone)] text-sm focus-visible:ring-1 focus-visible:ring-[var(--accent-sage)]" 
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-semibold text-[var(--text-forest)]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
                  <Input 
                    id="auth-email" 
                    name="email" 
                    type="email" 
                    placeholder="doctor@diabeto.care" 
                    className="pl-9 h-10 rounded-xl bg-[var(--surface-clay)] border-[var(--border-stone)] text-sm focus-visible:ring-1 focus-visible:ring-[var(--accent-sage)]" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-xs font-semibold text-[var(--text-forest)]">
                    Password
                  </Label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      onClick={() => onEmailLink?.()}
                      className="text-xs font-medium text-[var(--text-forest)] hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
                  <Input 
                    id="auth-password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-9 pr-10 h-10 rounded-xl bg-[var(--surface-clay)] border-[var(--border-stone)] text-sm focus-visible:ring-1 focus-visible:ring-[var(--accent-sage)]" 
                    required 
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-forest)] bg-transparent border-none cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {onRoleChange && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-role" className="text-xs font-semibold text-[var(--text-forest)]">
                    Target Portal / Role
                  </Label>
                  <select
                    id="auth-role"
                    value={selectedRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[var(--border-stone)] bg-[var(--surface-clay)] px-3 py-2 text-sm text-[var(--text-forest)] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-sage)]"
                  >
                    <option value="clinician">🩺 Clinician (Doctor / Endocrinologist)</option>
                    <option value="coach">🌿 Health Coach (Sister Kavita)</option>
                    <option value="caregiver">👧 Family Caregiver (Daughter / Son)</option>
                    <option value="patient">👴 Senior Patient (Sanctuary)</option>
                    <option value="admin">🏢 Clinic Administrator Desk</option>
                  </select>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 mt-1 rounded-xl bg-[var(--text-forest)] hover:opacity-95 text-white font-bold text-sm shadow-sm cursor-pointer transition-all"
              >
                {loading ? "Authenticating..." : isSignUp ? "Create Account & Sign In" : "Sign In to Portal"}
              </Button>
            </form>

            {onToggleMode && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-xs font-semibold text-[var(--text-forest)] underline hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign up for free"}
                </button>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col items-center space-y-3 px-0 pt-4 pb-0">
          <Button 
            variant="ghost" 
            type="button" 
            className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-forest)] hover:bg-[var(--surface-clay)] rounded-lg h-9" 
            onClick={() => onEmailLink?.()}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[var(--accent-sage-dark)]" />
            <span>Send me a magic passwordless login link</span>
          </Button>
          
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
            <ShieldCheck size={12} className="text-[var(--status-ok)]" />
            <span>ABDM & HIPAA Consent Compliant • Pune Central</span>
          </div>
        </CardFooter>
      </Card>
    )
  }
)
AuthForm.displayName = "AuthForm"

export { AuthForm }
