import { useEffect, useState, useCallback, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/api/axios";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Send,
  Clock,
  Users,
  MessageSquare,
  Globe,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Upload,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Link,
  Search,
  UserCheck,
  Pencil,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type BroadcastStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
type TargetType = "CHAT" | "TAG" | "ALL_USERS" | "SPECIFIC_USERS";
type MediaType = "image" | "video" | "document" | "audio";

interface InlineButton {
  text: string;
  url: string;
}

interface MediaItem {
  url: string;
  type: MediaType;
  name?: string; // для отображения имени загруженного файла
}

interface TargetUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

interface Broadcast {
  id: string;
  title: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  buttons: InlineButton[];
  targetType: TargetType;
  status: BroadcastStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  targetTags: Array<{ id: string; name: string }>;
  targetChats: Array<{ id: string; title: string }>;
  targetUsers: TargetUser[];
  recipientsCount: number;
  createdBy: { name: string };
}

interface BroadcastRecipient {
  id: string;
  sentAt: string | null;
  error: string | null;
  user: {
    id: string;
    telegramId: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  };
}

interface BroadcastDetail extends Broadcast {
  recipients: BroadcastRecipient[];
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Chat {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
}

interface FormState {
  title: string;
  content: string;
  mediaItems: MediaItem[];
  buttons: InlineButton[];
  targetType: TargetType;
  tagIds: string[];
  chatIds: string[];
  userIds: string[];
  scheduledAt: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  mediaItems: [],
  buttons: [],
  targetType: "ALL_USERS",
  tagIds: [],
  chatIds: [],
  userIds: [],
  scheduledAt: "",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<BroadcastStatus, string> = {
  DRAFT: "Черновик",
  SCHEDULED: "Запланировано",
  SENDING: "Отправляется",
  SENT: "Отправлено",
  FAILED: "Ошибка",
};

const STATUS_VARIANTS: Record<BroadcastStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  SCHEDULED: "outline",
  SENDING: "secondary",
  SENT: "default",
  FAILED: "destructive",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mimeToMediaType(mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function mediaTypeIcon(type: MediaType) {
  switch (type) {
    case "image":    return <FileImage className="h-4 w-4 text-blue-500" />;
    case "video":    return <FileVideo className="h-4 w-4 text-purple-500" />;
    case "audio":    return <FileAudio className="h-4 w-4 text-green-500" />;
    default:         return <File className="h-4 w-4 text-orange-500" />;
  }
}

// ── File upload helper ───────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const apiUrl = import.meta.env.VITE_API_URL ?? "";
  const base = apiUrl.startsWith("http")
    ? apiUrl.replace(/\/api$/, "")
    : window.location.origin;
  return base + res.data.data.url;
}

// ── MDEditor with paste/drop upload ─────────────────────────────────────────

function MDEditorWithUpload({
  value,
  onChange,
  height = 200,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      setUploading(true);
      try {
        const url = await uploadFile(files[0]);
        const ext = files[0].name.split(".").pop()?.toLowerCase() ?? "";
        const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
        const md = isImage ? `![](${url})` : `[${files[0].name}](${url})`;
        onChange(value + (value ? "\n" : "") + md);
        toast.success("Файл загружен");
      } catch (err: any) {
        toast.error(err.response?.data?.error?.message ?? "Ошибка загрузки файла");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) { e.preventDefault(); handleFiles(files); }
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) { e.preventDefault(); handleFiles(files); }
    },
    [handleFiles],
  );

  return (
    <div ref={editorRef} className="relative" data-color-mode="light" onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        preview="edit"
        height={height}
        textareaProps={{ placeholder: "**жирный** _курсив_ `код`  [текст](ссылка)\n\nВставьте или перетащите изображение" }}
      />
      {uploading && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-md text-sm text-muted-foreground">
          Загрузка...
        </div>
      )}
    </div>
  );
}

// ── Media drop zone ──────────────────────────────────────────────────────────

