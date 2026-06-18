import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PillTabs } from "@/components/PillTabs";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PdfDropZone } from "@/components/PdfDropZone";
import { uploadPdf, getSignedUrl } from "@/lib/storage";
import { InlineSpinner } from "@/components/GlassSpinner";
import { toast } from "sonner";
import { CheckCircle2, FileText, Clock, XCircle, Coins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace")({
  component: WorkspacePage,
});

const MY_BANKS = ["Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Bank Islam", "Hong Leong Bank", "AmBank", "Bank Rakyat", "Affin Bank", "OCBC Bank Malaysia", "HSBC Malaysia"];

function normalizeMyPhone(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+60")) return "+60" + digits.slice(3).replace(/\D/g, "");
  if (digits.startsWith("60")) return "+60" + digits.slice(2).replace(/\D/g, "");
  if (digits.startsWith("0")) return "+60" + digits.slice(1).replace(/\D/g, "");
  return "+60" + digits.replace(/\D/g, "");
}

function WorkspacePage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"profile" | "tracker">("profile");
  if (!profile) return null;
  if (profile.role !== "trainer") return <Navigate to="/projects" />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
        <p className="text-muted-foreground">Manage your profile and projects</p>
      </div>
      <PillTabs value={tab} onChange={setTab} options={[{ value: "profile", label: "Profile Details" }, { value: "tracker", label: "Project Tracker" }]} />
      {tab === "profile" ? <ProfileTab /> : <TrackerTab />}
    </div>
  );
}

function ProfileTab() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(normalizeMyPhone(profile?.phone ?? "") || "+60");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!fullName.trim()) return toast.error("Project Coordinator name is required");
    if (!phone.trim() || phone.trim() === "+60") return toast.error("Phone number is required");
    if (skills.length === 0) return toast.error("Add at least one skill");
    setBusy(true);
    try {
      const { error } = await db.from("profiles").update({ full_name: fullName, phone, skills }).eq("id", profile!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const requiredMissing = !fullName.trim() || !phone.trim() || phone.trim() === "+60" || skills.length === 0;

  return (
    <GlassCard className="max-w-2xl space-y-4">
      <div><Label>Project Coordinator (Full Name) <span className="text-destructive">*</span></Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-2xl bg-white/5" /></div>
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
        <Label>Skills <span className="text-destructive">*</span></Label>
        <div className="flex gap-2 mt-1">
          <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} className="rounded-2xl bg-white/5" placeholder="Add a skill" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput(""); } }} />
          <Button type="button" onClick={() => { const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput(""); }}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {skills.map((s) => (<span key={s} className="glass rounded-full px-3 py-1 text-sm cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== s))}>{s} ✕</span>))}
        </div>
      </div>
      <Button onClick={save} disabled={busy || requiredMissing} className="rounded-2xl">{busy && <InlineSpinner />}{busy ? "Saving…" : "Save Changes"}</Button>
    </GlassCard>
  );
}

function TrackerTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [sub, setSub] = useState<"applied" | "granted" | "rejected" | "claim">("applied");

  useEffect(() => {
    if (!profile?.id) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["my-applied", profile.id] });
      qc.invalidateQueries({ queryKey: ["my-granted", profile.id] });
      qc.invalidateQueries({ queryKey: ["my-rejected", profile.id] });
      qc.invalidateQueries({ queryKey: ["my-claims", profile.id] });
    };
    const channel = supabase
      .channel(`tracker-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals", filter: `trainer_id=eq.${profile.id}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `awarded_to=eq.${profile.id}` }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, qc]);

  return (
    <div className="space-y-4">
      <PillTabs value={sub} onChange={setSub} options={[
        { value: "applied", label: "Applied" },
        { value: "granted", label: "Granted" },
        { value: "rejected", label: "Rejected" },
        { value: "claim", label: "Close & Claim" },
      ]} />
      {sub === "applied" && <AppliedList />}
      {sub === "granted" && <GrantedList />}
      {sub === "rejected" && <RejectedList />}
      {sub === "claim" && <ClaimList />}
    </div>
  );
}

