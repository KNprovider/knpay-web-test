import AuthForm from '@/components/AuthForm';

export default function Home() {
  return (
    <main style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <AuthForm />
    </main>
  );
}
