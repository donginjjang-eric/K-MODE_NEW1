import { resetDemoAction, seedDemoAction } from "@/app/dashboard/creator/demo-actions";

export function CreatorDemoControls() {
  return (
    <div className="creator-demo-controls" aria-label="관리자 체험 데이터 제어">
      <form action={seedDemoAction}>
        <button type="submit">체험 데이터 채우기</button>
      </form>
      <form action={resetDemoAction}>
        <button type="submit" className="is-reset">체험 데이터 초기화</button>
      </form>
    </div>
  );
}
