import {
	ESTIMATED_SIZE,
	type EstimatedSize,
	FEATURE_CATEGORIES,
	FEATURE_PHASES,
} from "@nomos-ai/types";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { orpc } from "@/utils/orpc";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

// Feature type from database - inferred from API router
type FeatureFromAPI = {
	id: string;
	title: string;
	category: string;
	description: string;
	phase: string;
	priority: number | null;
	status: string;
	acceptanceCriteria: string[];
	estimatedSize: string | null;
	projectId: string;
	[key: string]: unknown;
};

// Using exported constants from @nomos-ai/types for consistency
const CATEGORIES = FEATURE_CATEGORIES;
const PHASES = FEATURE_PHASES;
const SIZES = Object.values(ESTIMATED_SIZE);

interface FeatureFormProps {
	feature?: FeatureFromAPI;
	projectId: string;
	onSuccess: () => void;
}

export default function FeatureForm({
	feature,
	projectId,
	onSuccess,
}: FeatureFormProps) {
	const queryClient = useQueryClient();

	const createFeature = useMutation(
		orpc.features.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature created successfully");
				onSuccess();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create feature");
			},
		}),
	);

	const updateFeature = useMutation(
		orpc.features.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature updated successfully");
				onSuccess();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature");
			},
		}),
	);

	const form = useForm({
		defaultValues: {
			title: feature?.title ?? "",
			description: feature?.description ?? "",
			category: feature?.category ?? "",
			phase: feature?.phase ?? "",
			estimatedSize: feature?.estimatedSize ?? "",
			priority: feature?.priority,
			acceptanceCriteria: feature?.acceptanceCriteria ?? [""],
		},
		onSubmit: async ({ value }) => {
			const data = {
				projectId,
				title: value.title,
				description: value.description,
				category: value.category,
				phase: value.phase,
				acceptanceCriteria: value.acceptanceCriteria.filter(
					(c) => c.trim().length > 0,
				),
				priority: value.priority,
				estimatedSize: value.estimatedSize || undefined,
			};

			if (data.acceptanceCriteria.length === 0) {
				toast.error("At least one non-empty acceptance criterion is required");
				return;
			}

			if (feature) {
				await updateFeature.mutateAsync({
					id: feature.id,
					data: {
						title: data.title,
						description: data.description,
						category: data.category,
						phase: data.phase,
						acceptanceCriteria: data.acceptanceCriteria,
						priority: data.priority ?? undefined,
						estimatedSize: data.estimatedSize as EstimatedSize | undefined,
					},
				});
			} else {
				await createFeature.mutateAsync({
					...data,
					priority: data.priority ?? undefined,
					status: "backlog",
					estimatedSize: data.estimatedSize as EstimatedSize | undefined,
				});
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<div>
				<form.Field
					name="title"
					validators={{
						onChange: z
							.string()
							.min(5, "Title must be at least 5 characters")
							.max(80),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Title</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Feature title"
							/>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<div>
				<form.Field
					name="description"
					validators={{
						onChange: z
							.string()
							.min(20, "Description must be at least 20 characters")
							.max(500),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Description</Label>
							<Textarea
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Feature description (20-500 characters)"
							/>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<div>
				<form.Field
					name="category"
					validators={{
						onChange: z.string().min(1, "Category is required"),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Category</Label>
							<Select
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value ?? "")}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select category" />
								</SelectTrigger>
								<SelectContent>
									{CATEGORIES.map((cat) => (
										<SelectItem key={cat} value={cat}>
											{cat}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<div>
				<form.Field
					name="phase"
					validators={{
						onChange: z.string().min(1, "Phase is required"),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Phase</Label>
							<Select
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value ?? "")}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select phase" />
								</SelectTrigger>
								<SelectContent>
									{PHASES.map((phase) => (
										<SelectItem key={phase} value={phase}>
											{phase}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<div>
				<form.Field name="estimatedSize">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Estimated Size (optional)</Label>
							<Select
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value ?? "")}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select size" />
								</SelectTrigger>
								<SelectContent>
									{SIZES.map((size) => (
										<SelectItem key={size} value={size}>
											{size}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<div>
				<form.Field
					name="priority"
					validators={{
						onChange: ({ value }) => {
							if (
								value !== undefined &&
								value !== null &&
								(value < 1 || value > 999)
							) {
								return "Priority must be between 1 and 999";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Priority (optional, 1-999)</Label>
							<Input
								id={field.name}
								name={field.name}
								type="number"
								min={1}
								max={999}
								value={field.state.value ?? ""}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const val = e.target.value;
									field.handleChange(val ? Number(val) : undefined);
								}}
								placeholder="Priority number"
							/>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<div>
				<form.Field
					name="acceptanceCriteria"
					mode="array"
					validators={{
						onChange: ({ value }) => {
							if (value.length < 1) {
								return "At least one acceptance criterion is required";
							}
							if (value.length > 10) {
								return "Maximum 10 acceptance criteria allowed";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label>Acceptance Criteria</Label>
							{field.state.value.map((criterion, i) => (
								<form.Field
									// biome-ignore lint/suspicious/noArrayIndexKey: TanStack Form requires index-based field names for array fields
									key={`${criterion}-${i}`}
									name={`acceptanceCriteria[${i}]`}
								>
									{(subField) => (
										<div className="flex gap-2">
											<Input
												value={subField.state.value}
												onChange={(e) => subField.handleChange(e.target.value)}
												onBlur={subField.handleBlur}
												placeholder={`Criterion ${i + 1}`}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => field.removeValue(i)}
												disabled={field.state.value.length === 1}
											>
												Remove
											</Button>
										</div>
									)}
								</form.Field>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => field.pushValue("")}
								disabled={field.state.value.length >= 10}
							>
								Add Criterion
							</Button>
							{field.state.meta.errors.map((error, i) => (
								<p
									key={`${field.name}-error-${i}`}
									className="text-red-500 text-sm"
								>
									{String(error)}
								</p>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<form.Subscribe>
				{(state) => (
					<Button
						type="submit"
						className="w-full"
						disabled={!state.canSubmit || state.isSubmitting}
					>
						{state.isSubmitting
							? "Submitting..."
							: feature
								? "Update Feature"
								: "Create Feature"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
