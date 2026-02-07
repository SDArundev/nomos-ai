import type { FeatureSelect } from "@nomos-ai/db";

/**
 * Topological sort using Kahn's algorithm.
 * Returns features in dependency-safe execution order.
 */
export function resolveDependencies(features: FeatureSelect[]): FeatureSelect[] {
	if (features.length === 0) return [];

	const featureMap = new Map(features.map((f) => [f.id, f]));
	const inDegree = new Map<string, number>();
	const adjacencyList = new Map<string, string[]>();

	// Initialize
	for (const f of features) {
		inDegree.set(f.id, 0);
		adjacencyList.set(f.id, []);
	}

	// Build graph
	for (const f of features) {
		const deps = f.dependencies ?? [];
		for (const depId of deps) {
			if (!featureMap.has(depId)) continue; // missing dep = treat as satisfied
			adjacencyList.get(depId)!.push(f.id);
			inDegree.set(f.id, (inDegree.get(f.id) ?? 0) + 1);
		}
	}

	// Kahn's with priority-aware selection
	const queue: FeatureSelect[] = [];
	for (const [id, degree] of inDegree) {
		if (degree === 0) queue.push(featureMap.get(id)!);
	}
	queue.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

	const ordered: FeatureSelect[] = [];

	while (queue.length > 0) {
		const current = queue.shift()!;
		ordered.push(current);

		for (const dependentId of adjacencyList.get(current.id) ?? []) {
			const newDegree = (inDegree.get(dependentId) ?? 1) - 1;
			inDegree.set(dependentId, newDegree);
			if (newDegree === 0) {
				queue.push(featureMap.get(dependentId)!);
				queue.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
			}
		}
	}

	// Features not in ordered = part of cycles, append at end
	if (ordered.length < features.length) {
		const orderedIds = new Set(ordered.map((f) => f.id));
		for (const f of features) {
			if (!orderedIds.has(f.id)) ordered.push(f);
		}
	}

	return ordered;
}

/**
 * Checks if all dependencies of a feature are satisfied.
 */
export function areDependenciesSatisfied(
	feature: FeatureSelect,
	allFeatures: FeatureSelect[],
): boolean {
	const deps = feature.dependencies ?? [];
	if (deps.length === 0) return true;

	const featureMap = new Map(allFeatures.map((f) => [f.id, f]));
	return deps.every((depId) => {
		const dep = featureMap.get(depId);
		if (!dep) return true; // missing dep = treat as satisfied
		return dep.status === "verified" || dep.status === "waiting_approval";
	});
}

/**
 * Returns dependencies that are blocking a feature.
 */
export function getBlockingDependencies(
	feature: FeatureSelect,
	allFeatures: FeatureSelect[],
): FeatureSelect[] {
	const deps = feature.dependencies ?? [];
	if (deps.length === 0) return [];

	const featureMap = new Map(allFeatures.map((f) => [f.id, f]));
	return deps
		.map((depId) => featureMap.get(depId))
		.filter((dep): dep is FeatureSelect =>
			dep !== undefined &&
			dep.status !== "verified" &&
			dep.status !== "waiting_approval",
		);
}

/**
 * Checks if adding a dependency would create a circular dependency.
 */
export function wouldCreateCircularDependency(
	featureId: string,
	newDepId: string,
	features: FeatureSelect[],
): boolean {
	const featureMap = new Map(features.map((f) => [f.id, f]));
	const visited = new Set<string>();

	function canReach(fromId: string, toId: string): boolean {
		if (fromId === toId) return true;
		if (visited.has(fromId)) return false;
		visited.add(fromId);

		const f = featureMap.get(fromId);
		if (!f?.dependencies) return false;

		for (const depId of f.dependencies) {
			if (canReach(depId, toId)) return true;
		}
		return false;
	}

	// Adding featureId depends on newDepId.
	// Cycle if newDepId already transitively depends on featureId.
	return canReach(newDepId, featureId);
}
