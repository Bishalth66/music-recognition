const Footer = () => {
  return (
    <footer className="w-full px-4 md:px-6 py-4 border-t border-gray-200 text-sm text-gray-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Sound Trace</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        {/* Center */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <a href="#" className="hover:text-gray-900 transition">
            About
          </a>
          <a href="#" className="hover:text-gray-900 transition">
            How it works
          </a>
          <a href="#" className="hover:text-gray-900 transition">
            Privacy
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;