'use client'

import React, { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Ghost,
  User,
  Phone,
  AtSign,
  Mail,
  Lock,
  Camera,
  ImageIcon,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import Image from 'next/image'

import { mockUsers } from '@/lib/mock-data'
import { signUp, signIn, signInWithGoogle } from '@/lib/supabase/auth'
import { toast } from 'sonner'

// Schema Definitions
const step1Schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

const step2Schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().min(1, "Telefone obrigatório"),
  nickname: z.string().min(3, "Mínimo 3 caracteres")
    .refine(val => !['admin', 'phantom'].includes(val.toLowerCase()), "Nickname indisponível")
    .refine(val => {
      // Check mock users
      if (mockUsers.some(u => u.nickname.toLowerCase() === val.toLowerCase())) return false
      // Check local storage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('phantom-users')
        if (stored) {
          try {
            const users = JSON.parse(stored)
            if (Array.isArray(users) && users.some((u: any) => u.nickname?.toLowerCase() === val.toLowerCase())) return false
          } catch (e) {
            // ignore error
          }
        }
      }
      return true
    }, "Nickname já está em uso"),
})

const step3Schema = z.object({
  profilePhoto: z.string().nullable().optional(),
  coverPhoto: z.string().nullable().optional(),
})

// Combined Schema for final submission
const userFormSchema = step1Schema.merge(step2Schema).merge(step3Schema)

export type UserFormData = z.infer<typeof userFormSchema>

interface AuthFormProps {
  onComplete: (userData: UserFormData) => void
  onBack: () => void
}

type AuthMode = 'login' | 'signup'

export function AuthForm({ onComplete, onBack }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const profileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
      nickname: '',
      profilePhoto: null,
      coverPhoto: null,
    },
    mode: 'onChange'
  })

  const formData = watch()

  const handlePhotoChange = (
    field: 'profilePhoto' | 'coverPhoto',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setValue(field, reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onNext = async () => {
    if (mode === 'login') {
      const isValid = await trigger(['email', 'password'])
      if (isValid) {
        setLoading(true)
        const { data, error } = await signIn(formData.email, formData.password)
        setLoading(false)

        if (error) {
          toast.error(error)
          return
        }

        onComplete(formData)
      }
      return
    }

    if (step === 1) {
      const isValid = await trigger(['email', 'password'])
      if (isValid) {
        // Check if email already exists before allowing signup
        setLoading(true)
        const { getSupabaseClient } = await import('@/lib/supabase/client')
        const supabase = getSupabaseClient()
        if (!supabase) {
          setLoading(false)
          toast.error('Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.')
          return
        }
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .single()

        setLoading(false)

        if (existingUser) {
          toast.error('Este email já está cadastrado. Faça login ou use outro email.')
          return
        }

        setStep(2)
      }
    } else if (step === 2) {
      const isValid = await trigger(['name', 'phone', 'nickname'])
      if (isValid) setStep(3)
    } else if (step === 3) {
      setLoading(true)
      const { error } = await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        nickname: formData.nickname,
        phone: formData.phone,
      })
      setLoading(false)

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Conta criada com sucesso!')
      onComplete(formData)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    setLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    // OAuth redirect will handle the rest
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      onBack()
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-b from-primary/20 to-background overflow-hidden">
        {formData.coverPhoto ? (
          <Image
            src={formData.coverPhoto}
            alt="Capa"
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Cover Photo Upload Button */}
        {mode === 'signup' && step >= 3 && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
              aria-label="Adicionar foto de capa"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoChange('coverPhoto', e)}
            />
          </>
        )}

        {/* Profile Avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          {mode === 'signup' && step >= 3 ? (
            <button
              onClick={() => profileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-card border-4 border-background flex items-center justify-center overflow-hidden group"
            >
              {formData.profilePhoto ? (
                <Image
                  src={formData.profilePhoto}
                  alt="Perfil"
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-foreground" />
              </div>
            </button>
          ) : (
            <div className="w-20 h-20 rounded-full bg-card border-4 border-background flex items-center justify-center">
              <Ghost className="w-10 h-10 text-primary" />
            </div>
          )}
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoChange('profilePhoto', e)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-16 pb-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {mode === 'login'
              ? 'Bem-vindo de volta'
              : step === 1
                ? 'Criar conta'
                : step === 2
                  ? 'Seus dados'
                  : 'Sua foto'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'login'
              ? 'Entre na sua conta'
              : step === 1
                ? 'Comece com email e senha'
                : step === 2
                  ? 'Como podemos te chamar?'
                  : 'Adicione uma foto (opcional)'}
          </p>
        </div>

        {/* Step Indicators */}
        {mode === 'signup' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  s === step ? 'w-8 bg-primary' : s < step ? 'w-4 bg-primary/50' : 'w-4 bg-muted'
                )}
              />
            ))}
          </div>
        )}

        {/* Form */}
        <div className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full">
          {/* Step 1: Email & Password */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className={cn(
                      'pl-11 h-12 bg-card border-border text-foreground',
                      errors.email && 'border-destructive'
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className={cn(
                      'pl-11 pr-11 h-12 bg-card border-border text-foreground',
                      errors.password && 'border-destructive'
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Divisor "OU" */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              {/* Botão Google */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 text-base font-medium border-2"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </Button>
            </>
          )}

          {/* Step 2: Personal Data */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    className={cn(
                      'pl-11 h-12 bg-card border-border text-foreground',
                      errors.name && 'border-destructive'
                    )}
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    className={cn(
                      'pl-11 h-12 bg-card border-border text-foreground',
                      errors.phone && 'border-destructive'
                    )}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-foreground">Nickname</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="nickname"
                    placeholder="seu_usuario"
                    className={cn(
                      'pl-11 h-12 bg-card border-border text-foreground',
                      errors.nickname && 'border-destructive'
                    )}
                    {...register('nickname')}
                  />
                </div>
                {errors.nickname && (
                  <p className="text-xs text-destructive">{errors.nickname.message}</p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => profileInputRef.current?.click()}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-colors col-span-2',
                    formData.profilePhoto
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center overflow-hidden">
                    {formData.profilePhoto ? (
                      <Image
                        src={formData.profilePhoto}
                        alt="Perfil"
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Foto de perfil</p>
                    <p className="text-xs text-muted-foreground">
                      {formData.profilePhoto ? 'Toque para trocar' : 'Toque para adicionar'}
                    </p>
                  </div>
                  {formData.profilePhoto && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">OK</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => coverInputRef.current?.click()}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-colors col-span-2',
                    formData.coverPhoto
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="w-14 h-14 rounded-lg bg-card border-2 border-border flex items-center justify-center overflow-hidden">
                    {formData.coverPhoto ? (
                      <Image
                        src={formData.coverPhoto}
                        alt="Capa"
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Foto de capa</p>
                    <p className="text-xs text-muted-foreground">
                      {formData.coverPhoto ? 'Toque para trocar' : 'Toque para adicionar'}
                    </p>
                  </div>
                  {formData.coverPhoto && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">OK</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full mt-8">
          <Button
            onClick={onNext}
            disabled={loading}
            className="h-12 text-base font-semibold"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : null}
            {mode === 'login'
              ? 'Entrar'
              : step === 3
                ? 'Criar conta'
                : 'Continuar'}
            {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>

          {step === 1 && (
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === 'login' ? (
                <>
                  Não tem conta? <span className="text-primary font-medium">Criar conta</span>
                </>
              ) : (
                <>
                  Já tem conta? <span className="text-primary font-medium">Entrar</span>
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={() => onComplete(formData)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular por agora
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
