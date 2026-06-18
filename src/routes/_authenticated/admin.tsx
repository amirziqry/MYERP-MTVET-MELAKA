import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { PillTabs } from "@/components/PillTabs";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { PdfDropZone } from "@/components/PdfDropZone";
import { InlineSpinner } from "@/components/GlassSpinner";
import { getSignedUrl, uploadPdf } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, CalendarIcon, ChevronDown } from "lucide-react";
import { notifyAppEvent } from "@/lib/notifications.functions";
import {
  listUserEmailStatuses,
  resendUserVerification,
  type UserEmailStatus,
} from "@/lib/admin-emails.functions";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"users" | "apps" | "projects">("users");

  if (!profile) return null;
  if (profile.role !== "admin")
    return <Navigate to="/projects" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, applications and projects</p>
      </div>
      <PillTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "users", label: "Users" },
          { value: "apps", label: "Trainer Applications" },
          { value: "projects", label: "Projects" },
        ]}
      />
      {tab === "users" && <UsersTab />}
      {tab === "apps" && <AppsTab />}
      {tab === "projects" && <ProjectsTab />}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  const listStatuses = useServerFn(listUserEmailStatuses);
  const { data: emailStatuses } = useQuery({
    queryKey: ["admin-users-email-status"],
    queryFn: () => listStatuses(),
    refetchInterval: 30_000,
  });
  const statusByUser = new Map<string, UserEmailStatus>();
  for (const s of emailStatuses ?? []) statusByUser.set(s.userId, s);

  const resendFn = useServerFn(resendUserVerification);
  const [resending, setResending] = useState<string | null>(null);
  const lastResendAtRef = useState<Map<string, number>>(new Map())[0];
  const resend = useMutation({
    mutationFn: async (userId: string) => {
      const now = Date.now();
      const last = lastResendAtRef.get(userId) ?? 0;
      if (now - last < 60_000) {
        throw new Error("Please wait a minute before resending again");
      }
      lastResendAtRef.set(userId, now);
      setResending(userId);
      return await resendFn({ data: { userId } });
    },
    onSuccess: (res: any) => {
      toast.success(`Verification email resent to ${res.email}`);
      qc.invalidateQueries({ queryKey: ["admin-users-email-status"] });
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setResending(null),
  });
  const update = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await db.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <GlassCard className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Institution</TableHead><TableHead>Role</TableHead><TableHead>Email status</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.full_name ?? "—"}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.phone ?? "—"}</TableCell>
              <TableCell>{u.institution_name ?? "—"}</TableCell>
              <TableCell>
                <Select value={u.role} onValueChange={(role) => update.mutate({ id: u.id, role })}>
                  <SelectTrigger className="w-32 rounded-2xl bg-white/5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <EmailStatusCell
                  status={statusByUser.get(u.id)}
                  loading={!emailStatuses}
                  busy={resending === u.id}
                  onResend={() => resend.mutate(u.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </GlassCard>
  );
}

function EmailStatusCell({
  status,
  loading,
  busy,
  onResend,
}: {
  status: UserEmailStatus | undefined;
  loading: boolean;
  busy: boolean;
  onResend: () => void;
}) {
  if (loading) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }
  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const verified = !!status.emailConfirmedAt;
  let label = "Not sent";
  let tone = "bg-white/10 text-muted-foreground";
  if (verified) {
    label = "Verified";
    tone = "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
  } else if (status.suppressed || status.lastEmailStatus === "dlq" || status.lastEmailStatus === "failed" || status.lastEmailStatus === "bounced" || status.lastEmailStatus === "complained") {
    label = "Failed";
    tone = "bg-rose-500/15 text-rose-300 border border-rose-400/20";
  } else if (status.lastEmailStatus === "sent" || status.lastEmailStatus === "pending") {
    label = "Pending";
    tone = "bg-amber-500/15 text-amber-300 border border-amber-400/20";
  }

  const detail = (() => {
    if (verified) return `Verified ${new Date(status.emailConfirmedAt!).toLocaleString()}`;
    const parts: string[] = [];
    if (status.lastEmailStatus) {
      parts.push(`Last: ${status.lastEmailStatus}${status.lastEmailAt ? ` at ${new Date(status.lastEmailAt).toLocaleString()}` : ""}`);
    } else {
      parts.push("No verification email logged");
    }
    if (status.suppressed) parts.push(`Suppressed: ${status.suppressionReason}`);
    if (status.lastError) parts.push(`Error: ${status.lastError}`);
    return parts.join(" · ");
  })();

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn("text-xs rounded-full px-2 py-1", tone)} title={detail}>{label}</button>
        </PopoverTrigger>
        <PopoverContent className="text-xs max-w-xs">{detail}</PopoverContent>
      </Popover>
      {!verified && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={busy}
          onClick={onResend}
        >
          {busy ? <InlineSpinner /> : <><Mail className="h-3 w-3 mr-1" /> Resend</>}
        </Button>
      )}
    </div>
  );
}

