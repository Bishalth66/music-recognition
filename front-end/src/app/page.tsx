import SongCatalog from "@/components/SongCatalog";
export default function Home() {
  return (
    <>
    
    <main className="flex-1 bg-gray-50 px-4 py-10 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <SongCatalog />
      </div>
    </main>
    
    </>
  );
}
