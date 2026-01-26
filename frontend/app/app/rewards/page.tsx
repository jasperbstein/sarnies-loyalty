'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RewardsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to vouchers page (the actual rewards page)
    router.replace('/app/vouchers');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
