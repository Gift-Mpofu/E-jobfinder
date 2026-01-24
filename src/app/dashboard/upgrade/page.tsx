'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';

export default function UpgradePage() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Zap className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Upgrade to Pro</CardTitle>
          <CardDescription>Unlock unlimited potential with Angine Pro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">Coming Soon!</h2>
          <p className="text-muted-foreground">
            Angine is currently in a public beta. We're working hard to bring you powerful new features, including unlimited CV scans, advanced analytics, and more.
          </p>
          <p className="text-muted-foreground">
            For now, all users can enjoy 3 free scans per week. We appreciate your feedback as we continue to build and improve the platform.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/dashboard/profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
