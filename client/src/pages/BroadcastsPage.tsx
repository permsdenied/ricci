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
} from "lucide-react";

// в”Ђв”Ђ Types в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

type BroadcastStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
type TargetType = "CHAT" | "TAG" | "ALL_USERS";
type MediaType = "image" | "video" | "document" | "audio";

interface InlineButton {
  text: string;
  url: string;
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
  recipientsCount: number;
  createdBy: { name: string };
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
  mediaUrl: string;
  mediaType: MediaType | "";
  buttons: InlineButton[];
  targetType: TargetType;
  tagIds: string[];
  chatIds: string[];
  scheduledAt: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  mediaUrl: "",
  mediaType: "",
  buttons: [],
  targetType: "ALL_USERS",
  tagIds: [],
  chatIds: [],
  scheduledAt: "",
};

// в”Ђв”Ђ Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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

// в”Ђв”Ђ File upload helper в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // Build absolute URL using current API base (strip /api path)
  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/api$/, "");
  return base + res.data.data.url;
}

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

/** Wraps MDEditor and intercepts paste / drag-drop of files */
function MDEditorWithUpload({
  value,
  onChange,
  height = 200,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      setUploading(true);
      try {
        const url = await uploadFile(file);
        const snippet = isImageMime(file.type)
          ? `![${file.name}](${url})`
          : `[${file.name}](${url})`;
        onChange(value ? `${value}\n${snippet}` : snippet);
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
      if (files && files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div
      ref={editorRef}
      className="relative"
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        preview="edit"
        height={height}
        textareaProps={{
          placeholder: "Markdown: **жирный** _курсив_ `код` ~~зачёркнутый~~\n[текст](https://ссылка.ru)\n\nВставьте или перетащите изображение/PDF/видео",
        }}
      />
      {uploading && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-md text-sm text-muted-foreground">
          Загрузка файла...
        </div>
      )}
    </div>
  );
}

// в”Ђв”Ђ Telegram-style preview wrapper в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

function TelegramPreview({
  content,
  buttons,
  mediaUrl,
  mediaType,
}: {
  content: string;
  buttons: InlineButton[];
  mediaUrl?: string;
  mediaType?: string;
}) {
  return (
    <div className="min-h-[120px] rounded-md border bg-[#e5ddd5] p-4 flex justify-end" data-color-mode="light">
      <div className="max-w-[85%] bg-white rounded-2xl rounded-tr-sm shadow-sm overflow-hidden">
        {mediaUrl && (
          <div className="bg-muted px-3 py-2 text-xs text-muted-foreground border-b flex items-center gap-1.5">
            <span>{mediaType === "image" ? "IMG" : mediaType === "video" ? "VID" : mediaType === "audio" ? "AUD" : "DOC"}</span>
            <span className="truncate">{mediaUrl.length > 50 ? mediaUrl.slice(0, 50) + "..." : mediaUrl}</span>
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
            {buttons
              .filter((b) => b.text && b.url)
              .map((btn, i) => (
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

// в”Ђв”Ђ Sub-components в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <MessageSquare className="h-3.5 w-3.5" />
      <span>
        {broadcast.targetChats.length > 0
          ? broadcast.targetChats.map((c) => c.title).join(", ")
          : "—"}
      </span>
    </div>
  );
}

// в”Ђв”Ђ Buttons editor в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

function ButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: InlineButton[];
  onChange: (btns: InlineButton[]) => void;
}) {
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
            <Input
              placeholder="Текст кнопки"
              value={btn.text}
              onChange={(e) => update(i, "text", e.target.value)}
            />
            <Input
              placeholder="https://..."
              value={btn.url}
              onChange={(e) => update(i, "url", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => remove(i)}
          >
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

// в”Ђв”Ђ CheckboxList в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">Нет доступных</p>
      )}
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
        >
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selected.includes(item.id)}
            onChange={() => onToggle(item.id)}
          />
          <span className="text-sm">{renderLabel(item)}</span>
        </label>
      ))}
    </div>
  );
}

