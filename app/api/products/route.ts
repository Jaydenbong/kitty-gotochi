import { getProducts } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const prefecture = new URL(request.url).searchParams.get("prefecture");
    const products = await getProducts(prefecture);
    return Response.json(products);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to load products" }, { status: 500 });
  }
} 