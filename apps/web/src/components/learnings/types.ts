export interface Pattern {
	id: string;
	userId: string | null;
	name: string;
	description: string;
	category: string;
	confidence: number;
	evidenceCount: number | null;
	successRate: number | null;
	riskIfIgnored: string | null;
	codeExample: string | null;
	recommendation: string | null;
	appliesTo: string[] | null;
	featuresApplied: string[] | null;
	featuresSucceeded: string[] | null;
	firstSeen: string | null;
	lastSeen: string | null;
	status: string;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface Antipattern {
	id: string;
	userId: string | null;
	name: string;
	description: string;
	category: string;
	severity: string;
	evidenceCount: number | null;
	prevention: string | null;
	whatWentWrong: string | null;
	lesson: string | null;
	fixApplied: string | null;
	lastSeen: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface FeatureInsight {
	id: string;
	userId: string | null;
	featureId: string;
	acceptanceCriteria: Array<{
		criterion: string;
		status: string;
		details?: string;
	}> | null;
	discoveries: Array<{
		discovery: string;
		context: string;
		lesson: string;
		benefit?: string;
		code_pattern?: string;
	}> | null;
	patternsApplied: string[] | null;
	whatWorked: string[] | null;
	whatFailed: string[] | null;
	whatCouldImprove: string[] | null;
	recommendations: string[] | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export type SortField = "name" | "confidence" | "status" | "category";
export type SortDir = "asc" | "desc";
