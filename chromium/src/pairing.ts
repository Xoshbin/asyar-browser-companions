type FetchFn = typeof fetch;

export async function requestPairing(port: number, variant: string, fetchFn: FetchFn): Promise<string> {
  const res = await fetchFn(`http://127.0.0.1:${port}/pair-request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ family: 'chromium', variant }),
  });
  if (!res.ok) throw new Error(`pair-request failed: ${res.status}`);
  const body = await res.json();
  return body.pairing_id as string;
}

export interface PairStatus {
  status: 'approved' | 'denied' | 'timed_out' | 'unknown';
  token?: string;
}

export async function pollPairStatus(port: number, pairingId: string, fetchFn: FetchFn): Promise<PairStatus> {
  // The launcher long-polls up to 60s; one fetch is one poll cycle.
  const res = await fetchFn(`http://127.0.0.1:${port}/pair-status/${pairingId}`);
  if (!res.ok) throw new Error(`pair-status failed: ${res.status}`);
  return (await res.json()) as PairStatus;
}
