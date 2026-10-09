import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Lock, Mail, User as UserIcon, Loader2 } from "lucide-react"

// Clean SVG for Google authentication
export const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
  isSignUp?: boolean
  selectedRole?: string
  loading?: boolean
  googleLoading?: boolean
  onRoleChange?: (role: string) => void
  onToggleMode?: () => void
  onEmailSubmit?: (data: { email: string; password?: string; name?: string; role?: string }) => void
  onGoogleSignIn?: () => void
  onForgotPassword?: () => void
}

const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(
  ({ 
    className, 
    isSignUp = false,
    selectedRole = 'clinician',
    loading = false,
    googleLoading = false,
    onRoleChange,
    onToggleMode,
    onEmailSubmit, 
    onGoogleSignIn, 
    onForgotPassword,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [emailVal, setEmailVal] = React.useState('')
    const [nameVal, setNameVal] = React.useState('')
    const [passwordVal, setPasswordVal] = React.useState('')

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      onEmailSubmit?.({ email: emailVal, password: passwordVal, name: nameVal, role: selectedRole })
    }

    return (
      <Card ref={ref} className={cn("w-full border-none shadow-none bg-transparent p-0", className)} {...props}>
        <CardContent className="px-0 py-0 space-y-4">
          {/* Supabase Google OAuth Button */}
          <button 
            type="button" 
            disabled={loading || googleLoading}
            onClick={() => onGoogleSignIn?.()} 
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-stone)',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-forest)',
              cursor: (loading || googleLoading) ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-clay)'
              e.currentTarget.style.borderColor = 'var(--accent-sage)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF'
              e.currentTarget.style.borderColor = 'var(--border-stone)'
            }}
          >
            {googleLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[var(--accent-sage-dark)]" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border-stone)]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-[var(--surface-white)] px-3 text-[var(--text-dim)] font-medium">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {isSignUp && (
              <div className="space-y-1">
                <Label htmlFor="auth-name" className="text-xs font-semibold text-[var(--text-forest)]">
                  Full Name
                </Label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-dim)', 
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      zIndex: 10,
                    }}
                  >
                    <UserIcon size={16} />
                  </div>
                  <input 
                    id="auth-name" 
                    name="name" 
                    type="text" 
                    value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kulkarni" 
                    required 
                    style={{
                      width: '100%',
                      height: '40px',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--surface-clay)',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.86rem',
                      color: 'var(--text-forest)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="auth-email" className="text-xs font-semibold text-[var(--text-forest)]">
                Email Address
              </Label>
              <div style={{ position: 'relative', width: '100%' }}>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-dim)', 
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 10,
                  }}
                >
                  <Mail size={16} />
                </div>
                <input 
                  id="auth-email" 
                  name="email" 
                  type="email" 
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  placeholder="doctor@diabeto.care" 
                  required 
                  style={{
                    width: '100%',
                    height: '40px',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--surface-clay)',
                    border: '1px solid var(--border-stone)',
                    fontSize: '0.86rem',
                    color: 'var(--text-forest)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password" className="text-xs font-semibold text-[var(--text-forest)]">
                  Password
                </Label>
                {!isSignUp && onForgotPassword && (
                  <button 
                    type="button" 
                    onClick={onForgotPassword}
                    className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-forest)] hover:underline bg-transparent border-none cursor-pointer p-0"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-dim)', 
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 10,
                  }}
                >
                  <Lock size={16} />
                </div>
                <input 
                  id="auth-password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  value={passwordVal}
                  onChange={(e) => setPasswordVal(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  style={{
                    width: '100%',
                    height: '40px',
                    paddingLeft: '40px',
                    paddingRight: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--surface-clay)',
                    border: '1px solid var(--border-stone)',
                    fontSize: '0.86rem',
                    color: 'var(--text-forest)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button 
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-dim)',
                    zIndex: 10,
                    padding: '4px',
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {onRoleChange && (
              <div className="space-y-1">
                <Label htmlFor="auth-role" className="text-xs font-semibold text-[var(--text-forest)]">
                  Healthcare Portal Role
                </Label>
                <select
                  id="auth-role"
                  value={selectedRole}
                  onChange={(e) => onRoleChange(e.target.value)}
                  style={{
                    display: 'flex',
                    height: '40px',
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid var(--border-stone)',
                    backgroundColor: 'var(--surface-clay)',
                    padding: '0 10px',
                    fontSize: '0.84rem',
                    color: 'var(--text-forest)',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
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
              className="w-full h-10 mt-3 rounded-xl bg-[var(--text-forest)] hover:opacity-95 text-white font-bold text-sm shadow-sm cursor-pointer transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </span>
              ) : isSignUp ? (
                "Create Account & Sign In"
              ) : (
                "Sign In to Portal"
              )}
            </Button>
          </form>

          {onToggleMode && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onToggleMode}
                className="text-xs font-semibold text-[var(--text-forest)] underline hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
AuthForm.displayName = "AuthForm"

export { AuthForm }
