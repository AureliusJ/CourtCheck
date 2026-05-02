// Server-side only — never import from client components.

const LIKELIHOOD_ORDER = [
  'UNKNOWN',
  'VERY_UNLIKELY',
  'UNLIKELY',
  'POSSIBLE',
  'LIKELY',
  'VERY_LIKELY',
] as const;

type Likelihood = (typeof LIKELIHOOD_ORDER)[number];

function likelihoodIndex(value: string): number {
  const idx = LIKELIHOOD_ORDER.indexOf(value as Likelihood);
  return idx === -1 ? 0 : idx;
}

function atLeast(value: string, threshold: Likelihood): boolean {
  return likelihoodIndex(value) >= likelihoodIndex(threshold);
}

export async function screenWithSafeSearch(
  photoUrl: string,
): Promise<{ approved: boolean; reason?: string }> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    console.error('[safesearch] GOOGLE_VISION_API_KEY not set — skipping moderation');
    // TODO: Fail open here means an unscreened photo may be shown. Acceptable
    // tradeoff: dropping valid reports due to a missing key would be worse.
    return { approved: true };
  }

  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: photoUrl } },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      console.error('[safesearch] Vision API error:', res.status, await res.text());
      // TODO: Fail open — better to show an unscreened photo than drop a valid report.
      return { approved: true };
    }

    const json = await res.json();
    const annotation = json?.responses?.[0]?.safeSearchAnnotation;

    if (!annotation) {
      console.error('[safesearch] No safeSearchAnnotation in response:', json);
      return { approved: true };
    }

    if (atLeast(annotation.adult, 'LIKELY')) return { approved: false, reason: 'adult' };
    if (atLeast(annotation.violence, 'LIKELY')) return { approved: false, reason: 'violence' };
    if (atLeast(annotation.racy, 'LIKELY')) return { approved: false, reason: 'racy' };
    if (atLeast(annotation.medical, 'VERY_LIKELY')) return { approved: false, reason: 'medical' };
    if (atLeast(annotation.spoof, 'VERY_LIKELY')) return { approved: false, reason: 'spoof' };

    return { approved: true };
  } catch (err) {
    console.error('[safesearch] Unexpected error — failing open:', err);
    // TODO: Fail open — Vision API unreachable. Same tradeoff as above.
    return { approved: true };
  }
}