function MediaDropZone({
  items,
  onChange,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFiles = async (files: FileList) => {
    const remaining = 10 - items.length;
    if (remaining <= 0) { toast.error("Максимум 10 файлов"); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const results = await Promise.all(
        toUpload.map(async (file) => {
          const url = await uploadFile(file);
          return { url, type: mimeToMediaType(file.type), name: file.name } as MediaItem;
        }),
      );
      onChange([...items, ...results]);
      toast.success(results.length === 1 ? "Файл загружен" : `Загружено ${results.length} файлов`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const addByUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const type: MediaType = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
      ? "image"
      : /\.(mp4|mov|avi|webm)$/i.test(url)
        ? "video"
        : /\.(mp3|ogg|m4a|wav)$/i.test(url)
          ? "audio"
          : "document";
    onChange([...items, { url, type }]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {items.length < 10 && (
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors select-none
            ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"}
            ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {uploading ? "Загрузка..." : "Перетащите файлы или нажмите для выбора"}
          </p>
          <p className="text-xs text-muted-foreground/60">Фото, видео, документы, аудио · до 10 файлов</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="hidden"
            onChange={(e) => { if (e.target.files) { handleFiles(e.target.files); e.target.value = ""; } }}
          />
        </div>
      )}

      {/* Uploaded items */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/20">
              <Select
                value={item.type}
                onValueChange={(v) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], type: v as MediaType };
                  onChange(next);
                }}
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <div className="flex items-center gap-1.5">
                    {mediaTypeIcon(item.type)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Фото</SelectItem>
                  <SelectItem value="video">Видео</SelectItem>
                  <SelectItem value="document">Документ</SelectItem>
                  <SelectItem value="audio">Аудио</SelectItem>
                </SelectContent>
              </Select>
              <span className="flex-1 text-xs text-muted-foreground truncate">
                {item.name || item.url}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => remove(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add by URL */}
      <div className="flex items-center gap-2">
        {showUrlInput ? (
          <>
            <Input
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addByUrl())}
              className="h-8 text-sm flex-1"
              autoFocus
            />
            <Button type="button" size="sm" className="h-8" onClick={addByUrl} disabled={!urlInput.trim()}>
              Добавить
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setShowUrlInput(false); setUrlInput(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setShowUrlInput(true)}
          >
            <Link className="h-3.5 w-3.5 mr-1" />
            Добавить по URL
          </Button>
        )}
      </div>

      {/* Warnings */}
      {items.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Фото/видео отправятся как альбом. Текст — подпись к первому файлу.
          {items.some((m) => m.type !== "image" && m.type !== "video") &&
            " Документы и аудио — отдельными сообщениями."}
        </p>
      )}
    </div>
  );
}

// ── Telegram preview ─────────────────────────────────────────────────────────

