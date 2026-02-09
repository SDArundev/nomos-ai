import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

const loginSearchSchema = z.object({
	returnTo: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: loginSearchSchema,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			redirect({
				to: "/dashboard",
				throw: true,
			});
		}
	},
});

function RouteComponent() {
	const { returnTo } = Route.useSearch();
	const [showSignIn, setShowSignIn] = useState(false);

	return showSignIn ? (
		<SignInForm
			onSwitchToSignUp={() => setShowSignIn(false)}
			returnTo={returnTo}
		/>
	) : (
		<SignUpForm
			onSwitchToSignIn={() => setShowSignIn(true)}
			returnTo={returnTo}
		/>
	);
}
