import { requireArea } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import {
  REGISTRATION_LABELS,
  COUNTRIES,
  type RegistrationRecord,
} from "@/lib/registration";
export const dynamic = "force-dynamic";
export async function GET() {
  const c = await requireArea("users");
  const categories = await c.db.from("job_categories").select("id,name");
  if (categories.error)
    return new Response("Export unavailable. Try again shortly.", {
      status: 503,
    });
  const names = new Map(categories.data.map((x) => [x.id, x.name]));
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const line = (v: unknown[]) =>
        controller.enqueue(encoder.encode(v.map(csvCell).join(",") + "\r\n"));
      line([
        "Reference",
        "Email",
        "Category",
        "Status",
        "Submitted (UTC)",
        "Agreement version",
        ...Object.values(REGISTRATION_LABELS),
      ]);
      let after = "";
      try {
        while (true) {
          let query = c.db
            .from("programme_registrations")
            .select("*")
            .order("id")
            .limit(500);
          if (after) query = query.gt("id", after);
          const r = await query;
          if (r.error) throw new Error("Export interrupted");
          for (const row of r.data as RegistrationRecord[])
            line([
              row.id,
              row.email,
              names.get(row.category_id) || row.category_id,
              row.status,
              row.created_at,
              row.agreement_version,
              ...Object.keys(REGISTRATION_LABELS).map((k) =>
                k === "country"
                  ? COUNTRIES.find((x) => x.code === row.data.country)?.name ||
                    row.data.country
                  : row.data[k as keyof typeof row.data],
              ),
            ]);
          if (r.data.length < 500) break;
          after = r.data[r.data.length - 1].id;
        }
        controller.close();
      } catch {
        controller.error(new Error("Export interrupted. Download again."));
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="remote-hustle-registrations.csv"',
      "Cache-Control": "private,no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