function TelegramPreview({
  content,
  buttons,
  mediaItem,
}: {
  content: string;
  buttons: InlineButton[];
  mediaItem?: MediaItem;
}) {
  return (
    <div className="min-h-[120px] rounded-md border bg-[#e5ddd5] p-4 flex justify-end" data-color-mode="light">
      <div className="max-w-[85%] bg-white rounded-2xl rounded-tr-sm shadow-sm overflow-hidden">
        {mediaItem && (
          <div className="bg-muted px-3 py-2 text-xs text-muted-foreground border-b flex items-center gap-1.5">
            {mediaTypeIcon(mediaItem.type)}
            <span className="truncate">{mediaItem.name || (mediaItem.url.length > 40 ? mediaItem.url.slice(0, 40) + "..." : mediaItem.url)}</span>
          </div>
        )}
        <div className="px-3 py-2 text-sm">
          {content.trim() ? (
            <MDEditor.Markdown source={content} style={{ background: "transparent", fontSize: 14 }} />
          ) : (
            <span className="text-muted-foreground italic text-xs">Пустое сообщение...</span>
          )}
        </div>
        {buttons.filter((b) => b.text && b.url).length > 0 && (
          <div className="border-t divide-y">
            {buttons.filter((b) => b.text && b.url).map((btn, i) => (
              <div key={i} className="px-3 py-1.5 text-xs text-center text-[#2481cc]">
                {btn.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Target badge ─────────────────────────────────────────────────────────────

function TargetBadge({ broadcast }: { broadcast: Broadcast }) {
  if (broadcast.targetType === "ALL_USERS") {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        <span>Все сотрудники</span>
      </div>
    );
  }
  if (broadcast.targetType === "TAG") {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Tag className="h-3.5 w-3.5" />
        <span>{broadcast.targetTags.map((t) => t.name).join(", ") || "—"}</span>
      </div>
    );
  }
  if (broadcast.targetType === "SPECIFIC_USERS") {
    const users = broadcast.targetUsers ?? [];
    const label = users.length === 0
      ? "—"
      : users.slice(0, 2).map((u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "?").join(", ")
        + (users.length > 2 ? ` +${users.length - 2}` : "");
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <UserCheck className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <MessageSquare className="h-3.5 w-3.5" />
      <span>{broadcast.targetChats.length > 0 ? broadcast.targetChats.map((c) => c.title).join(", ") : "—"}</span>
    </div>
  );
}

// ── Buttons editor ────────────────────────────────────────────────────────────

function ButtonsEditor({ buttons, onChange }: { buttons: InlineButton[]; onChange: (btns: InlineButton[]) => void }) {
  const add = () => onChange([...buttons, { text: "", url: "" }]);
  const remove = (i: number) => onChange(buttons.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof InlineButton, value: string) => {
    const next = [...buttons];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {buttons.map((btn, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input placeholder="Текст кнопки" value={btn.text} onChange={(e) => update(i, "text", e.target.value)} />
            <Input placeholder="https://..." value={btn.url} onChange={(e) => update(i, "url", e.target.value)} />
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(i)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" />
        Добавить кнопку
      </Button>
    </div>
  );
}

// ── Checkbox list ─────────────────────────────────────────────────────────────

function CheckboxList<T extends { id: string; name?: string; title?: string }>({
  items,
  selected,
  onToggle,
  renderLabel,
}: {
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  renderLabel: (item: T) => React.ReactNode;
}) {
  return (
    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Нет доступных</p>}
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
          <input type="checkbox" className="h-4 w-4" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
          <span className="text-sm">{renderLabel(item)}</span>
        </label>
      ))}
    </div>
  );
}

// ── Recipient row ────────────────────────────────────────────────────────────

function RecipientRow({ r }: { r: BroadcastRecipient }) {
  const [expanded, setExpanded] = useState(false);
  const userName = [r.user.firstName, r.user.lastName].filter(Boolean).join(" ")
    || `ID: ${r.user.telegramId}`;

  return (
    <div className={`px-3 py-2 ${r.error && expanded ? "bg-destructive/5" : ""}`}>
      <div className="flex items-center gap-3">
        {r.error ? (
          <XCircle className="h-4 w-4 text-destructive shrink-0" />
        ) : r.sentAt ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userName}</p>
          {r.user.username && <p className="text-xs text-muted-foreground">@{r.user.username}</p>}
        </div>
        <div className="text-right shrink-0">
          {r.error ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <span>{expanded ? "Скрыть" : "Ошибка"}</span>
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          ) : r.sentAt ? (
            <p className="text-xs text-muted-foreground">{formatDate(r.sentAt)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Ожидает</p>
          )}
        </div>
      </div>
      {r.error && expanded && (
        <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive font-mono break-all whitespace-pre-wrap">{r.error}</p>
        </div>
      )}
    </div>
  );
}

// ── User picker ──────────────────────────────────────────────────────────────

interface UserOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

function UserPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30", page: "1" });
      if (q) params.set("search", q);
      const res = await api.get(`/users?${params}`);
      setResults(res.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doSearch("");
  }, []);

  const onSearchChange = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const userName = (u: UserOption) => {
    const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
    if (full) return full;
    if (u.username) return `@${u.username}`;
    return `ID: ${u.id.slice(0, 8)}`;
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или @username..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-3">Загрузка...</p>
        )}
        {!loading && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">Не найдено</p>
        )}
        {results.map((u) => (
          <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              checked={selected.includes(u.id)}
              onChange={() => toggle(u.id)}
            />
            <span className="text-sm flex-1">{userName(u)}</span>
            {u.username && <span className="text-xs text-muted-foreground">@{u.username}</span>}
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">Выбрано: {selected.length}</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BroadcastStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const [tags, setTags] = useState<Tag[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);

  const [detailBroadcast, setDetailBroadcast] = useState<BroadcastDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBroadcasts = useCallback(
    async (p = page, filter = statusFilter) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(p), limit: "12" });
        if (filter !== "ALL") params.set("status", filter);
        const res = await api.get(`/broadcasts?${params}`);
        setBroadcasts(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      } catch {
        toast.error("Ошибка загрузки рассылок");
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter],
  );

  const fetchRefData = async () => {
    const [tagsRes, chatsRes] = await Promise.all([api.get("/tags"), api.get("/chats?isActive=true")]);
    setTags(tagsRes.data.data);
    setChats(chatsRes.data.data);
  };

  useEffect(() => { fetchBroadcasts(1, statusFilter); setPage(1); }, [statusFilter]);
  useEffect(() => { fetchBroadcasts(page, statusFilter); }, [page]);

  const onOpenCreate = () => { fetchRefData(); setForm(EMPTY_FORM); setActiveTab("edit"); setEditingId(null); setIsCreateOpen(true); };

  const onOpenEdit = async (b: Broadcast) => {
    fetchRefData();
    setActiveTab("edit");
    setEditingId(b.id);
    try {
      const res = await api.get(`/broadcasts/${b.id}`);
      const detail = res.data.data;
      setForm({
        title: detail.title ?? "",
        content: detail.content,
        mediaItems: detail.mediaItems ?? [],
        buttons: detail.buttons ?? [],
        targetType: detail.targetType,
        tagIds: detail.targetTags.map((t: any) => t.id),
        chatIds: detail.targetChats.map((c: any) => c.id),
        userIds: (detail.targetUsers ?? []).map((u: any) => u.id),
        scheduledAt: detail.scheduledAt ? new Date(detail.scheduledAt).toISOString().slice(0, 16) : "",
      });
      setIsCreateOpen(true);
    } catch {
      toast.error("Ошибка загрузки рассылки");
      setEditingId(null);
    }
  };

  // ── Form ───────────────────────────────────────────────────────────────────

  const toggleId = (field: "tagIds" | "chatIds", id: string) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter((x) => x !== id) : [...f[field], id],
    }));
  };

  const buildPayload = (sendNow: boolean) => ({
    title: form.title || undefined,
    content: form.content,
    mediaItems: form.mediaItems.length > 0 ? form.mediaItems : undefined,
    buttons: form.buttons.filter((b) => b.text && b.url),
    targetType: form.targetType,
    tagIds: form.targetType === "TAG" ? form.tagIds : undefined,
    chatIds: form.targetType === "CHAT" ? form.chatIds : undefined,
    userIds: form.targetType === "SPECIFIC_USERS" ? form.userIds : undefined,
    scheduledAt: !sendNow && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
  });

  const isScheduledForFuture = !!form.scheduledAt && new Date(form.scheduledAt).getTime() > Date.now();

  const handleSaveDraft = async () => {
    if (!form.content.trim()) { toast.error("Введите текст сообщения"); return; }
    setSubmitting(true);
    try {
      const payload = { ...buildPayload(false), scheduledAt: editingId ? null : undefined };
      if (editingId) {
        await api.patch(`/broadcasts/${editingId}`, payload);
      } else {
        await api.post("/broadcasts", payload);
      }
      toast.success(editingId ? "Черновик обновлён" : "Черновик сохранён");
      setIsCreateOpen(false);
      setEditingId(null);
      fetchBroadcasts(1, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveScheduled = async () => {
    if (!form.content.trim()) { toast.error("Введите текст сообщения"); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload(false);
      if (editingId) {
        await api.patch(`/broadcasts/${editingId}`, payload);
      } else {
        await api.post("/broadcasts", payload);
      }
      toast.success(editingId ? "Рассылка обновлена" : "Рассылка запланирована");
      setIsCreateOpen(false);
      setEditingId(null);
      fetchBroadcasts(1, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async () => {
    if (!form.content.trim()) { toast.error("Введите текст сообщения"); return; }
    setSubmitting(true);
    try {
      let id = editingId;
      if (editingId) {
        await api.patch(`/broadcasts/${editingId}`, buildPayload(true));
      } else {
        const createRes = await api.post("/broadcasts", buildPayload(true));
        id = createRes.data.data.id;
      }
      await api.post(`/broadcasts/${id}/send`);
      toast.success("Рассылка запущена");
      setIsCreateOpen(false);
      setEditingId(null);
      fetchBroadcasts(1, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimarySubmit = () => isScheduledForFuture ? handleSaveScheduled() : handleSendNow();

  // ── Row actions ─────────────────────────────────────────────────────────────

  const handleSend = async (id: string) => {
    try {
      await api.post(`/broadcasts/${id}/send`);
      toast.success("Рассылка запущена");
      fetchBroadcasts(page, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка отправки");
    }
  };

  const handleOpenDetail = async (id: string) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailBroadcast(null);
    try {
      const res = await api.get(`/broadcasts/${id}`);
      setDetailBroadcast(res.data.data);
    } catch {
      toast.error("Ошибка загрузки деталей");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string, title?: string | null) => {
    if (!confirm(`Удалить рассылку${title ? ` "${title}"` : ""}?`)) return;
    try {
      await api.delete(`/broadcasts/${id}`);
      toast.success("Рассылка удалена");
      fetchBroadcasts(page, statusFilter);
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  // ── Status tabs ──────────────────────────────────────────────────────────────

  const statusTabs: Array<{ value: BroadcastStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "Все" },
    { value: "DRAFT", label: "Черновики" },
    { value: "SCHEDULED", label: "Запланированные" },
    { value: "SENT", label: "Отправленные" },
    { value: "FAILED", label: "Ошибки" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Рассылки</h1>
          <p className="text-muted-foreground text-sm mt-1">Всего: {total}</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(v) => { setIsCreateOpen(v); if (!v) setEditingId(null); }}>
          <DialogTrigger asChild>
            <Button onClick={onOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Создать рассылку
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Редактировать рассылку" : "Новая рассылка"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Title */}
              <Input
                placeholder="Название (необязательно)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Текст сообщения <span className="text-destructive">*</span></Label>
                  <div className="flex rounded-md border overflow-hidden text-xs">
                    <button
                      type="button"
                      className={`px-3 py-1 transition-colors ${activeTab === "edit" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      onClick={() => setActiveTab("edit")}
                    >
                      Редактор
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 transition-colors border-l ${activeTab === "preview" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      onClick={() => setActiveTab("preview")}
                    >
                      Превью
                    </button>
                  </div>
                </div>
                {activeTab === "edit" ? (
                  <div data-color-mode="light">
                    <MDEditorWithUpload
                      value={form.content}
                      onChange={(v) => setForm({ ...form, content: v })}
                      height={200}
                    />
                  </div>
                ) : (
                  <TelegramPreview
                    content={form.content}
                    buttons={form.buttons}
                    mediaItem={form.mediaItems[0]}
                  />
                )}
              </div>

              {/* Media */}
              <div className="space-y-2">
                <Label>Медиафайлы</Label>
                {form.mediaItems.length > 1 && (form.targetType === "TAG" || form.targetType === "ALL_USERS") && (
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
                    Рассылка нескольких медиа в личку каждому занимает много времени. Лучше отправлять в чат.
                  </div>
                )}
                <MediaDropZone
                  items={form.mediaItems}
                  onChange={(items) => setForm({ ...form, mediaItems: items })}
                />
              </div>

              {/* Buttons */}
              <div className="space-y-1.5">
                <Label>Кнопки-ссылки</Label>
                <ButtonsEditor
                  buttons={form.buttons}
                  onChange={(btns) => setForm({ ...form, buttons: btns })}
                />
              </div>

              {/* Separator */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Получатели</Label>
              </div>

              {/* Target type */}
              <Select
                value={form.targetType}
                onValueChange={(v) => setForm({ ...form, targetType: v as TargetType, tagIds: [], chatIds: [], userIds: [] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_USERS">
                    <div className="flex items-center gap-2"><Globe className="h-4 w-4" />Все сотрудники</div>
                  </SelectItem>
                  <SelectItem value="TAG">
                    <div className="flex items-center gap-2"><Tag className="h-4 w-4" />По тегу (в личку)</div>
                  </SelectItem>
                  <SelectItem value="SPECIFIC_USERS">
                    <div className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Конкретные пользователи</div>
                  </SelectItem>
                  <SelectItem value="CHAT">
                    <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />В чаты / каналы</div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {form.targetType === "TAG" && (
                <CheckboxList
                  items={tags}
                  selected={form.tagIds}
                  onToggle={(id) => toggleId("tagIds", id)}
                  renderLabel={(tag) => (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color || "#6b7280" }} />
                      {tag.name}
                    </span>
                  )}
                />
              )}

              {form.targetType === "SPECIFIC_USERS" && (
                <UserPicker
                  selected={form.userIds}
                  onChange={(ids) => setForm({ ...form, userIds: ids })}
                />
              )}

              {form.targetType === "CHAT" && (
                <CheckboxList
                  items={chats}
                  selected={form.chatIds}
                  onToggle={(id) => toggleId("chatIds", id)}
                  renderLabel={(chat) => (
                    <span>{chat.title} <span className="text-muted-foreground text-xs">({chat.type})</span></span>
                  )}
                />
              )}

              {/* Schedule */}
              <div className="space-y-1.5">
                <Label>Отложенная отправка</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
                Отмена
              </Button>
              {editingId ? (
                <>
                  <Button variant="secondary" onClick={handleSaveDraft} disabled={submitting || !form.content.trim()}>
                    Черновик
                  </Button>
                  <Button variant="outline" onClick={handleSendNow} disabled={submitting || !form.content.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Отправить
                  </Button>
                  <Button onClick={isScheduledForFuture ? handleSaveScheduled : handleSaveDraft} disabled={submitting || !form.content.trim()}>
                    Сохранить
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleSaveDraft} disabled={submitting || !form.content.trim()}>
                    Черновик
                  </Button>
                  <Button onClick={handlePrimarySubmit} disabled={submitting || !form.content.trim()}>
                    {isScheduledForFuture ? "Сохранить" : <><Send className="h-4 w-4 mr-2" />Отправить</>}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="flex items-center justify-center h-48 border rounded-lg">
          <div className="text-center text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Нет рассылок</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {broadcasts.map((b) => (
            <Card key={b.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                    {b.title || b.content.slice(0, 60) + (b.content.length > 60 ? "..." : "")}
                  </CardTitle>
                  <Badge variant={STATUS_VARIANTS[b.status]} className="shrink-0 text-xs">
                    {STATUS_LABELS[b.status]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {b.title && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{b.content}</p>
                )}
                <TargetBadge broadcast={b} />

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {b.status === "SCHEDULED" && b.scheduledAt && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(b.scheduledAt)}</span>
                  )}
                  {b.status === "SENT" && (
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b.recipientsCount} получателей</span>
                  )}
                  {b.sentAt && <span>{formatDate(b.sentAt)}</span>}
                </div>

                {b.buttons?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {b.buttons.slice(0, 2).map((btn, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{btn.text}</Badge>
                    ))}
                    {b.buttons.length > 2 && <Badge variant="outline" className="text-xs">+{b.buttons.length - 2}</Badge>}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {(b.status === "DRAFT" || b.status === "SCHEDULED" || b.status === "FAILED") && (
                    <Button size="sm" className="flex-1" onClick={() => handleSend(b.id)}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Отправить
                    </Button>
                  )}
                  {(b.status === "DRAFT" || b.status === "SCHEDULED") && (
                    <Button size="sm" variant="outline" onClick={() => onOpenEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleOpenDetail(b.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Детали
                  </Button>
                  {b.status !== "SENDING" && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id, b.title)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailBroadcast?.title || "Детали рассылки"}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Загрузка...</div>
          ) : detailBroadcast ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Статус</p>
                  <Badge variant={STATUS_VARIANTS[detailBroadcast.status]}>{STATUS_LABELS[detailBroadcast.status]}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Тип</p>
                  <TargetBadge broadcast={detailBroadcast} />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Создано</p>
                  <p>{formatDate(detailBroadcast.createdAt)}</p>
                </div>
                {detailBroadcast.sentAt && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Отправлено</p>
                    <p>{formatDate(detailBroadcast.sentAt)}</p>
                  </div>
                )}
                {detailBroadcast.scheduledAt && detailBroadcast.status === "SCHEDULED" && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Запланировано</p>
                    <p>{formatDate(detailBroadcast.scheduledAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Автор</p>
                  <p>{detailBroadcast.createdBy?.name || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Текст сообщения</p>
                <div className="border rounded-md p-3 bg-muted/30 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {detailBroadcast.content}
                </div>
              </div>

              {detailBroadcast.targetType !== "CHAT" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Получатели</p>
                    <span className="text-xs text-muted-foreground">
                      {detailBroadcast.recipientsCount} всего
                      {detailBroadcast.recipients.length < detailBroadcast.recipientsCount &&
                        ` · показано ${detailBroadcast.recipients.length}`}
                    </span>
                  </div>
                  {detailBroadcast.recipients.length === 0 ? (
                    <p className="text-sm text-muted-foreground border rounded-md p-3 text-center">Нет данных</p>
                  ) : (
                    <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                      {detailBroadcast.recipients.map((r) => (
                        <RecipientRow key={r.id} r={r} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailBroadcast.targetType === "CHAT" && (
                <div>
                  <p className="text-sm font-medium mb-2">Целевые чаты</p>
                  <div className="flex flex-wrap gap-2">
                    {detailBroadcast.targetChats.map((c) => (
                      <Badge key={c.id} variant="outline">{c.title}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Страница {page} из {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BroadcastsPage;