function AppsTab() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [urls, setUrls] = useState<{ resume?: string; certs?: string }>({});
  const { data } = useQuery({
    queryKey: ["admin-apps"],
    queryFn: async () => {
      const { data } = await db.from("trainer_applications").select("*, profiles:user_id(full_name, email)").eq("status", "pending").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, userId, app }: { id: string; status: "approved" | "rejected"; userId: string; app?: any }) => {
      const { error: e1 } = await db.from("trainer_applications").update({ status }).eq("id", id);
      if (e1) throw e1;
      if (status === "approved") {
        const { error: e2 } = await db.from("profiles").update({
          role: "trainer",
          institution_name: app?.institution_name ?? null,
          skills: app?.skills ?? [],
        }).eq("id", userId);
        if (e2) throw e2;
        notifyAppEvent({ data: { event: "application_approved", applicationId: id } }).catch((e) => console.error("notify failed", e));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-apps"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSelected(null);
      toast.success("Application updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const open = async (app: any) => {
    setSelected(app);
    const [r, c] = await Promise.all([
      getSignedUrl("trainer-credentials", app.resume_pdf_url),
      getSignedUrl("trainer-credentials", app.certifications_pdf_url),
    ]);
    setUrls({ resume: r ?? undefined, certs: c ?? undefined });
  };

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.length === 0 && <GlassCard className="md:col-span-2 lg:col-span-3 text-center py-8 text-muted-foreground">No pending applications.</GlassCard>}
        {data?.map((a) => (
          <GlassCard key={a.id} className="cursor-pointer hover:ring-2 hover:ring-primary/40" onClick={() => open(a)}>
            <div className="font-semibold">{a.profiles?.full_name ?? a.profiles?.email}</div>
            <div className="text-xs text-muted-foreground">{a.institution_name ?? "—"}</div>
            <div className="flex flex-wrap gap-1 mt-3">
              {(a.skills ?? []).slice(0, 3).map((s: string) => (
                <span key={s} className="text-xs glass rounded-full px-2 py-1">{s}</span>
              ))}
              {(a.skills?.length ?? 0) > 3 && (
                <span className="text-xs glass rounded-full px-2 py-1">…</span>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="bg-background/95 backdrop-blur-xl border-l border-white/10 w-full sm:max-w-lg max-h-screen overflow-y-auto pb-10">
          <SheetHeader><SheetTitle>{selected?.profiles?.full_name}</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3">
              <div className="text-sm">{selected.profiles?.email}</div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Institution</div>
                <p className="text-sm">{selected.institution_name ?? "—"}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Bio</div>
                <p className="text-sm">{selected.background ?? "—"}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {(selected.skills ?? []).map((s: string) => (
                    <span key={s} className="text-xs glass rounded-full px-2 py-1">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {urls.resume && <Button variant="outline" asChild><a href={urls.resume} target="_blank"><FileText className="h-4 w-4 mr-1" /> Resume</a></Button>}
                {urls.certs && <Button variant="outline" asChild><a href={urls.certs} target="_blank"><FileText className="h-4 w-4 mr-1" /> Certifications</a></Button>}
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1 rounded-2xl" onClick={() => decide.mutate({ id: selected.id, status: "approved", userId: selected.user_id, app: selected })}>Approve</Button>
                <Button variant="destructive" className="flex-1 rounded-2xl" onClick={() => decide.mutate({ id: selected.id, status: "rejected", userId: selected.user_id, app: selected })}>Reject</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

const PROJECT_TABS = ["open", "drafts", "closed", "claims", "archive"] as const;
type ProjectTab = typeof PROJECT_TABS[number];
const TAB_TO_DB: Record<ProjectTab, string[]> = {
  open: ["open", "awarded", "ongoing"],
  drafts: ["draft"],
  closed: ["closed"],
  claims: ["claims"],
  archive: ["archived"],
};

function ProjectsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ProjectTab>("open");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [drawerProject, setDrawerProject] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["admin-projects", status],
    queryFn: async () => {
      const { data } = await db
        .from("projects")
        .select("*, profiles:awarded_to(full_name, email)")
        .in("status", TAB_TO_DB[status] as any)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await db.from("projects").update({ status: next }).eq("id", id);
      if (error) throw error;
      if (next === "open") {
        notifyAppEvent({ data: { event: "project_opened", projectId: id } }).catch((e) => console.error("notify failed", e));
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-projects", status] }); toast.success("Project updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-projects", status] });
      toast.success("Project deleted");
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PillTabs value={status} onChange={setStatus} options={PROJECT_TABS.map((s) => ({ value: s, label: s }))} />
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="rounded-2xl"><Plus className="h-4 w-4 mr-1" />Create New Project</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.length === 0 && <GlassCard className="md:col-span-2 text-center py-8 text-muted-foreground">No {status} projects.</GlassCard>}
        {data?.map((p) => (
          <GlassCard
            key={p.id}
            className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
            onClick={() => setDrawerProject(p)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                {p.profiles && <div className="text-xs text-muted-foreground mt-1">Awarded: {p.profiles.full_name ?? p.profiles.email}</div>}
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="cursor-pointer focus:outline-none inline-flex items-center gap-1"
                      aria-label="Change status"
                    >
                      <Badge className="capitalize inline-flex items-center gap-1">
                        {p.status}
                        <ChevronDown className="h-3 w-3" />
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, next: "open" })}>
                      Set to Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, next: "draft" })}>
                      Set to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, next: "archived" })}>
                      Set to Archived
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg"
                  onClick={(e) => { e.stopPropagation(); setEditing(p); setFormOpen(true); }}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleting(p); }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{p.description}</p>
            <div className="text-sm mt-2 text-muted-foreground">
              RM {p.budget?.toLocaleString() ?? "—"} · Quota {p.quota ?? 1}
              {p.closing_date && <> · Closes {format(new Date(p.closing_date), "PP")}</>}
            </div>
          </GlassCard>
        ))}
      </div>
      <ProjectForm
        open={formOpen}
        project={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-projects", status] })}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be permanently removed along with related data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AdminProjectDrawer
        project={drawerProject}
        onClose={() => setDrawerProject(null)}
        onEdit={(p) => { setEditing(p); setFormOpen(true); setDrawerProject(null); }}
        onDelete={(p) => { setDeleting(p); setDrawerProject(null); }}
        onStatusChange={(id, next) => updateStatus.mutate({ id, next })}
        statusKey={status}
      />
    </div>
  );
}

function ClosedActions({ projectId, onApprove }: { projectId: string; onApprove: () => void }) {
  const { data: report } = useQuery({
    queryKey: ["report", projectId],
    queryFn: async () => {
      const { data } = await db.from("project_reports").select("*").eq("project_id", projectId).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  return (
    <>
      {report?.report_pdf_url && (
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={async () => {
            const url = await getSignedUrl("project-reports", report.report_pdf_url);
            if (url) window.open(url, "_blank");
          }}
        >
          <FileText className="h-4 w-4 mr-1" /> Report
        </Button>
      )}
      <Button size="sm" className="rounded-xl" onClick={onApprove}>Approve & Move to Claims</Button>
    </>
  );
}

const PROPOSAL_FILTER = ["all", "submitted", "accepted", "rejected"] as const;
type ProposalFilter = typeof PROPOSAL_FILTER[number];

function AdminProjectDrawer({
  project,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  statusKey,
}: {
  project: any | null;
  onClose: () => void;
  onEdit: (p: any) => void;
  onDelete: (p: any) => void;
  onStatusChange: (id: string, next: string) => void;
  statusKey: string;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"details" | "proposals">("details");
  const [pfilter, setPfilter] = useState<ProposalFilter>("all");

  useEffect(() => { if (project) { setTab("details"); setPfilter("all"); } }, [project?.id]);

  const { data: detailsUrl } = useQuery({
    queryKey: ["admin-signed-details", project?.id, project?.details_pdf_url],
    enabled: !!project?.details_pdf_url,
    queryFn: () => getSignedUrl("project-details", project!.details_pdf_url!),
  });

  const { data: proposals } = useQuery({
    queryKey: ["admin-proposals", project?.id],
    enabled: !!project,
    queryFn: async () => {
      const { data } = await db.from("proposals")
        .select("*, profiles:trainer_id(full_name, email)")
        .eq("project_id", project!.id)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const { data: report } = useQuery({
    queryKey: ["admin-report", project?.id],
    enabled: !!project && project?.status === "closed",
    queryFn: async () => {
      const { data } = await db.from("project_reports").select("*").eq("project_id", project!.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const accept = useMutation({
    mutationFn: async (proposalId: string) => {
      const list = proposals ?? [];
      const p = list.find((x) => x.id === proposalId);
      if (!p || !project) return;
      const acceptedCount = list.filter((x) => x.status === "accepted").length;
      const quota = project.quota ?? 1;
      if (acceptedCount >= quota) throw new Error("Quota reached — cannot accept more proposals");
      const { error: e1 } = await db.from("proposals").update({ status: "accepted" }).eq("id", proposalId);
      if (e1) throw e1;
      notifyAppEvent({ data: { event: "proposal_decided", proposalId, decision: "accepted" } }).catch((e) => console.error("notify failed", e));
      const newAccepted = acceptedCount + 1;
      if (newAccepted >= quota) {
        const { data: autoRejected, error: e2 } = await db
          .from("proposals")
          .update({ status: "rejected" })
          .eq("project_id", project.id)
          .eq("status", "submitted")
          .select("id");
        if (e2) throw e2;
        for (const r of autoRejected ?? []) {
          notifyAppEvent({ data: { event: "proposal_decided", proposalId: r.id, decision: "rejected" } }).catch((e) => console.error("notify failed", e));
        }
        const { error: e3 } = await db.from("projects").update({ status: "awarded", awarded_to: p.trainer_id }).eq("id", project.id);
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      toast.success("Proposal accepted");
      qc.invalidateQueries({ queryKey: ["admin-proposals", project?.id] });
      qc.invalidateQueries({ queryKey: ["admin-projects", statusKey] });
      qc.invalidateQueries({ queryKey: ["projects-public"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await db.from("proposals").update({ status: "rejected" }).eq("id", proposalId);
      if (error) throw error;
      notifyAppEvent({ data: { event: "proposal_decided", proposalId, decision: "rejected" } }).catch((e) => console.error("notify failed", e));
    },
    onSuccess: () => {
      toast.success("Proposal rejected");
      qc.invalidateQueries({ queryKey: ["admin-proposals", project?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!project) return null;

  const filtered = (proposals ?? []).filter((p) => pfilter === "all" ? true : p.status === pfilter);
  const acceptedCount = (proposals ?? []).filter((p) => p.status === "accepted").length;
  const quota = project.quota ?? 1;

  return (
    <Sheet open={!!project} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-background/95 backdrop-blur-xl border-l border-white/10 w-full sm:max-w-xl max-h-screen overflow-y-auto pb-10">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2 pr-8">
            <SheetTitle className="flex-1">{project.title}</SheetTitle>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => onEdit(project)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => onDelete(project)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="glass mt-4 inline-flex rounded-full p-1">
          {(["details", "proposals"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
            >
              {t}{t === "proposals" && proposals ? ` (${proposals.length})` : ""}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="mt-4 space-y-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer focus:outline-none inline-flex items-center"
                  aria-label="Change status"
                >
                  <Badge className="capitalize inline-flex items-center gap-1">
                    {project.status}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onStatusChange(project.id, "open")}>Set to Open</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(project.id, "draft")}>Set to Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(project.id, "closed")}>Set to Closed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(project.id, "archived")}>Set to Archived</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <div className="font-semibold">{quota} ({acceptedCount} accepted)</div>
              </div>
              {project.profiles && (
                <div className="glass rounded-2xl p-3">
                  <div className="text-muted-foreground">Awarded To</div>
                  <div className="font-semibold">{project.profiles.full_name ?? project.profiles.email}</div>
                </div>
              )}
            </div>

            {project.details_pdf_url && (
              <Button
                variant="outline"
                className="w-full rounded-2xl"
                disabled={!detailsUrl}
                onClick={() => detailsUrl && window.open(detailsUrl, "_blank")}
              >
                <FileText className="h-4 w-4 mr-2" />
                {detailsUrl ? "View Project Details PDF" : "Loading PDF…"}
              </Button>
            )}

            {project.status === "closed" && (
              <div className="space-y-2">
                {report?.report_pdf_url && (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={async () => {
                      const url = await getSignedUrl("project-reports", report.report_pdf_url);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" /> View Report
                  </Button>
                )}
                <Button className="w-full rounded-2xl" onClick={() => onStatusChange(project.id, "claims")}>
                  Approve & Move to Claims
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "proposals" && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Filter:</Label>
              <Select value={pfilter} onValueChange={(v) => setPfilter(v as ProposalFilter)}>
                <SelectTrigger className="w-40 h-8 rounded-xl bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPOSAL_FILTER.map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No proposals.</p>}
            {filtered.map((p) => (
              <GlassCard key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.profiles?.full_name ?? p.profiles?.email}</div>
                    {p.attempt_number > 1 && (
                      <div className="text-xs text-yellow-300/90">Resubmission · attempt {p.attempt_number}</div>
                    )}
                    <div className="text-sm text-muted-foreground">RM {Number(p.bid_amount).toLocaleString()}</div>
                  </div>
                  <Badge>{p.status}</Badge>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Proposed Program/ Project:</div>
                  {p.pitch}
                </div>
                {p.proposal_pdf_url && (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={async () => {
                      const url = await getSignedUrl("project-proposals", p.proposal_pdf_url);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" /> View PDF
                  </Button>
                )}
                {project.status === "open" && p.status === "submitted" && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl"
                      disabled={accept.isPending || acceptedCount >= quota}
                      onClick={() => accept.mutate(p.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(p.id)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProjectForm({ open, project, onClose, onSaved }: { open: boolean; project: any | null; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const isEdit = !!project;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [quota, setQuota] = useState("1");
  const [closingDate, setClosingDate] = useState<Date | undefined>(undefined);
  const [pdf, setPdf] = useState<File | null>(null);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    if (project) {
      setTitle(project.title ?? "");
      setDesc(project.description ?? "");
      setBudget(project.budget != null ? String(project.budget) : "");
      setQuota(project.quota != null ? String(project.quota) : "1");
      setClosingDate(project.closing_date ? new Date(project.closing_date) : undefined);
      setExistingPdf(project.details_pdf_url ?? null);
    } else {
      setTitle(""); setDesc(""); setBudget(""); setQuota("1"); setClosingDate(undefined); setExistingPdf(null);
    }
    setPdf(null);
  }, [open, project]);

  const save = async (nextStatus: "draft" | "open") => {
    if (!title.trim()) return toast.error("Title is required");
    if (!closingDate) return toast.error("Closing date is required");
    const quotaNum = Number(quota);
    if (!Number.isInteger(quotaNum) || quotaNum < 1) return toast.error("Quota must be at least 1");
    if (closingDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) return toast.error("Closing date cannot be in the past");

    setBusy(true);
    try {
      let detailsPath: string | null = existingPdf;
      if (pdf) {
        detailsPath = await uploadPdf("project-details", profile!.id, pdf, "details-");
      }
      const payload: any = {
        title,
        description: desc,
        budget: budget ? Number(budget) : null,
        quota: quotaNum,
        closing_date: closingDate.toISOString(),
        details_pdf_url: detailsPath,
      };
      if (isEdit) {
        const { error } = await db.from("projects").update(payload).eq("id", project.id);
        if (error) throw error;
        toast.success("Project updated");
      } else {
        const { data: created, error } = await db
          .from("projects")
          .insert({ ...payload, status: nextStatus, created_by: profile!.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success(nextStatus === "draft" ? "Saved as draft" : "Published");
        if (nextStatus === "open" && created?.id) {
          notifyAppEvent({ data: { event: "project_opened", projectId: created.id } }).catch((e) => console.error("notify failed", e));
        }
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl bg-white/5" /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="rounded-2xl bg-white/5" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Budget (RM)</Label><Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="rounded-2xl bg-white/5" /></div>
            <div><Label>Quota *</Label><Input type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} className="rounded-2xl bg-white/5" /></div>
          </div>
          <div>
            <Label>Closing Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal rounded-2xl bg-white/5", !closingDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closingDate ? format(closingDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={closingDate}
                  onSelect={setClosingDate}
                  initialFocus
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <PdfDropZone label={existingPdf ? "Replace Project Details PDF (optional)" : "Project Details PDF (optional)"} file={pdf} onFile={setPdf} />
          {existingPdf && !pdf && (
            <p className="text-xs text-muted-foreground">A details PDF is already attached. Upload a new one to replace it.</p>
          )}
          <div className="flex gap-2 pt-2">
            {isEdit ? (
              <Button onClick={() => save("open")} disabled={busy} className="flex-1 rounded-2xl">{busy && <InlineSpinner />}{busy ? "Saving…" : "Save Changes"}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => save("draft")} disabled={busy} className="flex-1 rounded-2xl">Save Draft</Button>
                <Button onClick={() => save("open")} disabled={busy} className="flex-1 rounded-2xl">Publish</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}