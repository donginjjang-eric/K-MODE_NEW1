import { requireApprovedCreator } from "@/lib/auth";
import { creatorGrade } from "@/lib/creator-center";
import { getCreatorMissionParticipations } from "@/lib/db";
import { creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";

const GRADES = [
  { name: "STARTER", condition: "첫 캠페인을 준비하는 단계", minimum: 0 },
  { name: "RISING", condition: "완료 캠페인 1~2건", minimum: 1 },
  { name: "PRO", condition: "완료 캠페인 3건 이상", minimum: 3 },
];

export default async function CreatorGradePage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { user, creator } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allMissions = await getCreatorMissionParticipations(creator.id);
  const missions = user.role === "admin" ? allMissions.filter((item) => missionMatchesPersona(item, persona)) : allMissions;
  const completed = missions.filter((mission) => mission.status === "completed").length;
  const current = creatorGrade(completed);
  const nextTarget = current === "STARTER" ? 1 : current === "RISING" ? 3 : completed;

  return (
    <div className="creator-campaigns-page">
      <header className="creator-page-heading creator-page-heading-wide">
        <p>CREATOR GRADE</p><h1>등급</h1>
        <span>한국 브랜드와의 협업 완료 이력에 따라 더 많은 캠페인과 판매 기회가 열립니다.</span>
      </header>
      <section className="creator-grade-hero">
        <div><p>현재 등급</p><strong>{current}</strong><span><span>완료 캠페인</span> {completed}<span>건</span></span></div>
        <div>{current === "PRO"
          ? <p>최고 등급을 유지하고 있습니다.</p>
          : <p><span>다음 등급까지</span> {Math.max(nextTarget - completed, 0)}<span>건 남았습니다.</span></p>}
          <progress max={Math.max(nextTarget, 1)} value={Math.min(completed, Math.max(nextTarget, 1))} aria-label="다음 등급 진행률" />
          <small>정확한 콘텐츠 제출과 일정 준수가 등급에 반영됩니다.</small>
        </div>
      </section>
      <section className="creator-grade-grid" aria-label="크리에이터 등급 안내">
        {GRADES.map((grade) => <article key={grade.name} className={grade.name === current ? "is-current" : ""}><span>{String(grade.minimum).padStart(2, "0")}</span><h2>{grade.name}</h2><p>{grade.condition}</p>{grade.name === current ? <b>현재 등급</b> : null}</article>)}
      </section>
    </div>
  );
}
