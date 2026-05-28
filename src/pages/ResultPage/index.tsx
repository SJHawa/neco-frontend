import { PageShell } from "../../shared/components/PageShell";
import { useParams } from "react-router-dom";
import { useRoomSocketLifecycle } from "../../features/realtime/useRoomSocketLifecycle";

export function ResultPage() {
  const { gameRoomId } = useParams();
  useRoomSocketLifecycle(gameRoomId);

  return (
    <PageShell
      title="Room Result"
      description="Mission result rendering will be implemented here."
    />
  );
}
