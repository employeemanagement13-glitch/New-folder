// app/error/page.tsx
export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#171717]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
        <p className="text-gray-400 mb-8">An error occurred. Please try again.</p>
        <a 
          href="/" 
          className="bg-[#ff9d00] hover:bg-[#e68e00] text-black px-6 py-2 rounded-md font-medium transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}