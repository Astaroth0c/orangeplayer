"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Star,
  Lock,
  ShieldCheck,
  Baby,
  Loader2,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useGridNavigation } from "@/hooks/use-spatial-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProfileDTO } from "@/types";

export function ProfilesView() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const gridRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const profilesQuery = useQuery<ProfileDTO[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const r = await fetch("/api/profiles");
      const j = await r.json();
      return (j.profiles as ProfileDTO[]) || [];
    },
  });

  useGridNavigation(gridRef);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["profiles"] });

  const createProfile = useMutation({
    mutationFn: async (name: string) => {
      const r = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao criar perfil.");
      return j.profile as ProfileDTO;
    },
    onSuccess: () => {
      invalidate();
      toast("Perfil criado.");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao criar perfil."),
  });

  const updateProfile = useMutation({
    mutationFn: async (vars: { id: string; name?: string; isDefault?: boolean; isKid?: boolean }) => {
      const r = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao atualizar perfil.");
      return j.profile as ProfileDTO;
    },
    onSuccess: (updated) => {
      invalidate();
      // If the current profile was updated, reflect in store.
      const current = useAppStore.getState().profile;
      if (current && current.id === updated.id) {
        setProfile({
          ...current,
          name: updated.name,
          isDefault: updated.isDefault,
          isKid: updated.isKid,
        });
      }
      // If a different profile became default, the current default flag is now false.
      if (profile && updated.isDefault && profile.id !== updated.id) {
        setProfile({ ...profile, isDefault: false });
      }
      toast("Perfil atualizado.");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao atualizar perfil."),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/profiles?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao excluir perfil.");
      return j;
    },
    onSuccess: () => {
      invalidate();
      toast("Perfil excluído.");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao excluir perfil."),
  });

  const setPin = useMutation({
    mutationFn: async (vars: { id: string; pin: string }) => {
      const r = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vars.id, pin: vars.pin }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao definir PIN.");
      return j.profile as ProfileDTO;
    },
    onSuccess: () => {
      invalidate();
      toast("PIN definido.");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao definir PIN."),
  });

  const clearPin = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, clearPin: true }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao remover PIN.");
      return j.profile as ProfileDTO;
    },
    onSuccess: () => {
      invalidate();
      toast("PIN removido.");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Erro ao remover PIN."),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<ProfileDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [pinTarget, setPinTarget] = useState<ProfileDTO | null>(null);
  const [pinDraft, setPinDraft] = useState("");
  const [showPin, setShowPin] = useState(false);

  const openCreate = () => {
    setNewName("");
    setCreateOpen(true);
  };
  const closeCreate = () => {
    setCreateOpen(false);
    setNewName("");
  };
  const openEdit = (p: ProfileDTO) => {
    setEditName(p.name);
    setEditing(p);
  };
  const closeEdit = () => {
    setEditing(null);
    setEditName("");
  };
  const openPin = (p: ProfileDTO) => {
    setPinDraft("");
    setPinTarget(p);
  };
  const closePin = () => {
    setPinTarget(null);
    setPinDraft("");
  };

  const profiles = profilesQuery.data ?? [];
  const loading = profilesQuery.isLoading;

  return (
    <div className="min-h-screen px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl glass-card grid place-items-center">
            <Users className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Perfis
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Crie e gerencie perfis para cada pessoa na casa.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          data-focusable
          size="default"
          className="bg-brand text-graphite hover:bg-brand-light"
        >
          <Plus className="w-4 h-4" />
          Criar novo perfil
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12"
        >
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              isCurrent={profile?.id === p.id}
              onRename={() => openEdit(p)}
              onMakeDefault={() => updateProfile.mutate({ id: p.id, isDefault: true })}
              onSetPin={() => openPin(p)}
              onClearPin={() => clearPin.mutate(p.id)}
              onDelete={() => deleteProfile.mutate(p.id)}
              pendingDefault={updateProfile.isPending}
              pendingDelete={deleteProfile.isPending}
              pendingPin={clearPin.isPending || setPin.isPending}
            />
          ))}

          <CreateProfileCard onClick={openCreate} />
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => (o ? openCreate() : closeCreate())}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle>Novo perfil</DialogTitle>
            <DialogDescription>
              Crie um perfil com nome. Você poderá ajustar PIN, controle parental e mais depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="np-name">Nome</Label>
            <Input
              id="np-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 60))}
              placeholder="Ex.: Sala, Quarto, Crianças..."
              data-focusable
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  createProfile.mutate(newName.trim());
                  closeCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" data-focusable>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              data-focusable
              disabled={!newName.trim() || createProfile.isPending}
              onClick={() => {
                if (!newName.trim()) return;
                createProfile.mutate(newName.trim());
                closeCreate();
              }}
            >
              {createProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Altere o nome do perfil. As preferências e o histórico não são afetados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ep-name">Nome</Label>
            <Input
              id="ep-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 60))}
              data-focusable
              onKeyDown={(e) => {
                if (e.key === "Enter" && editName.trim() && editing) {
                  updateProfile.mutate({ id: editing.id, name: editName.trim() });
                  closeEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" data-focusable>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              data-focusable
              disabled={!editName.trim() || updateProfile.isPending}
              onClick={() => {
                if (!editing || !editName.trim()) return;
                updateProfile.mutate({ id: editing.id, name: editName.trim() });
                closeEdit();
              }}
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN dialog */}
      <Dialog open={!!pinTarget} onOpenChange={(o) => !o && closePin()}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle>Definir PIN</DialogTitle>
            <DialogDescription>
              Use 4 a 8 dígitos numéricos. O PIN será exigido para conteúdos restritos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pin-input">PIN</Label>
            <div className="relative">
              <Input
                id="pin-input"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                value={pinDraft}
                onChange={(e) =>
                  setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="••••"
                data-focusable
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    pinDraft.length >= 4 &&
                    pinTarget
                  ) {
                    setPin.mutate({ id: pinTarget.id, pin: pinDraft });
                    closePin();
                  }
                }}
              />
              <button
                type="button"
                data-focusable
                onClick={() => setShowPin((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-muted-foreground hover:text-foreground"
                aria-label={showPin ? "Ocultar" : "Exibir"}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinDraft.length > 0 && pinDraft.length < 4 && (
              <p className="text-xs text-muted-foreground">
                Mínimo de 4 dígitos.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" data-focusable>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              data-focusable
              disabled={pinDraft.length < 4 || setPin.isPending}
              onClick={() => {
                if (!pinTarget || pinDraft.length < 4) return;
                setPin.mutate({ id: pinTarget.id, pin: pinDraft });
                closePin();
              }}
            >
              {setPin.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Definir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileCard({
  profile,
  isCurrent,
  onRename,
  onMakeDefault,
  onSetPin,
  onClearPin,
  onDelete,
  pendingDefault,
  pendingDelete,
  pendingPin,
}: {
  profile: ProfileDTO;
  isCurrent: boolean;
  onRename: () => void;
  onMakeDefault: () => void;
  onSetPin: () => void;
  onClearPin: () => void;
  onDelete: () => void;
  pendingDefault: boolean;
  pendingDelete: boolean;
  pendingPin: boolean;
}) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "?";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "glass-card rounded-2xl p-5 flex flex-col gap-4",
        isCurrent && "border-brand/60 brand-glow-soft",
      )}
    >
      {/* Avatar */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-14 h-14 rounded-full grid place-items-center text-xl font-bold shrink-0",
            isCurrent
              ? "bg-brand text-graphite border-2 border-brand-light"
              : "bg-gradient-to-br from-surface to-graphite text-brand border border-white/10",
          )}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold tracking-tight truncate">
            {profile.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isCurrent && (
              <Badge className="bg-brand/15 text-brand border border-brand/30">
                Atual
              </Badge>
            )}
            {profile.isDefault && (
              <Badge
                variant="outline"
                className="border-brand/40 text-brand gap-1"
              >
                <Star className="w-3 h-3 fill-current" />
                Padrão
              </Badge>
            )}
            {profile.isKid && (
              <Badge
                variant="outline"
                className="border-sky-500/40 text-sky-300 gap-1"
              >
                <Baby className="w-3 h-3" />
                Kid
              </Badge>
            )}
            {profile.hasPin && (
              <Badge
                variant="outline"
                className="border-white/15 text-muted-foreground gap-1"
              >
                <Lock className="w-3 h-3" />
                PIN
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-auto">
        <Button
          size="sm"
          variant="ghost"
          onClick={onRename}
          data-focusable
          className="glass border border-white/10 hover:border-brand/40"
        >
          <Edit className="w-3.5 h-3.5" />
          Editar
        </Button>

        {!profile.isDefault && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onMakeDefault}
            disabled={pendingDefault}
            data-focusable
            className="glass border border-white/10 hover:border-brand/40"
          >
            {pendingDefault ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Star className="w-3.5 h-3.5" />
            )}
            Tornar padrão
          </Button>
        )}

        {profile.hasPin ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearPin}
            disabled={pendingPin}
            data-focusable
            className="glass border border-white/10 hover:border-brand/40"
          >
            {pendingPin ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            Remover PIN
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSetPin}
            disabled={pendingPin}
            data-focusable
            className="glass border border-white/10 hover:border-brand/40"
          >
            {pendingPin ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            Definir PIN
          </Button>
        )}

        {!profile.isDefault && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={pendingDelete}
                data-focusable
                className="glass border border-white/10 text-muted-foreground hover:text-destructive hover:border-destructive/40"
              >
                {pendingDelete ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
                <AlertDialogDescription>
                  O perfil <strong>{profile.name}</strong> e todos os seus
                  dados (favoritos, histórico, ajustes) serão removidos
                  permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-focusable>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  data-focusable
                  onClick={onDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </motion.div>
  );
}

function CreateProfileCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      data-focusable
      onClick={onClick}
      className={cn(
        "glass-card rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[180px]",
        "border-dashed border-2 border-white/15 hover:border-brand/60 hover:text-brand transition card-lift",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-graphite",
      )}
    >
      <div className="w-14 h-14 rounded-full glass grid place-items-center text-brand">
        <Plus className="w-7 h-7" />
      </div>
      <div className="text-sm font-medium">Criar novo perfil</div>
    </motion.button>
  );
}
