"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { IoMenu, IoClose } from "react-icons/io5";

const NavBar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 relative">
      
      {/* Logo */}
      <div className="flex gap-1 items-center">
      <div className="w-15 h-15 relative">
  <Image
    src="/wave-logo.png"
    alt="SoundTrace logo"
    fill
    className="object-contain"
    sizes="52px"
    priority
  />

</div>
<p className="font-semibold tracking-tight">Sound Trace</p>
</div>
      {/* Desktop Nav */}
      <nav className="hidden md:block">
        <ul className="flex gap-8 text-[15px] font-medium text-gray-700">
          <li className="hover:text-black transition cursor-pointer">
            Recognize
          </li>
          <li className="hover:text-black transition cursor-pointer">
            History
          </li>
          <li className="hover:text-black transition cursor-pointer">
            <Link href="http://localhost:8000/admin">Admin</Link>
          </li>
        </ul>
      </nav>

      {/* Mobile Toggle */}
      <button
        className="md:hidden text-3xl"
        onClick={() => setOpen(!open)}
      >
        {open ? <IoClose /> : <IoMenu />}
      </button>

      {/* Mobile Menu */}
      {open && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-200 md:hidden">
          <ul className="flex flex-col items-center gap-6 py-6 text-gray-700 font-medium">
            <li onClick={() => setOpen(false)}>
              <Link href="#">Recognize</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="#">History</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="http://localhost:8000/admin">Admin</Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default NavBar;