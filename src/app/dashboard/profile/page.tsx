'use client';

import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon, Mail, KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading } = useUser();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
      <div className="container mx-auto">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="text-primary" />
              <span>User Profile</span>
            </CardTitle>
            <CardDescription>View and manage your profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : user ? (
              <>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                    <AvatarFallback className="text-3xl">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{user.displayName || 'Anonymous User'}</h2>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-4 p-3 border rounded-md">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                        {user.emailVerified ? (
                             <span className="text-xs text-green-500 font-semibold ml-auto">Verified</span>
                        ): (
                            <span className="text-xs text-yellow-500 font-semibold ml-auto">Not Verified</span>
                        )}
                    </div>
                     <div className="flex items-center gap-4 p-3 border rounded-md">
                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">UID: {user.uid}</span>
                    </div>
                </div>
              </>
            ) : (
              <p>No user is signed in.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