function AppliedList() {
  const { profile } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-applied", profile?.id],
    queryFn: async () => {
      const { data } = await db.from("proposals").select("*, projects(*)").eq("trainer_id", profile!.id).eq("status", "submitted").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data?.length === 0 && <GlassCard className="md:col-span-2 text-center py-8 text-muted-foreground">No active applications.</GlassCard>}
      {data?.map((p) => (
        <GlassCard key={p.id}>
          <div className="flex justify-between items-start"><h3 className="font-semibold">{p.projects?.title}</h3><Badge><Clock className="h-3 w-3 mr-1" />Pending</Badge></div>
          <p className="text-sm mt-2">Bid: RM {Number(p.bid_amount).toLocaleString()}</p>
          <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
            <span className="font-medium text-foreground">Proposed Program/ Project:</span> {p.pitch}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function GrantedList() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-granted", profile?.id],
    queryFn: async () => {
      const { data } = await db.from("proposals")
        .select("*, projects(*)")
        .eq("trainer_id", profile!.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      return ((data as any[]) ?? []).map((p) => p.projects).filter(Boolean);
    },
  });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data?.length === 0 && <GlassCard className="md:col-span-2 text-center py-8 text-muted-foreground">No granted projects.</GlassCard>}
      {data?.map((p) => <GrantedCard key={p.id} project={p} onReportUploaded={() => qc.invalidateQueries({ queryKey: ["my-granted", profile?.id] })} />)}
    </div>
  );
}

function GrantedCard({ project, onReportUploaded }: { project: any; onReportUploaded: () => void }) {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadPdf("project-reports", profile!.id, file, "report-");
      const { error } = await db.from("project_reports").insert({ project_id: project.id, trainer_id: profile!.id, report_pdf_url: path });
      if (error) throw error;
      const { error: e2 } = await db.from("projects").update({ status: "closed" }).eq("id", project.id);
      if (e2) throw e2;
      toast.success("Report submitted, project closed");
      onReportUploaded();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <GlassCard>
      <div className="flex justify-between items-start"><h3 className="font-semibold">{project.title}</h3><Badge>{project.status}</Badge></div>
      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{project.description}</p>
      {project.status === "awarded" && (<p className="text-sm mt-3 glass rounded-xl p-3">Awaiting Admin to Start Project</p>)}
      {project.status === "ongoing" && (
        <div className="space-y-2 mt-3">
          <PdfDropZone label="Upload Completion Report" file={file} onFile={setFile} />
          <Button onClick={upload} disabled={!file || busy} className="w-full rounded-2xl">{busy && <InlineSpinner />}{busy ? "Uploading…" : "Submit Report"}</Button>
        </div>
      )}
      {project.status === "closed" && (
        <div className="mt-3 text-sm glass rounded-xl p-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Report submitted — awaiting admin approval</div>
      )}
    </GlassCard>
  );
}

function RejectedList() {
  const { profile } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-rejected", profile?.id],
    queryFn: async () => {
      const { data } = await db.from("proposals").select("*, projects(*)").eq("trainer_id", profile!.id).eq("status", "rejected").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data?.length === 0 && <GlassCard className="md:col-span-2 text-center py-8 text-muted-foreground">No rejected proposals.</GlassCard>}
      {data?.map((p) => (
        <GlassCard key={p.id} className="opacity-80">
          <div className="flex justify-between"><h3 className="font-semibold">{p.projects?.title}</h3><Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge></div>
          <p className="text-sm mt-2">Bid: RM {Number(p.bid_amount).toLocaleString()}</p>
        </GlassCard>
      ))}
    </div>
  );
}

