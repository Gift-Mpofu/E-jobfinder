'use client';
import { useRouter } from 'next/navigation';
import { handleSignOut } from '@/firebase/auth';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const router = useRouter();

  const signOut = async () => {
    await handleSignOut();
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
          Dashboard
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400">
          Welcome to your dashboard!
        </p>
        <Button variant="outline" className="w-full" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
