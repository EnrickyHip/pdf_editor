'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  AuthContainer,
  AuthCard,
  AuthTitle,
  AuthForm,
  Field,
  Input,
  ErrorMessage,
  AuthFooter,
} from '@/components/auth/AuthLayout';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);

    const result = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Email ou senha incorretos');
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <AuthContainer>
      <AuthCard>
        <AuthTitle>Entrar</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Field>
            Email
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
            />
          </Field>

          <Field>
            Senha
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              required
            />
          </Field>

          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </AuthForm>

        <AuthFooter>
          Não tem conta? <a href="/registro">Criar conta</a>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  );
}
