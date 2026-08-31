import { getPublicBeautyProducts } from "@/lib/db";
import { normalizeProductImages } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getPublicBeautyProducts();

  return Response.json(
    {
      ok: true,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        color: product.color,
        description: product.description,
        imageUrl: product.image_url,
        imageUrls: normalizeProductImages(product.image_urls, product.image_url),
        brandName: product.brand_name,
        country: product.brand_country,
        createdAt: product.created_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
