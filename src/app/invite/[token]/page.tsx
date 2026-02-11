import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { AcceptInvitationButton } from '@/components/invitation/AcceptInvitationButton';

export const dynamic = 'force-dynamic';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/sign-up?redirect_url=/invite/${token}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-bold">초대를 받으셨습니다!</h1>
        <p className="text-sm text-gray-600">
          아래 버튼을 클릭하여 초대를 수락하고 조직에 참여하세요.
        </p>
        <AcceptInvitationButton token={token} />
      </div>
    </div>
  );
}
