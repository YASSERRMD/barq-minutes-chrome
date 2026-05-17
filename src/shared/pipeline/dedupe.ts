import { embedBatch, dotProductNormalized } from '../models/embedding';
import { canonicalize, mergeOptionalNumber, mergeOptionalString, pickLongest } from './normalize';
import type { ActionItem, Decision, OpenQuestion } from '../schemas/meeting';

const SIM_THRESHOLD = 0.85;

interface ItemWithText {
  text: string;
}

function l2NormalizeInPlace(v: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s);
  if (n === 0) return v;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

function updateCentroid(centroid: Float32Array, count: number, next: Float32Array): Float32Array {
  // Running mean, then re-normalise so the centroid stays comparable to
  // future query embeddings (also unit-length).
  const out = new Float32Array(centroid.length);
  const n = count + 1;
  for (let i = 0; i < centroid.length; i++) {
    out[i] = (centroid[i] * count + next[i]) / n;
  }
  return l2NormalizeInPlace(out);
}

async function clusterByEmbedding<T extends ItemWithText>(items: T[]): Promise<T[][]> {
  if (items.length === 0) return [];
  const canonicals = items.map((i) => canonicalize(i.text));
  const embeds = await embedBatch(canonicals);
  const clusters: { items: T[]; centroid: Float32Array; count: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    let bestIdx = -1;
    // Strict >= so an item that ties the threshold against multiple clusters
    // still joins (the highest-similarity one). The greedy seed-by-similarity
    // behaviour of the previous implementation rejected such ties.
    let bestSim = SIM_THRESHOLD;
    for (let j = 0; j < clusters.length; j++) {
      const sim = dotProductNormalized(embeds[i], clusters[j].centroid);
      if (sim >= bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      const cluster = clusters[bestIdx];
      cluster.items.push(items[i]);
      cluster.centroid = updateCentroid(cluster.centroid, cluster.count, embeds[i]);
      cluster.count += 1;
    } else {
      clusters.push({
        items: [items[i]],
        centroid: l2NormalizeInPlace(new Float32Array(embeds[i])),
        count: 1,
      });
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