function ClaimList() {
  const { profile } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-claims", profile?.id],
    queryFn: async () => {
      const { data } = await db.from("projects").select("*, proposals(*)").eq("awarded_to", profile!.id).eq("status", "claims").order("updated_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  return (
    <div className="grid gap-4">
      {data?.length === 0 && <GlassCard className="text-center py-8 text-muted-foreground">No claims available yet. Claims unlock after an admin approves your report.</GlassCard>}
      {data?.map((p) => <ClaimForm key={p.id} project={p} />)}
    </div>
  );
}

function ClaimForm({ project }: { project: any }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const acceptedProposal = project.proposals?.find((x: any) => x.status === "accepted");
  const defaultAmount = acceptedProposal?.bid_amount ?? project.budget ?? 0;

  const { data: existing } = useQuery({
    queryKey: ["claim", project.id],
    queryFn: async () => {
      const { data } = await db.from("claims").select("*").eq("project_id", project.id).maybeSingle();
      return data;
    },
  });

  const [bankName, setBankName] = useState(existing?.bank_name ?? "");
  const [holder, setHolder] = useState(existing?.account_holder ?? "");
  const [acct, setAcct] = useState(existing?.account_number ?? "");
  const [recType, setRecType] = useState<"individual" | "company">(existing?.recipient_type ?? "individual");
  const [taxId, setTaxId] = useState(existing?.tax_id ?? "");
  const [address, setAddress] = useState(existing?.mailing_address ?? "");
  const [invNum, setInvNum] = useState(existing?.invoice_number ?? "");
  const [invDate, setInvDate] = useState(existing?.invoice_date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(String(existing?.claim_amount ?? defaultAmount));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submitted = !!existing && existing.status !== "pending";

  const submit = async () => {
    if (!bankName || !holder || !acct || !taxId || !invNum || !amount) return toast.error("Please fill all required fields");
    setBusy(true);
    try {
      let invPath = existing?.invoice_pdf_url ?? null;
      if (file) invPath = await uploadPdf("claim-invoices", profile!.id, file, "invoice-");
      const payload = {
        project_id: project.id, trainer_id: profile!.id, bank_name: bankName, account_holder: holder, account_number: acct,
        recipient_type: recType, tax_id: taxId, mailing_address: address, invoice_number: invNum, invoice_date: invDate,
        claim_amount: Number(amount), invoice_pdf_url: invPath, status: "submitted",
      };
      const { error } = existing
        ? await db.from("claims").update(payload).eq("id", existing.id)
        : await db.from("claims").insert(payload);
      if (error) throw error;
      toast.success("Claim submitted");
      qc.invalidateQueries({ queryKey: ["claim", project.id] });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const progress = submitted ? 100 : 75;

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> {project.title}</h3>
          <p className="text-sm text-muted-foreground">Claim & banking details</p>
        </div>
        <Badge>{existing?.status ?? "pending"}</Badge>
      </div>

      <div className="glass rounded-full h-2 overflow-hidden">
        <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-3 text-xs text-muted-foreground">
        <span>Awarded</span><span className="text-center">Report Approved</span><span className="text-right">Paid</span>
      </div>

      <div className="border-t border-white/10 pt-4 grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-semibold text-sm">1. Banking Information</div>
        <div>
          <Label>Bank Name</Label>
          <Select value={bankName} onValueChange={setBankName}>
            <SelectTrigger className="rounded-2xl bg-white/5"><SelectValue placeholder="Select bank" /></SelectTrigger>
            <SelectContent>{MY_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Account Holder Name</Label><Input value={holder} onChange={(e) => setHolder(e.target.value)} className="rounded-2xl bg-white/5" /></div>
        <div><Label>Bank Account Number</Label><Input value={acct} onChange={(e) => setAcct(e.target.value.replace(/[^0-9]/g, ""))} className="rounded-2xl bg-white/5" /></div>

        <div className="md:col-span-2 font-semibold text-sm pt-2">2. Billing & Corporate Details</div>
        <div>
          <Label>Recipient Type</Label>
          <div className="glass inline-flex rounded-full p-1 mt-1">
            {(["individual", "company"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRecType(r)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${recType === r ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}>{r}</button>
            ))}
          </div>
        </div>
        <div><Label>{recType === "individual" ? "IC Number" : "SSM Registration Number"}</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="rounded-2xl bg-white/5" /></div>
        <div className="md:col-span-2"><Label>Mailing Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-2xl bg-white/5" rows={2} /></div>

        <div className="md:col-span-2 font-semibold text-sm pt-2">3. Invoice & Claim Details</div>
        <div><Label>Invoice Number</Label><Input value={invNum} onChange={(e) => setInvNum(e.target.value)} className="rounded-2xl bg-white/5" /></div>
        <div><Label>Invoice Date</Label><Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="rounded-2xl bg-white/5" /></div>
        <div><Label>Claim Amount (RM)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-2xl bg-white/5" /></div>
        <div className="md:col-span-2"><PdfDropZone label="Invoice PDF" file={file} onFile={setFile} /></div>
      </div>

      <Button onClick={submit} disabled={busy} className="w-full rounded-2xl">{busy && <InlineSpinner />}{busy ? "Submitting…" : existing ? "Update Claim" : "Submit Claim"}</Button>
    </GlassCard>
  );
}