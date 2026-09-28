// Formulaire d'avis pour un cours terminé (note 1-5 + commentaire).
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { StarRatingInput } from "@/components/dashboard/StarRatingInput";
import { formatDateTimeFr } from "@/lib/format";
import { teacherFullName } from "../_lib/queries";
import { submitReviewAction } from "./actions";

type BookingRow = {
  id: string;
  starts_at: string;
  status: string;
  student_id: string;
  students: { parent_id: string | null; self_profile_id: string | null; first_name: string } | null;
  teacher_profiles: {
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  subjects: { label: string } | null;
};

export default async function EspaceAvisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lesson } = await searchParams;
  const bookingId = typeof lesson === "string" ? lesson : "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  if (!bookingId) return <NotFoundCard />;

  const { data: bookingData } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, status, student_id, students(parent_id, self_profile_id, first_name), teacher_profiles(profiles(first_name, last_name)), subjects(label)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingData as unknown as BookingRow | null;

  const belongsToFamily =
    booking?.students &&
    (booking.students.parent_id === user.id || booking.students.self_profile_id === user.id);

  if (!booking || !belongsToFamily || booking.status !== "completed") {
    return <NotFoundCard />;
  }

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingReview) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Card className="text-center py-10">
          <p className="text-[14px] text-muted">
            Un avis a déjà été publié pour ce cours.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-[24px] mb-1">Laisser un avis</h1>
      <p className="text-[14px] text-muted mb-6">
        {booking.subjects?.label ?? "Cours"} du {formatDateTimeFr(booking.starts_at)} avec{" "}
        {teacherFullName(booking.teacher_profiles?.profiles)} · pour {booking.students?.first_name}
      </p>

      <Card>
        <form action={submitReviewAction} className="flex flex-col gap-4">
          <input type="hidden" name="bookingId" value={booking.id} />
          <div>
            <p className="text-[12px] font-semibold text-[var(--color-neutral-700)] mb-2">Note</p>
            <StarRatingInput />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-[var(--color-neutral-700)]">
              Commentaire (optionnel)
            </span>
            <textarea
              name="comment"
              rows={4}
              className="border border-[var(--color-divider)] bg-white px-3 py-2.5 text-[14px] outline-none focus-visible:border-[var(--color-accent-700)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-200)]"
            />
          </label>
          <Button type="submit">Publier l&apos;avis</Button>
        </form>
      </Card>
    </div>
  );
}
