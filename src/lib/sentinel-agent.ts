/**
 * SentinelAgent API client
 * Submits PowerShell commands to the agent and polls for results.
 *
 * API: https://saapi.ardepa.site
 * Auth: x-api-key header
 * Flow: POST /commands → job_id → poll GET /commands/status/{job_id}
 */

const SENTINEL_URL = (process.env.SENTINEL_AGENT_URL ?? "https://saapi.ardepa.site").replace(/\/$/, "");
const SENTINEL_API_KEY = process.env.SENTINEL_API_KEY ?? "";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150; // 5 minutes max

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface CommandStatus {
  job_id: string;
  status?: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number | null;
}

/**
 * Executes a PowerShell script on the remote agent and waits for the result.
 * Throws if the agent is unreachable, command fails to submit, or times out.
 */
export async function executePowerShell(
  agentId: string,
  script: string,
  timeoutSeconds = 120
): Promise<ExecuteResult> {
  if (!SENTINEL_API_KEY) {
    throw new Error("SENTINEL_API_KEY environment variable is not set");
  }

  // 1. Submit the command
  const submitRes = await fetch(`${SENTINEL_URL}/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": SENTINEL_API_KEY,
    },
    body: JSON.stringify({
      agent_id: agentId,
      type: "powershell",
      payload: script,
      timeout: timeoutSeconds,
    }),
  });

  if (!submitRes.ok) {
    const body = await submitRes.text().catch(() => "");
    throw new Error(
      `SentinelAgent command submit failed [${submitRes.status}]: ${body}`
    );
  }

  const { job_id } = (await submitRes.json()) as { job_id: string };
  if (!job_id) throw new Error("SentinelAgent did not return a job_id");

  // 2. Poll for completion
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    let status: CommandStatus;
    try {
      const statusRes = await fetch(
        `${SENTINEL_URL}/commands/status/${job_id}`,
        { headers: { "x-api-key": SENTINEL_API_KEY } }
      );
      if (!statusRes.ok) continue; // transient error, keep polling
      status = (await statusRes.json()) as CommandStatus;
    } catch {
      continue; // network hiccup, keep polling
    }

    // Result is ready when exit_code is present (0 = success, non-0 = error)
    if (status.exit_code !== undefined && status.exit_code !== null) {
      return {
        stdout: status.stdout ?? "",
        stderr: status.stderr ?? "",
        exitCode: status.exit_code,
      };
    }
  }

  throw new Error(
    `SentinelAgent command timed out after ${(MAX_POLLS * POLL_INTERVAL_MS) / 1000}s (job: ${job_id})`
  );
}
