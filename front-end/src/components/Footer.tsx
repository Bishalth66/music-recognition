const Footer = () => {
  return (
    <footer className="w-full px-4 md:px-6 py-4 border-t border-gray-200 text-sm text-gray-500">
        {/* Left */}
        <div className="flex items-center justify-center w-full h-full gap-2">
          <span className="font-semibold text-gray-700">Sound Trace</span>
          <span>© {new Date().getFullYear()}</span>
        </div>      
    </footer>
  );
};

export default Footer;
