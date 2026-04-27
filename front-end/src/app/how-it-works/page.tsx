const steps = [
  {
    title: "Search Your Song",
    desc: "Type the song name or artist and let the magic begin. We fetch the best match instantly.",
    icon: "🎧",
  },
  {
    title: "Watch & Feel",
    desc: "Get a YouTube video with synced lyrics in one place. No switching tabs, no chaos.",
    icon: "🎬",
  },
  {
    title: "Dive Into Lyrics",
    desc: "Scroll through lyrics smoothly while the song plays. Feel every line, every word.",
    icon: "📜",
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen w-full  px-6 pt-16">
      
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          How It Works
        </h1>
        <p className="text-gray-400 text-lg">
          A simple flow. A smooth experience. Just music and meaning.
        </p>
      </div>

      {/* Steps */}
      <div className="mt-16 max-w-5xl mx-auto grid md:grid-cols-3 gap-8 ">
        {steps.map((step, i) => (
          <div
            key={i}
            className="group rounded-2xl p-6 backdrop-blur-lg border border-gray-300 shadow-md transition"
          >
            <div className="text-4xl mb-4">{step.icon}</div>
            <h3 className="text-xl font-semibold mb-2">
              {step.title}
            </h3>
            <p className="text-gray-400 leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      
    </div>
  );
};

export default HowItWorks;