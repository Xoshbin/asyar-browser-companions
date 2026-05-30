type FetchFn = typeof fetch;

export async function discoverPort(ports: number[], fetchFn: FetchFn): Promise<number | null> {
  const probes = ports.map(async (port) => {
    try {
      const res = await fetchFn(`http://127.0.0.1:${port}/discover`);
      if (!res.ok) return null;
      const body = await res.json();
      return body?.name === 'asyar' ? port : null;
    } catch {
      return null;
    }
  });
  const results = await Promise.all(probes);
  const found = results.filter((p): p is number => p !== null);
  return found.length ? Math.min(...found) : null;
}

export const DEFAULT_PORT_RANGE = Array.from({ length: 21 }, (_, i) => 54300 + i);
