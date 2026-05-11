import ToolBox from "@/components/ToolBox";

const RecognizePage = () => {
  return (
    <main className="flex-1 bg-gray-50 px-4 py-10 md:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <div className="border-b border-gray-200 pb-6">
          <p className="text-sm font-medium text-blue-600">Recognition tool</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
            Identify music
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Record nearby audio or upload a clip to find the matching track.
            Saved matches will appear in your history.
          </p>
        </div>

        <ToolBox />
      </section>
    </main>
  );
};

export default RecognizePage;
