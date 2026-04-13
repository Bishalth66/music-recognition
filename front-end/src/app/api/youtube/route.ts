export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";

  function toTitleCase(str: string) {
    return str
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const formattedTitle = toTitleCase(title);
  const formattedArtist = toTitleCase(artist);

  const youtubeRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_API_KEY}&q=${formattedTitle}-${formattedArtist}&type=video&part=snippet&maxResults=5`
  );
  if (!youtubeRes.ok) {
  return Response.json(
    { error: "YouTube API failed" },
    { status: youtubeRes.status }
  );
}

  const youtubeData = await youtubeRes.json();

  return Response.json({
  youtube:youtubeData
});
}