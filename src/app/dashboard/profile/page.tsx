'use client';

import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon, Mail, KeyRound, Award, Briefcase, BarChart3, MapPin, Gauge } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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

  const usage = {
    scansUsed: 2,
    scansLimit: 3,
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
            <CardDescription>View and manage your profile and career details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
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
                    <Skeleton className="h-20 w-full" />
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
                
                <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-4">Account Details</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-3 border rounded-md">
                            <Award className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Account Type</span>
                            <span className="text-sm text-primary font-semibold ml-auto bg-primary/10 px-2 py-1 rounded-full">Free</span>
                        </div>

                        <div className="p-3 border rounded-md">
                            <div className="flex items-center gap-4">
                                <Gauge className="h-5 w-5 text-muted-foreground" />
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium">Usage Meter</span>
                                        <span className="text-xs text-muted-foreground">{usage.scansUsed} / {usage.scansLimit} scans used</span>
                                    </div>
                                    <Progress value={(usage.scansUsed / usage.scansLimit) * 100} />
                                    <p className="text-xs text-muted-foreground mt-2">Your free scans reset weekly. <Button variant="link" className="p-0 h-auto text-xs">Upgrade for unlimited scans.</Button></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-4">Career Snapshot</h3>
                     <div className="space-y-4">
                        <div className="flex items-start gap-4 p-3 border rounded-md">
                            <Briefcase className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-xs text-muted-foreground">Current / Target Role</p>
                                <p className="text-sm font-medium">Senior Product Manager</p>
                            </div>
                             <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                        </div>
                        <div className="flex items-start gap-4 p-3 border rounded-md">
                            <BarChart3 className="h-5 w-5 text-muted-foreground mt-1" />
                             <div>
                                <p className="text-xs text-muted-foreground">Experience Level</p>
                                <p className="text-sm font-medium">Senior</p>
                            </div>
                             <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                        </div>
                         <div className="flex items-start gap-4 p-3 border rounded-md">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="text-sm font-medium">London, UK</p>
                            </div>
                             <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                        </div>
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
