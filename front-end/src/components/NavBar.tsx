import Image from "next/image";
import Link from "next/link";
const NavBar = () => {
  return (
    <header className="w-full h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 ">
      {/* Logo */}
      <div className="flex items-center gap-1">
        <Image
          src="/wave-logo.png"
          width={60}
          height={60}
          alt="SoundTrace logo"
          className="aspect-auto h-auto"
          priority
        />
        <span className="font-semibold text-lg">SoundTrace</span>
      </div>

      {/* Navigation */}
      <nav>
        <ul className="flex gap-8 text-[15px] font-medium text-gray-700">
          <li className="cursor-pointer hover:text-black transition">
            Recognize
          </li>
          <li className="cursor-pointer hover:text-black transition">
            History
          </li>
          <li className="cursor-pointer hover:text-black transition">
            <Link href={"http://localhost:8000/admin"}>Admin</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default NavBar;
