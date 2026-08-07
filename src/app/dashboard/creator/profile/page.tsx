import { requireApprovedCreator } from "@/lib/auth";

export default async function CreatorProfilePage() {
  const { creator } = await requireApprovedCreator();
  return <div className="creator-campaigns-page">
    <header className="creator-page-heading"><p>PROFILE</p><h1>Creator profile</h1><span>Your linked profile is managed by the K-MODU admin team.</span></header>
    <section className="creator-campaign-card"><div className="creator-campaign-card-body"><dl>
      <div><dt>Display name</dt><dd>{creator.display_name}</dd></div>
      <div><dt>Platform</dt><dd>{creator.platform}</dd></div>
      <div><dt>Market</dt><dd>{creator.market}</dd></div>
      <div><dt>Categories</dt><dd>{creator.categories.join(", ") || "Not set"}</dd></div>
      <div><dt>Google email</dt><dd>{creator.google_email}</dd></div>
      <div><dt>Approval</dt><dd>{creator.approval_status}</dd></div>
    </dl></div></section>
  </div>;
}
