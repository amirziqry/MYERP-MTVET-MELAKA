import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PdfDropZone } from "@/components/PdfDropZone";
import { uploadPdf, getSignedUrl } from "@/lib/storage";
import { PillTabs } from "@/components/PillTabs";
import { toast } from "sonner";
import { Clock, Coins, FileText, Users, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { InlineSpinner } from "@/components/GlassSpinner";
import { notifyAppEvent } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

async function downloadFromUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch PDF");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

type Project = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  timeline: string | null;
  closing_date: string | null;
  quota: number | null;
  details_pdf_url: string | null;
  status: "draft" | "open" | "awarded" | "ongoing" | "closed" | "claims";
  awarded_to: string | null;
};

type Proposal = {
  id: string;
  project_id: string;
  trainer_id: string;
  pitch: string;
  bid_amount: number;
  proposal_pdf_url: string | null;
  status: "submitted" | "accepted" | "rejected";
  attempt_number: number;
  proposal_number: string;
  created_at: string;
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-500/20 text-yellow-200",
  accepted: "bg-green-500/20 text-green-200",
  rejected: "bg-red-500/20 text-red-200",
};

const MAX_ATTEMPTS = 3;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/20 text-primary",
  awarded: "bg-accent/20 text-accent-foreground",
  ongoing: "bg-yellow-500/20 text-yellow-200",
  closed: "bg-blue-500/20 text-blue-200",
  claims: "bg-green-500/20 text-green-200",
  draft: "bg-muted/40 text-muted-foreground",
};

function ProjectsPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? "general";
  const [selected, setSelected] = useState<Project | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects-public"],
    queryFn: async () => {
      const q = db.from("projects").select("*").order("created_at", { ascending: false });
      const { data, error } = role === "admin" ? await q : await q.neq("status", "draft");
      if (error) throw error;
      return (data as Project[]) ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Majlis TVET Melaka</h1>
          <p className="text-muted-foreground">​For Registered Trainers</p>
        </div>
      </div>

      {projects && projects.length === 0 && (
        <GlassCard className="text-center py-12 text-muted-foreground">No projects available yet.</GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((p) => (
          <GlassCard
            key={p.id}
            className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
            onClick={() => setSelected(p)}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg flex-1">{p.title}</h3>
              <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.description}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Coins className="h-4 w-4" /> RM {p.budget?.toLocaleString() ?? "—"}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" /> {p.closing_date ? format(new Date(p.closing_date), "PP") : (p.timeline ?? "—")}
              </span>
            </div>
            {p.quota != null && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Quota: {p.quota}
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      <ProjectDrawer project={selected} onClose={() => setSelected(null)} role={role} userId={profile?.id} />
    </div>
  );
}

function ProjectDrawer({
  project,
  onClose,
  role,
  userId,
}: {
  project: Project | null;
  onClose: () => void;
  role: string;
  userId?: string;
}) {
  const qc = useQueryClient();
  const [showProposal, setShowProposal] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [tab, setTab] = useState<"details" | "mine">("details");

  useEffect(() => { if (project) setTab("details"); }, [project?.id]);

  const { data: detailsUrl } = useQuery({
    queryKey: ["signed-details", project?.id, project?.details_pdf_url],
    enabled: !!project?.details_pdf_url,
    queryFn: () => getSignedUrl("project-details", project!.details_pdf_url!),
  });

  const [downloadingDetails, setDownloadingDetails] = useState(false);
  const downloadDetails = async () => {
    if (!detailsUrl || !project?.details_pdf_url) return;
    setDownloadingDetails(true);
    try {
      const filename = project.details_pdf_url.split("/").pop() ?? "project-details.pdf";
      await downloadFromUrl(detailsUrl, filename);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to download PDF");
    } finally {
      setDownloadingDetails(false);
    }
  };

  const { data: myProposals } = useQuery({
    queryKey: ["my-proposals", project?.id, userId],
    enabled: !!project && !!userId && role === "trainer",
    queryFn: async () => {
      const { data } = await db.from("proposals")
        .select("*")
        .eq("project_id", project!.id)
        .eq("trainer_id", userId!)
        .order("attempt_number", { ascending: false });
      return (data as Proposal[]) ?? [];
    },
  });

  const invalidateMine = () =>
    qc.invalidateQueries({ queryKey: ["my-proposals", project?.id, userId] });

  const deleteProposal = async (p: Proposal) => {
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    const { error } = await db.from("proposals").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Proposal deleted");
    invalidateMine();
    setTab("details");
  };

  if (!project) return null;
  const list = myProposals ?? [];
  const latest = list[0] ?? null;
  const rejectedCount = list.filter((p) => p.status === "rejected").length;
  const isTrainer = role === "trainer";
  const projectOpen = project.status === "open";
  const canSubmitFirst = isTrainer && projectOpen && !latest;
  const canResubmit =
    isTrainer && projectOpen && latest?.status === "rejected" && rejectedCount < MAX_ATTEMPTS;
  const maxedOut = isTrainer && rejectedCount >= MAX_ATTEMPTS;
  const nextAttempt = (latest?.attempt_number ?? 0) + 1;

  return (
    <>
      <Sheet open={!!project} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="bg-background/95 backdrop-blur-xl border-l border-white/10 w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{project.title}</SheetTitle>
          </SheetHeader>

          {isTrainer && list.length > 0 && (
            <div className="mt-4">
              <PillTabs
                value={tab}
                onChange={(v) => setTab(v)}
                options={[
                  { value: "details", label: "Details" },
                  { value: "mine", label: "My Proposal" },
                ]}
              />
            </div>
          )}

          {tab === "details" && (
          <div className="mt-4 space-y-3">
              <Badge className={STATUS_COLORS[project.status]}>{project.status}</Badge>
              <p className="text-sm">{project.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="glass rounded-2xl p-3">
                  <div className="text-muted-foreground">Budget</div>
                  <div className="font-semibold">RM {project.budget?.toLocaleString() ?? "—"}</div>
                </div>
                <div className="glass rounded-2xl p-3">
                  <div className="text-muted-foreground">Closing Date</div>
                  <div className="font-semibold">{project.closing_date ? format(new Date(project.closing_date), "PP") : "—"}</div>
                </div>
                <div className="glass rounded-2xl p-3">
                  <div className="text-muted-foreground">Quota</div>
                  <div className="font-semibold">{project.quota ?? 1}</div>
                </div>
              </div>

              {project.details_pdf_url && (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  disabled={!detailsUrl || downloadingDetails}
                  onClick={downloadDetails}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {!detailsUrl ? "Loading PDF…" : downloadingDetails ? "Downloading…" : "Download Project Details PDF"}
                </Button>
              )}

              {isTrainer && (
                <div className="pt-4">
                  {maxedOut ? (
                    <Button disabled className="w-full rounded-2xl bg-muted/40 text-muted-foreground hover:bg-muted/40">
                      New Submissions Unavailable
                    </Button>
                  ) : canSubmitFirst ? (
                    <Button className="w-full rounded-2xl" onClick={() => { setEditing(null); setShowProposal(true); }}>
                      Submit Proposal
                    </Button>
                  ) : canResubmit ? (
                    <Button className="w-full rounded-2xl" onClick={() => { setEditing(null); setShowProposal(true); }}>
                      Submit New Proposal ({nextAttempt}/{MAX_ATTEMPTS})
                    </Button>
                  ) : null}
                </div>
              )}
          </div>
          )}

          {tab === "mine" && latest && (
            <div className="mt-4 space-y-3">
              <GlassCard className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">Your Proposal</div>
                    <div className="text-xs text-muted-foreground">
                      {latest.proposal_number}
                      {latest.attempt_number > 1 && ` · Resubmission #${latest.attempt_number}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`${PROPOSAL_STATUS_COLORS[latest.status]} capitalize`}>{latest.status}</Badge>
                    {latest.status === "submitted" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg"
                          aria-label="Edit proposal"
                          onClick={() => { setEditing(latest); setShowProposal(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          aria-label="Delete proposal"
                          onClick={() => deleteProposal(latest)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="glass rounded-2xl p-3">
                    <div className="text-muted-foreground">Bid Amount</div>
                    <div className="font-semibold">RM {Number(latest.bid_amount).toLocaleString()}</div>
                  </div>
                  <div className="glass rounded-2xl p-3">
                    <div className="text-muted-foreground">Submitted</div>
                    <div className="font-semibold">{format(new Date(latest.created_at), "PP")}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Proposed Program/ Project:</div>
                  <p className="whitespace-pre-wrap">{latest.pitch}</p>
                </div>
                {latest.proposal_pdf_url && (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 mt-2"
                    onClick={async () => {
                      const url = await getSignedUrl("project-proposals", latest.proposal_pdf_url!);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" /> View PDF
                  </Button>
                )}
              </GlassCard>

              {list.length > 1 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Previous attempts</div>
                  {list.slice(1).map((p) => (
                    <GlassCard key={p.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.proposal_number}</div>
                          <div className="text-xs text-muted-foreground">Attempt #{p.attempt_number}</div>
                        </div>
                        <Badge className={`${PROPOSAL_STATUS_COLORS[p.status]} capitalize`}>{p.status}</Badge>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {showProposal && userId && (
        <ProposalDialog
          projectId={project.id}
          userId={userId}
          existing={editing}
          nextAttempt={editing ? editing.attempt_number : nextAttempt}
          onClose={() => { setShowProposal(false); setEditing(null); }}
          onSubmitted={() => {
            invalidateMine();
            setShowProposal(false);
            setEditing(null);
            setTab("mine");
          }}
        />
      )}
    </>
  );
}

function ProposalDialog({
  projectId,
  userId,
  onClose,
  onSubmitted,
  existing,
  nextAttempt,
}: {
  projectId: string;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
  existing: Proposal | null;
  nextAttempt: number;
}) {
  const [bid, setBid] = useState(existing ? String(existing.bid_amount) : "");
  const [pitch, setPitch] = useState(existing?.pitch ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = !!existing;

  const submit = async () => {
    if (!bid || !pitch) return toast.error("Bid and pitch required");
    setBusy(true);
    try {
      let pdfPath: string | null = existing?.proposal_pdf_url ?? null;
      if (file) pdfPath = await uploadPdf("project-proposals", userId, file, "proposal-");
      if (isEdit) {
        const { error } = await db.from("proposals").update({
          pitch,
          bid_amount: Number(bid),
          proposal_pdf_url: pdfPath,
        }).eq("id", existing!.id);
        if (error) throw error;
        toast.success("Proposal updated");
      } else {
        const { data: created, error } = await db.from("proposals").insert({
          project_id: projectId,
          trainer_id: userId,
          pitch,
          bid_amount: Number(bid),
          proposal_pdf_url: pdfPath,
          attempt_number: nextAttempt,
        }).select("id").single();
        if (error) throw error;
        toast.success("Proposal submitted");
        if (created?.id) {
          notifyAppEvent({ data: { event: "proposal_submitted", proposalId: created.id } }).catch((e) => console.error("notify failed", e));
        }
      }
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Edit Proposal"
              : nextAttempt > 1
                ? `Resubmit Proposal (attempt ${nextAttempt}/${MAX_ATTEMPTS})`
                : "Submit Proposal"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bid Amount (RM)</Label>
            <Input type="number" value={bid} onChange={(e) => setBid(e.target.value)} className="rounded-2xl bg-white/5" />
          </div>
          <div>
            <Label>Proposed Program/ Project</Label>
            <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)} className="rounded-2xl bg-white/5" />
          </div>
          <PdfDropZone
            label={existing?.proposal_pdf_url ? "Replace Proposal PDF (optional)" : "Proposal PDF (optional)"}
            file={file}
            onFile={setFile}
          />
          <Button onClick={submit} disabled={busy} className="w-full rounded-2xl">
            {busy && <InlineSpinner />}
            {busy ? (isEdit ? "Saving…" : "Submitting…") : (isEdit ? "Save Changes" : "Submit Proposal")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}