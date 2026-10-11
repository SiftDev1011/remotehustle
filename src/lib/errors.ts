export function publicError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e.code === "23505")
    return "This record already exists. Check the email, phone number or existing application.";
  if (e.code === "23503")
    return "This record is still in use and cannot be removed.";
  if (e.code === "42501")
    return "Your account does not have permission for this action.";
  if (e.message?.startsWith("Configuration is missing"))
    return "This service is temporarily unavailable. Please try again shortly.";
  const allowed = [
    "Verify your email",
    "Complete the security check",
    "Account inactive",
    "Choose an active",
    "Choose active",
    "Select at least",
    "Full name is required",
    "This job is no longer",
    "Apply on the company",
    "Upload limit reached",
    "Upload expired",
    "Profile not found",
    "Job not found",
    "Application not found",
    "Manage administrator",
    "Owner access cannot",
    "Enter a valid",
    "Your CV must",
    "Upload a PDF",
    "Use a shorter",
    "The document content",
    "Upload size did not",
    "External application link required",
  ];
  if (e.message && allowed.some((prefix) => e.message!.startsWith(prefix)))
    return e.message;
  return "Unable to complete that action. Please try again.";
}
