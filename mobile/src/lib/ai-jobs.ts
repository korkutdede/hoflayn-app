import type { AiJobDto } from '@hoflayn/contracts';
import { apiRequest } from '@/src/lib/api';

const ACTIVE_STATUSES = new Set(['pending', 'running', 'retry_later']);

export async function waitForAiJob(
  jobId: string,
  initialStatus: string,
  maxPolls = 90,
): Promise<AiJobDto> {
  let current: AiJobDto | null = null;
  let status = initialStatus;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    if (!ACTIVE_STATUSES.has(status) && current) return current;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    current = await apiRequest<AiJobDto>(`/api/v1/jobs/${jobId}`);
    status = current.status;
  }
  if (current && !ACTIVE_STATUSES.has(current.status)) return current;
  throw new Error(
    'AI işlemi beklenenden uzun sürdü. Biraz sonra tekrar kontrol et.',
  );
}

export function assertAiJobSucceeded(job: AiJobDto) {
  if (job.status !== 'succeeded') {
    throw new Error(job.error ?? `AI işlemi tamamlanamadı (${job.status}).`);
  }
}
