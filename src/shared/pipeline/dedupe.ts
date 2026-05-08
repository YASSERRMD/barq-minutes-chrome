import { embedBatch, cosineSimilarity } from '../models/embedding';
import { canonicalize, mergeOptionalNumber, mergeOptionalString, pickLongest } from './normalize';
import type { ActionItem, Decision, OpenQuestion } from '../schemas/meeting';

const SIM_THRESHOLD = 0.85;

interface ItemWithText {
  text: string;
}

async function clusterByEmbedding<T extends ItemWithText>(items: T[]): Promise<T[][]> {
  if (items.length === 0) return [];
  const canonicals = items.map((i) => canonicalize(i.text));
  const embeds = await embedBatch(canonicals);
  const clusters: { items: T[]; centroid: Float32Array }[] = [];
  for (let i = 0; i < items.length; i++) {
    let bestIdx = -1;
    let bestSim = SIM_THRESHOLD;
    for (let j = 0; j < clusters.length; j++) {
      const sim = cosineSimilarity(embeds[i], clusters[j].centroid);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      clusters[bestIdx].items.push(items[i]);
    } else {
      clusters.push({ items: [items[i]], centroid: embeds[i] });
    }
  }
  return clusters.map((c) => c.items);
}

export async function dedupeDecisions(items: Decision[]): Promise<Decision[]> {
  const clusters = await clusterByEmbedding(items);
  return clusters.map((cluster) => {
    const winner = pickLongest(cluster);
    return {
      ...winner,
      speaker: cluster.find((c) => c.speaker)?.speaker ?? winner.speaker,
      ts: cluster.reduce<number | undefined>((acc, c) => mergeOptionalNumber(acc, c.ts), undefined) ?? winner.ts,
    };
  });
}

export async function dedupeActions(items: ActionItem[]): Promise<ActionItem[]> {
  const clusters = await clusterByEmbedding(items);
  return clusters.map((cluster) => {
    const winner = pickLongest(cluster);
    let owner: string | null | undefined = winner.owner;
    let due: string | null | undefined = winner.due;
    let ts: number | undefined = winner.ts;
    for (const c of cluster) {
      owner = mergeOptionalString(owner, c.owner);
      due = mergeOptionalString(due, c.due);
      ts = mergeOptionalNumber(ts, c.ts);
    }
    return { ...winner, owner: owner ?? null, due: due ?? null, ts };
  });
}

export async function dedupeQuestions(items: OpenQuestion[]): Promise<OpenQuestion[]> {
  const clusters = await clusterByEmbedding(items);
  return clusters.map((cluster) => {
    const winner = pickLongest(cluster);
    return {
      ...winner,
      speaker: cluster.find((c) => c.speaker)?.speaker ?? winner.speaker,
      ts: cluster.reduce<number | undefined>((acc, c) => mergeOptionalNumber(acc, c.ts), undefined) ?? winner.ts,
    };
  });
}
