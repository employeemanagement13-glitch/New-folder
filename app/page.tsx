import { UserButton } from "@clerk/nextjs";
export default function Home() {
  return (
   <div className="bg-white w-11 h-11 text-black">
     Home page 
     <UserButton />
   </div>
  );
}
