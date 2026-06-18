import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2 } from "lucide-react";
import { InlineSpinner } from "@/components/GlassSpinner";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: AnnouncementsPage,
});

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  target: string;
  created_at: string;
  author_id: string | null;
  author: { full_name: string | null } | null;
};

function AnnouncementsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const isAdmin = profile?.role === "admin";

  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await db
        .from("announcements")
        .select("*, author:profiles!announcements_author_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      return ((data as any[]) ?? []) as AnnouncementRow[];
    },
  });

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setTitle(""); setBody(""); setTarget("all");
    setComposerOpen(true);
  };

  const openEdit = (a: AnnouncementRow) => {
    setEditing(a);
    setTitle(a.title); setBody(a.body); setTarget(a.target);
    setComposerOpen(true);
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    setBusy(true);
    try {
      if (editing) {
        const { error } = await db
          .from("announcements")
          .update({ title, body, target })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Announcement updated");
      } else {
        const { error } = await db
          .from("announcements")
          .insert({ title, body, target, author_id: profile!.id });
        if (error) throw error;
        toast.success("Announcement broadcast");
      }
      setComposerOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await db.from("announcements").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Megaphone className="h-7 w-7 text-primary" /> Announcements</h1>
          <p className="text-muted-foreground">Updates from TVET Melaka administrators</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="rounded-full">
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {data?.length === 0 && <GlassCard className="text-center py-8 text-muted-foreground">No announcements.</GlassCard>}
        {data?.map((a) => (
          <GlassCard key={a.id}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-lg">{a.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs glass rounded-full px-2 py-1 capitalize">{a.target}</span>
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(a)}
                      aria-label="Edit announcement"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {a.author_id === profile?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(a.id)}
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{a.body}</p>
            <p className="text-xs text-muted-foreground mt-3">
              {new Date(a.created_at).toLocaleString()} · Posted by {a.author?.full_name ?? "Admin"}
            </p>
          </GlassCard>
        ))}
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl bg-white/5" /></div>
            <div><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="rounded-2xl bg-white/5" rows={4} /></div>
            <div>
              <Label>Target audience</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="rounded-2xl bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="trainers">Trainers Only</SelectItem>
                  <SelectItem value="admins">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={busy} className="rounded-2xl w-full">
              {busy && <InlineSpinner />}
              {busy ? (editing ? "Saving…" : "Broadcasting…") : editing ? "Save changes" : "Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}