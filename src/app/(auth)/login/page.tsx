import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign In | RNTell",
};

export default async function LoginPage({
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
      mode="login"
      fromAnalyze={params.from === "analyze"}
      fromJobs={params.from === "jobs"}
      jobId={params.job_id}
    />
  );
}