// в”Ђв”Ђ Main Page в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BroadcastStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Reference data
  const [tags, setTags] = useState<Tag[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);

  // в”Ђв”Ђ Fetch в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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
    const [tagsRes, chatsRes] = await Promise.all([
      api.get("/tags"),
      api.get("/chats?isActive=true"),
    ]);
    setTags(tagsRes.data.data);
    setChats(chatsRes.data.data);
  };

  useEffect(() => {
    fetchBroadcasts(1, statusFilter);
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchBroadcasts(page, statusFilter);
  }, [page]);

  const onOpenCreate = () => {
    fetchRefData();
    setForm(EMPTY_FORM);
    setActiveTab("edit");
    setIsCreateOpen(true);
  };

  // в”Ђв”Ђ Form helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  const toggleId = (field: "tagIds" | "chatIds", id: string) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter((x) => x !== id)
        : [...f[field], id],
    }));
  };

  const buildPayload = (sendNow: boolean) => ({
    title: form.title || undefined,
    content: form.content,
    mediaUrl: form.mediaUrl || undefined,
    mediaType: (form.mediaType || undefined) as MediaType | undefined,
    buttons: form.buttons.filter((b) => b.text && b.url),
    targetType: form.targetType,
    tagIds: form.targetType === "TAG" ? form.tagIds : undefined,
    chatIds: form.targetType === "CHAT" ? form.chatIds : undefined,
    scheduledAt:
      !sendNow && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
  });

  const isScheduledForFuture =
    !!form.scheduledAt && new Date(form.scheduledAt).getTime() > Date.now();

  const handlePrimarySubmit = async () => {
    if (isScheduledForFuture) {
      await handleSaveDraft();
      return;
    }

    await handleSendNow();
  };

  const handleSaveDraft = async () => {
    if (!form.content.trim()) {
      toast.error("Введите текст сообщения");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/broadcasts", buildPayload(false));
      toast.success("Черновик сохранён");
      setIsCreateOpen(false);
      fetchBroadcasts(1, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async () => {
    if (!form.content.trim()) {
      toast.error("Введите текст сообщения");
      return;
    }
    setSubmitting(true);
    try {
      const createRes = await api.post("/broadcasts", buildPayload(true));
      const broadcastId = createRes.data.data.id;
      await api.post(`/broadcasts/${broadcastId}/send`);
      toast.success("Рассылка запущена");
      setIsCreateOpen(false);
      fetchBroadcasts(1, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  // в”Ђв”Ђ Row actions в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  const handleSend = async (id: string) => {
    try {
      await api.post(`/broadcasts/${id}/send`);
      toast.success("Рассылка запущена");
      fetchBroadcasts(page, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Ошибка отправки");
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

  // в”Ђв”Ђ Status tabs в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  const statusTabs: Array<{ value: BroadcastStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "Все" },
    { value: "DRAFT", label: "Черновики" },
    { value: "SCHEDULED", label: "Запланированные" },
    { value: "SENT", label: "Отправленные" },
    { value: "FAILED", label: "Ошибки" },
  ];

  // в”Ђв”Ђ Render в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Рассылки</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Всего: {total}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={onOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Создать рассылку
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новая рассылка</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Title */}
              <div className="space-y-1.5">
                <Label>Заголовок (необязательно)</Label>
                <Input
                  placeholder="Название для вашего удобства"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Content with preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    Текст сообщения <span className="text-destructive">*</span>
                  </Label>
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
                    mediaUrl={form.mediaUrl || undefined}
                    mediaType={form.mediaType || undefined}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Поддерживается Markdown: **жирный**, _курсив_, `код`, ~~зачёркнутый~~, [текст](ссылка)
                </p>
              </div>

              {/* Media */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>URL медиа (необязательно)</Label>
                  <Input
                    placeholder="https://..."
                    value={form.mediaUrl}
                    onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Тип медиа</Label>
                  <Select
                    value={form.mediaType}
                    onValueChange={(v) =>
                      setForm({ ...form, mediaType: v as MediaType | "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Изображение</SelectItem>
                      <SelectItem value="video">Видео</SelectItem>
                      <SelectItem value="document">Документ</SelectItem>
                      <SelectItem value="audio">Аудио</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Inline buttons */}
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
              <div className="space-y-1.5">
                <Label>Тип таргетинга</Label>
                <Select
                  value={form.targetType}
                  onValueChange={(v) =>
                    setForm({ ...form, targetType: v as TargetType, tagIds: [], chatIds: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_USERS">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Все сотрудники
                      </div>
                    </SelectItem>
                    <SelectItem value="TAG">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        По тегу (в личку)
                      </div>
                    </SelectItem>
                    <SelectItem value="CHAT">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        В конкретные чаты/каналы
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags selector */}
              {form.targetType === "TAG" && (
                <div className="space-y-1.5">
                  <Label>Выберите теги</Label>
                  <CheckboxList
                    items={tags}
                    selected={form.tagIds}
                    onToggle={(id) => toggleId("tagIds", id)}
                    renderLabel={(tag) => (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || "#6b7280" }}
                        />
                        {tag.name}
                      </span>
                    )}
                  />
                  {form.tagIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Выбрано: {form.tagIds.length}
                    </p>
                  )}
                </div>
              )}

              {/* Chats selector */}
              {form.targetType === "CHAT" && (
                <div className="space-y-1.5">
                  <Label>Выберите чаты / каналы</Label>
                  <CheckboxList
                    items={chats}
                    selected={form.chatIds}
                    onToggle={(id) => toggleId("chatIds", id)}
                    renderLabel={(chat) => (
                      <span>
                        {chat.title}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({chat.type})
                        </span>
                      </span>
                    )}
                  />
                  {form.chatIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Выбрано: {form.chatIds.length}
                    </p>
                  )}
                </div>
              )}

              {/* Schedule */}
              <div className="space-y-1.5">
                <Label>Отложенная отправка (необязательно)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Оставьте пустым для сохранения как черновик
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={submitting || !form.content.trim()}
              >
                Сохранить черновик
              </Button>
              <Button
                onClick={handlePrimarySubmit}
                disabled={submitting || !form.content.trim()}
              >
                {isScheduledForFuture ? (
                  "Сохранить"
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Отправить сейчас
                  </>
                )}
              </Button>
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

      {/* Broadcast cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="flex items-center justify-center h-48 border rounded-lg">
          <div className="text-center text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Нет рассылок</p>
            <p className="text-sm mt-1">Создайте первую рассылку</p>
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
                  <Badge
                    variant={STATUS_VARIANTS[b.status]}
                    className="shrink-0 text-xs"
                  >
                    {STATUS_LABELS[b.status]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {/* Content preview (if title exists) */}
                {b.title && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {b.content}
                  </p>
                )}

                {/* Target */}
                <TargetBadge broadcast={b} />

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {b.status === "SCHEDULED" && b.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(b.scheduledAt)}
                    </span>
                  )}
                  {b.status === "SENT" && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {b.recipientsCount} получателей
                    </span>
                  )}
                  {b.sentAt && (
                    <span>{formatDate(b.sentAt)}</span>
                  )}
                </div>

                {/* Buttons */}
                {b.buttons?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {b.buttons.slice(0, 2).map((btn, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {btn.text}
                      </Badge>
                    ))}
                    {b.buttons.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{b.buttons.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {(b.status === "DRAFT" || b.status === "SCHEDULED" || b.status === "FAILED") && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSend(b.id)}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Отправить
                    </Button>
                  )}
                  {b.status !== "SENDING" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(b.id, b.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BroadcastsPage;
