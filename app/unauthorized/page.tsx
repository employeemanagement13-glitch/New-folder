// app/unauthorized/page.tsx
import { UserButton } from "@clerk/nextjs";
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#171717]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Unauthorized Access</h1>
        <p className="text-gray-400 mb-8">You don't have permission to access this page.</p>
        <a 
          href="/" 
          className="bg-[#ff9d00] hover:bg-[#e68e00] text-black px-6 py-2 rounded-md font-medium transition-colors"
        >
          <UserButton />
          Go Home
        </a>
      </div>
    </div>
  );
}