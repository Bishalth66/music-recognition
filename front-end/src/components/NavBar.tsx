"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IoMenu, IoClose } from "react-icons/io5";
import { getCurrentUser, type AuthUser } from "@/lib/history";

const NavBar = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const loadUser = () => {
      getCurrentUser().then(setUser);
    };

    loadUser();
    window.addEventListener("auth-updated", loadUser);
    return () => window.removeEventListener("auth-updated", loadUser);
  }, []);

  return (
    <header className="w-full h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 relative">
      {/* Logo */}
      <Link href="/" className="flex gap-1 items-center">
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
      </Link>
      {/* Desktop Nav */}
      <nav className="hidden md:block">
        <ul className="flex gap-8 text-[15px] font-medium text-gray-700">
          <li className="hover:text-black transition cursor-pointer">
            <Link href="/">Recognize</Link>
          </li>
          <li className="hover:text-black transition cursor-pointer">
            <Link href="/history">History</Link>
          </li>
          <li className="hover:text-black transition cursor-pointer">
            <Link href="/discover">Discover</Link>
          </li>
          <li className="hover:text-black transition cursor-pointer">
            <Link href="/library">Library</Link>
          </li>
          <li className="hover:text-black transition cursor-pointer">
            <Link href="/auth">{user ? user.username : "Sign in"}</Link>
          </li>
        </ul>
      </nav>

      {/* Mobile Toggle */}
      <button className="md:hidden text-3xl" onClick={() => setOpen(!open)}>
        {open ? <IoClose /> : <IoMenu />}
      </button>

      {/* Mobile Menu */}
      {open && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-200 md:hidden">
          <ul className="flex flex-col items-center gap-6 py-6 text-gray-700 font-medium">
            <li onClick={() => setOpen(false)}>
              <Link href="/">Recognize</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/history">History</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/discover">Discover</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/library">Library</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/auth">{user ? user.username : "Sign in"}</Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default NavBar;
