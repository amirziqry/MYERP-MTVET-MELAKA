import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { InlineSpinner } from "@/components/GlassSpinner";
import { notifyAppEvent } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/register")({
  component: RegisterPage,
});

function normalizeMyPhone(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+60")) return "+60" + digits.slice(3).replace(/\D/g, "");
  if (digits.startsWith("60")) return "+60" + digits.slice(2).replace(/\D/g, "");
  if (digits.startsWith("0")) return "+60" + digits.slice(1).replace(/\D/g, "");
  return "+60" + digits.replace(/\D/g, "");
}

function RegisterPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [phone, setPhone] = useState(normalizeMyPhone(profile?.phone ?? "") || "+60");
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["my-trainer-app", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await db.from("trainer_applications").select("*").eq("user_id", profile!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  if (!profile) return null;
  if (profile.role === "trainer") return <Navigate to="/workspace" />;
  if (profile.role === "admin") return <Navigate to="/admin" />;

  if (existing && existing.status === "pending") {
    return (
      <GlassCard className="max-w-2xl mx-auto text-center py-12">
        <Lock className="h-10 w-10 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold">Application Under Review</h2>
        <p className="text-muted-foreground mt-2">
          Your trainer application is in! We’re reviewing it to ensure a great fit and will update you within 24 hours.
        </p>
      </GlassCard>
    );
  }

  const addSkill = () => {
    const v = skillsInput.trim();
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setSkillsInput("");
  };

  const submit = async () => {
    if (!phone.trim() || phone.trim() === "+60") return toast.error("Phone number is required");
    if (!institution.trim()) return toast.error("Institution name is required");
    if (!bio.trim()) return toast.error("Bio is required");
    const bioWords = bio.trim().split(/\s+/).length;
    if (bioWords > 200) return toast.error("Bio must be 200 words or fewer");
    if (skills.length === 0) return toast.error("Add at least one skill");
    setBusy(true);
    try {
      if (phone !== profile.phone) {
        await db.from("profiles").update({ phone }).eq("id", profile.id);
      }
      const { data: inserted, error } = await db.from("trainer_applications").insert({
        user_id: profile.id,
        skills,
        background: bio,
        institution_name: institution,
      }).select("id").single();
      if (error) throw error;
      if (inserted?.id) {
        notifyAppEvent({ data: { event: "application_submitted", applicationId: inserted.id } }).catch((e) => {
          console.error("notify application_submitted failed", e);
        });
      }
      toast.success("Application submitted");
      qc.invalidateQueries({ queryKey: ["my-trainer-app", profile.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const requiredMissing = !phone.trim() || phone.trim() === "+60" || !institution.trim() || !bio.trim() || skills.length === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Trainer Registration</h1>
        <p className="text-muted-foreground">Apply to be verified as a TVET Melaka trainer</p>
      </div>

      <GlassCard>
        <div className="space-y-4">
            <div>
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => setPhone(normalizeMyPhone(e.target.value) || "+60")}
                onFocus={() => { if (!phone) setPhone("+60"); }}
                placeholder="+60123456789"
                className="rounded-2xl bg-white/5"
              />
            </div>
            <div>
              <Label>Institution Name <span className="text-destructive">*</span></Label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)} className="rounded-2xl bg-white/5" placeholder="e.g. Politeknik Melaka" />
            </div>
            <div>
              <Label>Bio <span className="text-destructive">*</span></Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-2xl bg-white/5" rows={4} />
            </div>
            <div>
              <Label>Expertise / Skills <span className="text-destructive">*</span></Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="e.g. React, Welding, Project Management"
                  className="rounded-2xl bg-white/5"
                />
                <Button type="button" onClick={addSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {skills.map((s) => (
                  <span key={s} className="glass rounded-full px-3 py-1 text-sm cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== s))}>
                    {s} ✕
                  </span>
                ))}
              </div>
            </div>
            <Button onClick={submit} disabled={busy || requiredMissing} className="w-full rounded-2xl">{busy && <InlineSpinner />}{busy ? "Submitting…" : "Submit Application"}</Button>
        </div>
      </GlassCard>
    </div>
  );
}