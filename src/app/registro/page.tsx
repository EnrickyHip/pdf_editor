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

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Preencha email e senha');
      return;
    }

    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || 'Erro ao criar conta');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      router.push('/login');
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <AuthContainer>
      <AuthCard>
        <AuthTitle>Criar conta</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Field>
            Email *
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
            />
          </Field>

          <Field>
            Nome
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome (opcional)"
            />
          </Field>

          <Field>
            Senha * (mínimo 6 caracteres)
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              required
              minLength={6}
            />
          </Field>

          <Field>
            Confirmar senha *
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita a senha"
              required
            />
          </Field>

          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </AuthForm>

        <AuthFooter>
          Já tem uma conta? <a href="/login">Entrar</a>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  );
}
