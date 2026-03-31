import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Info, Mail, Phone, AtSign } from 'lucide-react'
import { normalizeInviteCode, validateInviteCode } from '@/lib/invite-code'

const isDev = import.meta.env.DEV

type AuthStep = 'form' | 'verify'
type RegisterType = 'phone' | 'email'

export default function LoginPage() {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState<AuthStep>('form')
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [resolvedEmail, setResolvedEmail] = useState('')

  // Register fields
  const [registerType, setRegisterType] = useState<RegisterType>('phone')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regInviteCode, setRegInviteCode] = useState('')

  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()

  const from = (location.state as any)?.from || '/'

  useEffect(() => {
    if (user) {
      if (profile && !profile.onboarding_completed) {
        navigate('/onboarding', { replace: true })
      } else if (profile) {
        navigate(from, { replace: true })
      }
    }
  }, [user, profile, navigate, from])

  const handleBack = () => {
    if (step === 'verify') {
      setStep('form')
      setOtp('')
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const isPhone = (v: string) => /^1[3-9]\d{9}$/.test(v)

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ---- LOGIN ----
  const handleLogin = async () => {
    if (!loginIdentifier || loginPassword.length < 6) {
      toast({ title: '请输入手机号/用户名/邮箱和密码（至少6位）', variant: 'destructive' })
      return
    }
    if (!agreed) {
      toast({ title: '请先同意用户协议和隐私政策', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      let email = loginIdentifier
      let userId: string | undefined

      // Determine input type: phone, email, or nickname
      if (isPhone(loginIdentifier)) {
        // Lookup by phone number
        const { data, error } = await supabase.functions.invoke('lookup-email', {
          body: { phone: loginIdentifier },
        })
        if (error || data?.error) {
          toast({ title: '用户不存在', description: data?.error || error?.message, variant: 'destructive' })
          setLoading(false)
          return
        }
        email = data.email
        userId = data.user_id
      } else if (!isEmail(loginIdentifier)) {
        // Lookup by nickname
        const { data, error } = await supabase.functions.invoke('lookup-email', {
          body: { nickname: loginIdentifier },
        })
        if (error || data?.error) {
          toast({ title: '用户不存在', description: data?.error || error?.message, variant: 'destructive' })
          setLoading(false)
          return
        }
        email = data.email
        userId = data.user_id
      }

      setResolvedEmail(email)

      // Try password login first
      const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword })

      if (error) {
        // If email not confirmed, check per-user setting
        if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          // Get user_id if we don't have it yet (email-based login)
          if (!userId) {
            const { data: lookupData } = await supabase.functions.invoke('lookup-email', { body: { email } })
            userId = lookupData?.user_id
          }

          if (userId) {
            // Check per-user verification setting
            const { data: profile } = await supabase
              .from('profiles')
              .select('require_email_verification')
              .eq('id', userId)
              .single()

            if (profile?.require_email_verification === false) {
              // Auto-confirm and retry login
              const { error: confirmError } = await supabase.functions.invoke('auto-confirm-user', {
                body: { user_id: userId },
              })
              if (!confirmError) {
                const { error: retryError } = await supabase.auth.signInWithPassword({ email, password: loginPassword })
                if (retryError) {
                  toast({ title: '登录失败', description: retryError.message, variant: 'destructive' })
                } else {
                  toast({ title: '登录成功' })
                }
                setLoading(false)
                return
              }
            }
          }

          // Default: send OTP for verification
          const { error: otpError } = await supabase.auth.resend({ type: 'signup', email })
          if (otpError) {
            toast({ title: '发送验证码失败', description: otpError.message, variant: 'destructive' })
          } else {
            toast({ title: '请验证邮箱', description: '验证码已发送到您的邮箱' })
            setStep('verify')
            startCountdown()
          }
        } else {
          toast({ title: '登录失败', description: error.message, variant: 'destructive' })
        }
      } else {
        toast({ title: '登录成功' })
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // ---- REGISTER ----
  const handleRegister = async () => {
    if (!isEmail(regEmail) || regPassword.length < 6) {
      toast({ title: '请输入有效邮箱和密码（至少6位）', variant: 'destructive' })
      return
    }
    if (registerType === 'phone' && !isPhone(regPhone)) {
      toast({ title: '请输入有效的手机号', variant: 'destructive' })
      return
    }
    if (!agreed) {
      toast({ title: '请先同意用户协议和隐私政策', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      // Check if phone is already registered (when registering with phone)
      if (registerType === 'phone') {
        const { data: phoneCheck, error: phoneError } = await supabase.functions.invoke('validate-registration', {
          body: { phone: regPhone, action: 'check_phone' },
        })
        if (phoneError || (phoneCheck && !phoneCheck.available)) {
          toast({
            title: '注册受限',
            description: phoneCheck?.message || phoneError?.message || '该手机号已被注册',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      }

      // Validate email and IP before registration
      const { data: validation, error: valError } = await supabase.functions.invoke('validate-registration', {
        body: { email: regEmail, action: 'check_registration' },
      })
      if (valError || !validation?.allowed) {
        toast({ title: '注册受限', description: validation?.message || valError?.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      // Send OTP via Resend
      const { data: sendData, error: sendError } = await supabase.functions.invoke('send-email-otp', {
        body: { email: regEmail, type: 'register' },
      })
      if (sendError || sendData?.error) {
        toast({ title: '验证码发送失败', description: sendData?.error || sendError?.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      setResolvedEmail(regEmail)
      toast({ title: '验证码已发送', description: `请查收 ${regEmail} 中的验证码` })
      setStep('verify')
      startCountdown()
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // ---- VERIFY OTP ----
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return
    setLoading(true)
    try {
      if (authMode === 'register') {
        // Use Resend-verified OTP to create confirmed user
        const { data, error } = await supabase.functions.invoke('verify-email-otp', {
          body: {
            email: regEmail,
            code: otp,
            type: 'register',
            password: regPassword,
            phone: registerType === 'phone' ? regPhone : undefined,
            invite_code: regInviteCode.trim() ? normalizeInviteCode(regInviteCode) : undefined,
          },
        })
        if (error || data?.error) {
          toast({ title: '验证失败', description: data?.error || error?.message, variant: 'destructive' })
          setLoading(false)
          return
        }
        // Record registration for IP tracking
        await supabase.functions.invoke('validate-registration', {
          body: { action: 'record_registration' },
        })
        // Sign in after successful registration
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: regEmail,
          password: regPassword,
        })
        if (signInError) {
          toast({ title: '注册成功，但登录失败', description: signInError.message, variant: 'destructive' })
        } else {
          if (data?.invite_binding_error) {
            toast({
              title: '注册成功，但邀请码绑定失败',
              description: data.invite_binding_error,
              variant: 'destructive',
            })
          }
          toast({ title: '注册成功，欢迎加入雀友聚！' })
        }
      } else {
        // Login flow: verify OTP for email re-confirmation
        const { error } = await supabase.auth.verifyOtp({
          email: resolvedEmail,
          token: otp,
          type: 'email',
        })
        if (error) {
          toast({ title: '验证失败', description: error.message, variant: 'destructive' })
          setLoading(false)
          return
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: loginPassword,
        })
        if (signInError) {
          toast({ title: '登录失败', description: signInError.message, variant: 'destructive' })
          setLoading(false)
          return
        }
        toast({ title: '登录成功' })
      }
    } catch {
      toast({ title: '验证失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // ---- RESEND OTP ----
  const handleResendOtp = async () => {
    const email = authMode === 'register' ? regEmail : resolvedEmail
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('send-email-otp', {
      body: { email, type: authMode === 'register' ? 'register' : 'login' },
    })
    setLoading(false)
    if (error || data?.error) {
      toast({ title: '发送失败', description: data?.error || error?.message, variant: 'destructive' })
    } else {
      toast({ title: '验证码已重新发送' })
      startCountdown()
    }
  }

  // ---- OTP VERIFICATION SCREEN ----
  if (step === 'verify') {
    const email = authMode === 'register' ? regEmail : resolvedEmail
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Card className="w-full max-w-md shadow-mahjong">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-display text-xl">邮箱验证</CardTitle>
            <CardDescription>
              验证码已发送至 <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyOtp} className="w-full" disabled={otp.length !== 6 || loading}>
              {loading ? '验证中...' : '验证'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                返回
              </Button>
              <Button variant="ghost" size="sm" disabled={countdown > 0 || loading} onClick={handleResendOtp}>
                {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- MAIN FORM ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={handleBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <Card className="w-full max-w-md shadow-mahjong">
        <CardHeader className="text-center space-y-2">
          <div className="text-5xl mb-2">🀄</div>
          <CardTitle className="font-display text-2xl">雀友聚</CardTitle>
          <CardDescription>娱乐约局，快乐拼团</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isDev && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>开发环境测试账号</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  超级管理员: <span className="font-mono text-foreground">SuperAdmin</span> /{' '}
                  <span className="font-mono text-foreground">sy13946588164</span>
                </p>
                <p>
                  管理员: <span className="font-mono text-foreground">admin</span> /{' '}
                  <span className="font-mono text-foreground">123456</span>
                </p>
              </div>
            </div>
          )}

          <Tabs value={authMode} onValueChange={v => setAuthMode(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">手机号 / 用户名 / 邮箱</label>
                <Input
                  placeholder="请输入手机号、用户名或邮箱"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <Input
                  placeholder="请输入密码"
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree-login"
                  checked={agreed}
                  onCheckedChange={v => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="agree-login" className="text-xs text-muted-foreground leading-relaxed">
                  我已阅读并同意 <span className="text-primary cursor-pointer">《用户协议》</span> 和{' '}
                  <span className="text-primary cursor-pointer">《隐私政策》</span>
                </label>
              </div>
              <Button
                onClick={handleLogin}
                className="w-full"
                disabled={!loginIdentifier || loginPassword.length < 6 || !agreed || loading}
              >
                {loading ? '处理中...' : '登录'}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="mt-4 space-y-4">
              {/* Registration type selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={registerType === 'phone' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setRegisterType('phone')}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  手机号注册
                </Button>
                <Button
                  type="button"
                  variant={registerType === 'email' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setRegisterType('email')}
                >
                  <AtSign className="h-4 w-4 mr-1" />
                  邮箱注册
                </Button>
              </div>

              {registerType === 'phone' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">手机号 *</label>
                  <Input
                    placeholder="请输入手机号"
                    type="tel"
                    maxLength={11}
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  邮箱 *
                  {registerType === 'phone' && (
                    <span className="text-xs text-muted-foreground ml-1">（用于接收验证码）</span>
                  )}
                </label>
                <Input
                  placeholder="请输入邮箱"
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">密码 *</label>
                <Input
                  placeholder="请输入密码（至少6位）"
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">邀请码</label>
                <Input
                  placeholder="请输入邀请码（选填）"
                  value={regInviteCode}
                  onChange={e => setRegInviteCode(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree-register"
                  checked={agreed}
                  onCheckedChange={v => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="agree-register" className="text-xs text-muted-foreground leading-relaxed">
                  我已阅读并同意 <span className="text-primary cursor-pointer">《用户协议》</span> 和{' '}
                  <span className="text-primary cursor-pointer">《隐私政策》</span>
                </label>
              </div>

              <Button
                onClick={handleRegister}
                className="w-full"
                disabled={
                  !isEmail(regEmail) ||
                  regPassword.length < 6 ||
                  (registerType === 'phone' && !isPhone(regPhone)) ||
                  !agreed ||
                  loading
                }
              >
                {loading ? '处理中...' : '注册'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
