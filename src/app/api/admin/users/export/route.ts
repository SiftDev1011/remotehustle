import { requireArea } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
export async function GET() {
  const context = await requireArea("users");
  const rows: string[] = [
    [
      "Name",
      "Email",
      "Phone",
      "Account status",
      "Email verified",
      "Registration date",
    ]
      .map(csvCell)
      .join(","),
  ];
  let offset = 0;
  while (true) {
    const { data, error } = await context.db.rpc("list_workers", {
      p_search: "",
      p_approval: "",
      p_offset: offset,
    });
    if (error)
      return Response.json(
        { error: "Unable to export registration data." },
        { status: 503 },
      );
    for (const worker of data || [])
      rows.push(
        [
          worker.full_name,
          worker.email,
          worker.phone,
          worker.approval,
          worker.email_verified,
          worker.created_at,
        ]
          .map(csvCell)
          .join(","),
      );
    if (!data || data.length < 50) break;
    offset += 50;
  }
  return new Response("\uFEFF" + rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="remote-hustle-registrations.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
