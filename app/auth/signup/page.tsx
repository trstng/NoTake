import { SignupForm } from '@/components/auth/signup-form'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-neon mb-2">
            NoTake
          </h1>
          <p className="text-muted-foreground">
            Create your trading analytics account
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-neon-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
