const Footer = () => {
  return (
    <footer className="w-full px-6 flex justify-between items-center border-t border-gray-200 h-14 text-sm text-gray-500">
      {/* Left */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-700">Sound Trace</span>
        <span>© {new Date().getFullYear()}</span>
      </div>

      {/* Center */}
      <div className="hidden md:flex gap-6">
        <a href="#" className="hover:text-gray-900 transition">About</a>
        <a href="#" className="hover:text-gray-900 transition">How it works</a>
        <a href="#" className="hover:text-gray-900 transition">Privacy</a>
      </div>

     

    </footer>
  );
};

export default Footer;