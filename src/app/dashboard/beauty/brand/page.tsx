import { requireApprovedDesigner } from "@/lib/auth";
import { getPortfolioImagesForDesigner } from "@/lib/db";
import BrandProfileStudio from "@/components/BrandProfileStudio";

export default async function BeautyBrandPage() {
  const { designer } = await requireApprovedDesigner();
  const portfolioImages = await getPortfolioImagesForDesigner(designer.id);

  return (
    <BrandProfileStudio
      designer={{
        id: designer.id,
        brandName: designer.brand_name,
        designerName: designer.designer_name || "",
        description: designer.description || "",
        mood: designer.mood || "",
      }}
      initialImages={portfolioImages}
      looksCount={0}
      mode="beauty"
    />
  );
}
