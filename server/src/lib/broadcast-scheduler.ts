import { broadcastsService } from "../modules/broadcasts/broadcasts.service";

const INTERVAL_MS = 60_000; // Проверяем каждую минуту

let timer: NodeJS.Timeout | null = null;

export function startBroadcastScheduler() {
  if (timer) return; // уже запущен

  console.log("[Scheduler] Broadcast scheduler started (interval: 60s)");

  timer = setInterval(async () => {
    try {
      await broadcastsService.processScheduled();
    } catch (err) {
      console.error("[Scheduler] Error during scheduled check:", err);
    }
  }, INTERVAL_MS);

  // Не блокируем завершение процесса
  timer.unref();
}

export function stopBroadcastScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[Scheduler] Broadcast scheduler stopped");
  }
}
