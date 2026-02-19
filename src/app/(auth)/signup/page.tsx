import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign Up | RNTell",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    session_id?: string;
    job_id?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="signup"
      fromAnalyze={params.from === "analyze"}
      fromJobs={params.from === "jobs"}
      jobId={params.job_id}
    />
  );
}
