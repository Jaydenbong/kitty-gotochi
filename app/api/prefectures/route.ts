import { getPrefectures } from "@/lib/queries";

export async function GET() {
  try {
    return Response.json(await getPrefectures());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to load prefectures" }, { status: 500 });
  }
}