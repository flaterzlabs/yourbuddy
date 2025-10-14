import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundSettings } from "@/components/sound-settings";
import { StudentAvatar } from "@/components/student-avatar";
import { StudentStats } from "@/components/student-stats";

import { useAuth } from "@/hooks/use-auth";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useAudioUnlock } from "@/hooks/use-audio-unlock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  LogOut,
  AlertTriangle,
  Activity,
  Copy,
  Check,
  Menu,
  BarChart3,
  GraduationCap,
  SunMoon,
  XCircle,
  Download,
  ImageDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { subMonths, subWeeks, subDays, startOfWeek, endOfWeek, format } from "date-fns";
import { exportChartAsPng } from "@/lib/export-chart";
type Connection = Database["public"]["Tables"]["connections"]["Row"] & {
  student_profile?: Database["public"]["Tables"]["profiles"]["Row"];
  thrive_sprite?: Database["public"]["Tables"]["thrive_sprites"]["Row"];
};
type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"] & {
  student_profile?: Database["public"]["Tables"]["profiles"]["Row"];
};
export default function CaregiverDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playNotificationSound } = useNotificationSound();
  const { isUnlocked } = useAudioUnlock();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [studentCode, setStudentCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPeriodFilter, setRequestsPeriodFilter] = useState<"7days" | "30days" | "all">("all");
  const desktopChartRef = useRef<HTMLDivElement | null>(null);
  const mobileChartRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (copyStatus !== "copied") return;
    const timeout = setTimeout(() => setCopyStatus("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);
  const fetchConnections = async () => {
    console.time("caregiver:fetchConnections");
    if (!user) return;
    const { data, error } = await supabase
      .from("connections")
      .select(
        `
        *,
        student_profile:profiles!connections_student_id_fkey (
          *,
          thrive_sprite:thrive_sprites!thrive_sprites_student_id_fkey (*)
        )
      `,
      )
      .eq("caregiver_id", user.id)
      .order("created_at", {
        ascending: false,
      });
    if (error) {
      console.error("Error fetching connections:", error);
      setConnections([]);
      console.timeEnd("caregiver:fetchConnections");
      return;
    }

    // Flatten embedded sprite for compatibility with existing rendering
    const connectionsWithSprites = (data || []).map((c: any) => ({
      ...c,
      thrive_sprite: c?.student_profile?.thrive_sprite ?? null,
    }));
    setConnections(connectionsWithSprites);
    console.timeEnd("caregiver:fetchConnections");
  };
  const fetchHelpRequests = async () => {
    console.time("caregiver:fetchHelpRequests");
    if (!user) return;
    const activeStudents = connections.filter((c) => c.status === "active").map((c) => c.student_id);
    if (activeStudents.length === 0) {
      setHelpRequests([]);
      console.timeEnd("caregiver:fetchHelpRequests");
      return;
    }
    const { data, error } = await supabase
      .from("help_requests")
      .select(
        `
        *,
        student_profile:profiles!help_requests_student_id_fkey (*)
      `,
      )
      .in("student_id", activeStudents)
      .order("created_at", {
        ascending: false,
      });
    if (error) {
      console.error("Error fetching help requests:", error);
    } else {
      setHelpRequests(data || []);
    }
    console.timeEnd("caregiver:fetchHelpRequests");
  };
  useEffect(() => {
    fetchConnections();
  }, [user?.id]);
  useEffect(() => {
    if (connections.length > 0) {
      fetchHelpRequests();
    }
  }, [connections]);
  useEffect(() => {
    if (!user) return;

    // Subscribe to connection changes for this caregiver
    const connectionsChannel = supabase
      .channel(`connections-caregiver-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `caregiver_id=eq.${user.id}`,
        },
        () => {
          fetchConnections();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(connectionsChannel);
    };
  }, [user?.id]);

  // Broadcast-based realtime notification (fallback independent of DB replication)
  useEffect(() => {
    if (!user) return;
    const activeIds = new Set(connections.filter((c) => c.status === "active").map((c) => c.student_id));
    const ch = supabase
      .channel("help-requests-broadcast")
      .on(
        "broadcast",
        {
          event: "new-help",
        },
        (e: any) => {
          const rec = e?.payload;
          if (!rec || !activeIds.has(rec.student_id)) return;
          const conn = connections.find((c) => c.student_id === rec.student_id);
          const name = conn?.student_profile?.username || "Unknown Student";
          const urgencyVariant =
            rec.urgency === "urgent"
              ? "caregiver-urgent"
              : rec.urgency === "attention"
                ? "caregiver-warning"
                : "caregiver-success";
          toast({
            title: "New Help Request",
            description: `${getUrgencyEmoji(rec.urgency || "ok")} Help request from ${name}`,
            variant: urgencyVariant as "caregiver-success" | "caregiver-warning" | "caregiver-urgent",
            duration: 4000,
          });
          playNotificationSound();
          fetchHelpRequests();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, connections.map((c) => `${c.student_id}:${c.status}`).join("|")]);

  // Subscribe to help_requests changes and react for active students
  useEffect(() => {
    if (!user) return;
    const activeIds = new Set(connections.filter((c) => c.status === "active").map((c) => c.student_id));
    const helpRequestsChannel = supabase
      .channel(`help-requests-caregiver-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "help_requests",
        },
        (payload) => {
          const rec: any = payload.new || payload.old;
          if (!rec || !activeIds.has(rec.student_id)) return;
          if (payload.eventType === "INSERT") {
            const conn = connections.find((c) => c.student_id === rec.student_id);
            const name = conn?.student_profile?.username || "Unknown Student";
            const urgencyVariant =
              rec.urgency === "urgent"
                ? "caregiver-urgent"
                : rec.urgency === "attention"
                  ? "caregiver-warning"
                  : "caregiver-success";
            toast({
              title: "New Help Request",
              description: `${getUrgencyEmoji(rec.urgency || "ok")} Help request from ${name}`,
              variant: urgencyVariant as "caregiver-success" | "caregiver-warning" | "caregiver-urgent",
              duration: 4000,
            });
            playNotificationSound();
          }
          fetchHelpRequests();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(helpRequestsChannel);
    };
  }, [user?.id, connections.map((c) => `${c.student_id}:${c.status}`).join("|")]);
  const handleConnectStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_connection_by_code", {
        input_code: studentCode.toUpperCase(),
      });
      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
        student?: any;
      };
      if (result.success && result.student) {
        toast({
          title: "Estudante conectado!",
          description: `Conectado com ${result.student.username} (${result.student.student_code})`,
          variant: "caregiver-success",
          duration: 4000,
        });
        setStudentCode("");
        fetchConnections(); // This will refresh the "Meus Alunos" section
      } else {
        // === Alteração: Adicionado viewportId ===
        toast({
          title: "Erro",
          description: result.error || "Código inválido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting to student:", error);
      // === Alteração: Adicionado viewportId ===
      toast({
        title: "Erro",
        description: "Não foi possível conectar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleHelpRequestAction = async (requestId: string, action: "answered" | "closed") => {
    try {
      // Find the request to get student info for notification
      const request = helpRequests.find((r) => r.id === requestId);
      const { error } = await supabase
        .from("help_requests")
        .update({
          status: action,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;

      // === Alteração: Adicionado viewportId ===
      toast({
        title: action === "answered" ? "Marcado como respondido" : "Pedido finalizado",
        description: "O estudante foi notificado.",
        variant: "caregiver-success",
      });

      // Notify the student via broadcast
      if (request?.student_id) {
        try {
          const notificationChannel = supabase.channel(`help-status-student-${request.student_id}`);
          await notificationChannel.subscribe();

          // Small delay to ensure subscription is ready
          setTimeout(async () => {
            await notificationChannel.send({
              type: "broadcast",
              event: "status-update",
              payload: {
                request_id: requestId,
                student_id: request.student_id,
                status: action,
                updated_at: new Date().toISOString(),
              },
            });

            // Clean up channel after sending
            setTimeout(() => supabase.removeChannel(notificationChannel), 1000);
          }, 100);
        } catch (e) {
          // Best effort - ignore broadcast failures
          console.log("Broadcast notification failed:", e);
        }
      }

      // Atualiza imediatamente enquanto o realtime notifica
      fetchHelpRequests();
    } catch (error) {
      console.error("Error updating help request:", error);
      // === Alteração: Adicionado viewportId ===
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      });
    }
  };

  const handleCloseAllRequests = async () => {
    if (openHelpRequests.length === 0) return;

    try {
      const openRequestIds = openHelpRequests.map((r) => r.id);
      const { error } = await supabase
        .from("help_requests")
        .update({
          status: "closed",
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .in("id", openRequestIds);

      if (error) throw error;

      toast({
        title: "All requests closed",
        description: `${openRequestIds.length} help request${openRequestIds.length > 1 ? "s" : ""} closed successfully.`,
        variant: "caregiver-success",
      });

      // Notify all students via broadcast
      openHelpRequests.forEach((request) => {
        if (request.student_id) {
          try {
            const notificationChannel = supabase.channel(`help-status-student-${request.student_id}`);
            notificationChannel.subscribe();

            setTimeout(async () => {
              await notificationChannel.send({
                type: "broadcast",
                event: "status-update",
                payload: {
                  request_id: request.id,
                  student_id: request.student_id,
                  status: "closed",
                  updated_at: new Date().toISOString(),
                },
              });
              setTimeout(() => supabase.removeChannel(notificationChannel), 1000);
            }, 100);
          } catch (e) {
            console.log("Broadcast notification failed:", e);
          }
        }
      });

      fetchHelpRequests();
    } catch (error) {
      console.error("Error closing all requests:", error);
      toast({
        title: "Error",
        description: "Failed to close all requests.",
        variant: "destructive",
      });
    }
  };
  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "open":
        return "destructive";
      case "answered":
        return "secondary";
      case "closed":
        return "outline";
      case "pending":
        return "destructive";
      case "active":
        return "secondary";
      default:
        return "secondary";
    }
  };
  const getUrgencyEmoji = (urgency: string) => {
    switch (urgency) {
      case "attention":
        return "🟡";
      case "urgent":
        return "🔴";
      default:
        return "🟢";
    }
  };
  const activeConnections = connections.filter((c) => c.status === "active");
  const openHelpRequests = helpRequests.filter((r) => r.status === "open");
  const closedHelpRequests = helpRequests.filter((r) => r.status === "answered" || r.status === "closed");

  // Dynamic text based on role
  const studentLabel = profile?.role === "caregiver" ? "children" : "students";
  const StudentLabel = profile?.role === "caregiver" ? "Children" : "Students";

  // Filter and paginate help requests
  const REQUESTS_PER_PAGE = 20;

  const filteredHelpRequests = useMemo(() => {
    const now = new Date();
    const sortedRequests = [...helpRequests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return sortedRequests.filter((request) => {
      if (requestsPeriodFilter === "all") return true;
      const requestDate = new Date(request.created_at);
      const daysAgo = requestsPeriodFilter === "7days" ? 7 : 30;
      const cutoffDate = subDays(now, daysAgo);
      return requestDate >= cutoffDate;
    });
  }, [helpRequests, requestsPeriodFilter]);

  const totalRequestsPages = Math.ceil(filteredHelpRequests.length / REQUESTS_PER_PAGE);
  const paginatedHelpRequests = filteredHelpRequests.slice(
    (requestsPage - 1) * REQUESTS_PER_PAGE,
    requestsPage * REQUESTS_PER_PAGE,
  );

  const handleRequestsFilterChange = (filter: "7days" | "30days" | "all") => {
    setRequestsPeriodFilter(filter);
    setRequestsPage(1);
  };

  const renderRequestsPagination = () => {
    const pages = [];
    
    // Mobile: Show only current page, ellipsis, and last page (max 3 buttons)
    if (isMobile) {
      if (totalRequestsPages <= 3) {
        for (let i = 1; i <= totalRequestsPages; i++) {
          pages.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setRequestsPage(i);
                }}
                isActive={requestsPage === i}
                className="h-8 w-8 text-xs p-0"
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }
      } else {
        // Always show current page
        pages.push(
          <PaginationItem key={requestsPage}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
              }}
              isActive={true}
              className="h-8 w-8 text-xs p-0"
            >
              {requestsPage}
            </PaginationLink>
          </PaginationItem>,
        );
        
        // Show ellipsis if not near the end
        if (requestsPage < totalRequestsPages) {
          pages.push(
            <PaginationItem key="ellipsis">
              <PaginationEllipsis className="h-8 w-8" />
            </PaginationItem>,
          );
        }
        
        // Always show last page if not current
        if (requestsPage !== totalRequestsPages) {
          pages.push(
            <PaginationItem key={totalRequestsPages}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setRequestsPage(totalRequestsPages);
                }}
                isActive={false}
                className="h-8 w-8 text-xs p-0"
              >
                {totalRequestsPages}
              </PaginationLink>
            </PaginationItem>,
          );
        }
      }
      return pages;
    }
    
    // Desktop: Show up to 5 pages (existing logic)
    const maxVisiblePages = 5;

    if (totalRequestsPages <= maxVisiblePages) {
      for (let i = 1; i <= totalRequestsPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setRequestsPage(i);
              }}
              isActive={requestsPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setRequestsPage(1);
            }}
            isActive={requestsPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );

      if (requestsPage > 3) {
        pages.push(
          <PaginationItem key="ellipsis-1">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      const start = Math.max(2, requestsPage - 1);
      const end = Math.min(totalRequestsPages - 1, requestsPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setRequestsPage(i);
              }}
              isActive={requestsPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }

      if (requestsPage < totalRequestsPages - 2) {
        pages.push(
          <PaginationItem key="ellipsis-2">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      pages.push(
        <PaginationItem key={totalRequestsPages}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setRequestsPage(totalRequestsPages);
            }}
            isActive={requestsPage === totalRequestsPages}
          >
            {totalRequestsPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return pages;
  };
  const helpRequestsChartData = useMemo(() => {
    const now = new Date();
    let periods: { key: string; date: Date }[] = [];

    if (chartPeriod === "daily") {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          date,
        });
      }
    } else if (chartPeriod === "weekly") {
      for (let i = 5; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date);
        periods.push({
          key: `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`,
          date: weekStart,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}`,
          date,
        });
      }
    }

    // Initialize counters for each urgency level
    const counters = new Map<string, { ok: number; attention: number; urgent: number }>();

    helpRequests.forEach((request) => {
      if (!request.created_at) return;
      const created = new Date(request.created_at);
      let key = "";

      if (chartPeriod === "daily") {
        key = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`;
      } else if (chartPeriod === "weekly") {
        const weekStart = startOfWeek(created);
        key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      } else {
        key = `${created.getFullYear()}-${created.getMonth()}`;
      }

      const urgency = request.urgency || "ok";
      const existing = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
      if (urgency === "ok") existing.ok += 1;
      else if (urgency === "attention") existing.attention += 1;
      else if (urgency === "urgent") existing.urgent += 1;

      counters.set(key, existing);
    });

  return periods.map(({ key, date }) => {
    const counts = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
    let label = "";
    let fullLabel = "";

      if (chartPeriod === "daily") {
        label = format(date, "dd/MM");
        fullLabel = format(date, "dd/MM/yyyy");
      } else if (chartPeriod === "weekly") {
        const weekEnd = endOfWeek(date);
        label = `${format(date, "dd/MM")}`;
        fullLabel = `${format(date, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`;
      } else {
        label = date.toLocaleDateString("en-US", { month: "short" });
        fullLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      }

      return {
        period: label,
        fullLabel,
        ok: counts.ok,
        attention: counts.attention,
        urgent: counts.urgent,
        total: counts.ok + counts.attention + counts.urgent,
      };
    });
  }, [helpRequests, chartPeriod]);
  const hasHelpRequestStats = useMemo(
    () => helpRequestsChartData.some((item) => item.total > 0),
    [helpRequestsChartData],
  );
  const handleExportHelpRequestStats = () => {
    if (!hasHelpRequestStats) {
      toast({
        title: "No data to export",
        description: "There is no help request activity for the selected period.",
        variant: "caregiver-warning",
      });
      return;
    }

    const rows = [
      ["Period", "Low Priority", "Medium Priority", "High Priority", "Total"],
      ...helpRequestsChartData.map((item) => [
        item.fullLabel,
        item.ok.toString(),
        item.attention.toString(),
        item.urgent.toString(),
        item.total.toString(),
      ]),
    ];

    const escapeCell = (value: string) => {
      const cell = value ?? "";
      if (cell.includes('"') || cell.includes(",") || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const csvContent = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `help-request-stats-${chartPeriod}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export started",
      description: "Help request statistics exported as CSV.",
      variant: "caregiver-success",
    });
  };
  const handleExportHelpRequestChart = async () => {
    if (!hasHelpRequestStats) {
      toast({
        title: "No data to export",
        description: "There is no help request activity for the selected period.",
        variant: "caregiver-warning",
      });
      return;
    }

    const containers = [desktopChartRef.current, mobileChartRef.current].filter(
      (element): element is HTMLDivElement => Boolean(element),
    );
    const visibleContainer =
      containers.find((element) => element.offsetWidth > 0 && element.offsetHeight > 0) ?? containers[0];

    if (!visibleContainer) {
      toast({
        title: "Export unavailable",
        description: "Chart area was not found on screen.",
        variant: "caregiver-warning",
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      await exportChartAsPng(visibleContainer, `help-request-chart-${chartPeriod}-${timestamp}`);
      toast({
        title: "Export started",
        description: "Help request chart exported as PNG.",
        variant: "caregiver-success",
      });
    } catch (error) {
      console.error("Error exporting chart image:", error);
      toast({
        title: "Export failed",
        description: "Unable to export the chart right now. Please try again.",
        variant: "caregiver-warning",
      });
    }
  };
  const monthlyChartConfig = useMemo(
    () => ({
      ok: {
        label: "Low Priority",
        color: "hsl(142, 76%, 36%)",
      },
      attention: {
        label: "Medium Priority",
        color: "hsl(43, 96%, 56%)",
      },
      urgent: {
        label: "High Priority",
        color: "hsl(0, 84%, 60%)",
      },
    }),
    [],
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-6 md:px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col items-center gap-1">
            <BuddyLogo size={isMobile ? "md" : "lg"} />
            <h2 className={`text-lg font-semibold text-muted-foreground ${isMobile ? "hidden" : ""}`}>
              {profile?.role === "educator" ? "Educator Dashboard" : "Caregiver Dashboard"}
            </h2>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            <SoundSettings />

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border/50 bg-background/50 hover:bg-primary/10 transition-all duration-300"
            >
              <ThemeToggle />
            </Button>

            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                toast({
                  title: "Signed out successfully",
                  description: "See you next time!",
                  variant: "student",
                });
                navigate("/auth");
              }}
              className="rounded-xl border border-border/50 bg-background/50 hover:bg-purple-600 hover:text-white transition-all duration-300 px-4"
            >
              Logout
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl border border-border/50 bg-background/50 hover:bg-primary/10 transition-all duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[70vw] h-auto rounded-2xl shadow-lg border border-border">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 justify-center">
                  <BuddyLogo size="sm" />
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-4 mt-8">
                <Button
                  variant="ghost"
                  onClick={() => setOverviewModalOpen(true)}
                  className="justify-center gap-3 h-12"
                >
                  <BarChart3 className="h-5 w-5" />
                  Overview
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStudentsModalOpen(true)}
                  className="justify-center gap-3 h-12"
                >
                  <GraduationCap className="h-5 w-5" />
                  My {StudentLabel}
                </Button>

                {/* Sound Settings */}
                <SoundSettings
                  trigger={
                    <Button variant="ghost" className="w-full justify-center gap-3 h-12">
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                        <path d="M16 9a5 5 0 0 1 0 6" />
                        <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
                      </svg>
                      Sound
                    </Button>
                  }
                />

                {/* theme */}
                <ThemeToggle
                  trigger={
                    <Button variant="ghost" className="w-full justify-center gap-3 h-12">
                      <SunMoon className="h-5 w-5" />
                      Theme
                    </Button>
                  }
                />

                <Button
                  variant="ghost"
                  onClick={async () => {
                    await signOut();
                    toast({
                      title: "Signed out successfully",
                      description: "See you next time!",
                      variant: "student",
                    });
                    navigate("/auth");
                  }}
                  className="justify-center gap-3 h-12 w-full font-semibold text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Welcome Section - Centered */}
          <div className="text-center mb-12">
            <h1 className="text-xl sm:text-4xl bg-gradient-hero bg-clip-text text-transparent font-extrabold">
              Hello, {profile?.username || "User"}!
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground">Manage your {studentLabel} and help requests</p>
          </div>

          {/* Desktop Layout */}
          <div className={`grid lg:grid-cols-2 gap-8 ${isMobile ? "hidden" : ""}`}>
            {/* Stats Overview */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Overview</h2>
                <p className="text-muted-foreground text-sm">Your {studentLabel}' statistics</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                  <div className="text-3xl font-bold text-primary">{activeConnections.length}</div>
                  <div className="text-sm text-muted-foreground">Connected {StudentLabel}</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                  <div className="text-3xl font-bold text-warning">{openHelpRequests.length}</div>
                  <div className="text-sm text-muted-foreground">Open Requests</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                  <div className="text-3xl font-bold text-emerald-500">{closedHelpRequests.length}</div>
                  <div className="text-sm text-muted-foreground">Closed Requests</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Requests Per Month</h3>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          {chartPeriod.charAt(0).toUpperCase() + chartPeriod.slice(1)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setChartPeriod("daily")}>Daily</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartPeriod("weekly")}>Weekly</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartPeriod("monthly")}>Monthly</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={handleExportHelpRequestChart}
                      disabled={!hasHelpRequestStats}
                    >
                      <ImageDown className="h-4 w-4" />
                      Export PNG
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={handleExportHelpRequestStats}
                      disabled={!hasHelpRequestStats}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div ref={desktopChartRef}>
                  <ChartContainer config={monthlyChartConfig} className="w-full h-64">
                    <BarChart data={helpRequestsChartData}>
                      <CartesianGrid vertical={false} strokeDasharray="4 4" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelKey="fullLabel"
                            labelFormatter={(value) => value}
                            formatter={(value: any, name: string) => [
                              value,
                              name === "ok" ? `🟢 Good` : name === "attention" ? `🟡 Attention` : `🔴 Urgent`,
                            ]}
                          />
                        }
                      />
                      <Bar dataKey="urgent" stackId="requests" fill="var(--color-urgent)" />
                      <Bar dataKey="attention" stackId="requests" fill="var(--color-attention)" />
                      <Bar dataKey="ok" stackId="requests" fill="var(--color-ok)" />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </Card>

            {/* Help Requests */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
                <h2 className="text-xl font-bold mb-2">Help Requests</h2>
                <p className="text-muted-foreground text-sm">Manage student requests</p>
              </div>

              <div className="space-y-4">
                {/* Period Filter Dropdown */}
                <div className="flex gap-2 items-center justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {requestsPeriodFilter === "7days"
                          ? "Last 7 days"
                          : requestsPeriodFilter === "30days"
                            ? "Last 30 days"
                            : `All Requests (${helpRequests.length})`}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start">
                      <DropdownMenuItem onClick={() => handleRequestsFilterChange("7days")}>
                        Last 7 days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRequestsFilterChange("30days")}>
                        Last 30 days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRequestsFilterChange("all")}>
                        All Requests ({helpRequests.length})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Header with Close All */}
                  {openHelpRequests.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseAllRequests}
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Close All
                    </Button>
                  )}
                </div>

                {/* Requests List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {paginatedHelpRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {requestsPeriodFilter === "all"
                        ? "No requests found"
                        : `No requests in the last ${requestsPeriodFilter === "7days" ? "7" : "30"} days`}
                    </p>
                  ) : (
                    paginatedHelpRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{getUrgencyEmoji(request.urgency || "ok")}</span>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {request.student_profile?.username || "Unknown Student"}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleString("en-US")}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(request.status || "open")}>
                            {request.status === "open" && (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Waiting
                              </>
                            )}
                            {request.status === "answered" && (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Answered
                              </>
                            )}
                            {request.status === "closed" && (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Closed
                              </>
                            )}
                          </Badge>
                        </div>
                        {request.message && (
                          <p className="text-sm mb-3 p-3 bg-background rounded border border-border">
                            "{request.message}"
                          </p>
                        )}
                        {request.status === "open" && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleHelpRequestAction(request.id, "closed")}
                            className="w-[50%]"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark as Complete
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {totalRequestsPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (requestsPage > 1) setRequestsPage(requestsPage - 1);
                          }}
                          className={requestsPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {renderRequestsPagination()}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (requestsPage < totalRequestsPages) setRequestsPage(requestsPage + 1);
                          }}
                          className={requestsPage === totalRequestsPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </Card>
          </div>

          {/* Mobile Help Requests */}
          {isMobile && (
            <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-warning" />
                </div>
                <h2 className="text-lg font-bold mb-1">Help Requests</h2>
                <p className="text-muted-foreground text-xs">Manage student requests</p>
              </div>

              <div className="space-y-3">
                {/* Header with Close All */}
                {openHelpRequests.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseAllRequests}
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs h-8 px-3"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Close All
                    </Button>
                  </div>
                )}

                {/* Period Filters */}
                <div className="flex gap-2">
                  <Button
                    variant={requestsPeriodFilter === "7days" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRequestsFilterChange("7days")}
                    className="flex-1 text-xs h-8"
                  >
                    7d
                  </Button>
                  <Button
                    variant={requestsPeriodFilter === "30days" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRequestsFilterChange("30days")}
                    className="flex-1 text-xs h-8"
                  >
                    30d
                  </Button>
                  <Button
                    variant={requestsPeriodFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRequestsFilterChange("all")}
                    className="flex-1 text-xs h-8"
                  >
                    All ({helpRequests.length})
                  </Button>
                </div>

                {/* Requests List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {paginatedHelpRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6 text-sm">
                      {requestsPeriodFilter === "all"
                        ? "No requests found"
                        : `No requests in the last ${requestsPeriodFilter === "7days" ? "7" : "30"} days`}
                    </p>
                  ) : (
                    paginatedHelpRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getUrgencyEmoji(request.urgency || "ok")}</span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm truncate">
                                {request.student_profile?.username || "Unknown Student"}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleString("en-US")}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(request.status || "open")} className="text-xs">
                            {request.status === "open" && "Waiting"}
                            {request.status === "answered" && "Answered"}
                            {request.status === "closed" && "Closed"}
                          </Badge>
                        </div>
                        {request.message && (
                          <p className="text-xs mb-2 p-2 bg-background rounded border border-border line-clamp-2">
                            "{request.message}"
                          </p>
                        )}
                        {request.status === "open" && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleHelpRequestAction(request.id, "closed")}
                            className="w-full text-xs h-8"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark as Complete
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {totalRequestsPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent className="gap-1 justify-center">
                      <PaginationItem>
                        {isMobile ? (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (requestsPage > 1) setRequestsPage(requestsPage - 1);
                            }}
                            className={`h-8 w-8 p-0 ${requestsPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                            aria-label="Go to previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </PaginationLink>
                        ) : (
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (requestsPage > 1) setRequestsPage(requestsPage - 1);
                            }}
                            className={`text-xs h-8 ${requestsPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                          />
                        )}
                      </PaginationItem>
                      {renderRequestsPagination()}
                      <PaginationItem>
                        {isMobile ? (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (requestsPage < totalRequestsPages) setRequestsPage(requestsPage + 1);
                            }}
                            className={`h-8 w-8 p-0 ${requestsPage === totalRequestsPages ? "pointer-events-none opacity-50" : ""}`}
                            aria-label="Go to next page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </PaginationLink>
                        ) : (
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (requestsPage < totalRequestsPages) setRequestsPage(requestsPage + 1);
                            }}
                            className={`text-xs h-8 ${requestsPage === totalRequestsPages ? "pointer-events-none opacity-50" : ""}`}
                          />
                        )}
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </Card>
          )}

          {/* Meus Alunos - Desktop Only */}
          {!isMobile && (
            <Card className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">My {StudentLabel}</h2>
              </div>

              {activeConnections.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No {studentLabel} connected yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Share your connection code with {studentLabel}</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="p-4 bg-background/50 rounded-lg border border-border hover:shadow-soft transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <StudentAvatar
                          imageUrl={connection.thrive_sprite?.image_url}
                          seed={connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.seed : undefined}
                          style={
                            connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.style : undefined
                          }
                          size={48}
                          className="border-2 border-primary/20"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {connection.student_profile?.username || "Unknown Student"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Connected on {new Date(connection.created_at).toLocaleDateString("en-US")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Activity className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedStudentId(connection.student_id)}
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                            title="View Statistics"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Connection Code Card */}
          {profile?.caregiver_code && (
            <Card
              className={`mt-6 p-4 ${isMobile ? "p-4" : "p-5"} bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg`}
            >
              <div className={`${isMobile ? "flex flex-col gap-4" : "flex items-center justify-between"}`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <div className={isMobile ? "flex-1" : ""}>
                    <h3 className={`font-semibold ${isMobile ? "text-sm" : "text-base"}`}>Connection Code</h3>
                    <p className={`text-muted-foreground ${isMobile ? "text-xs" : "text-sm"}`}>
                      Share with {studentLabel} to connect
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 ${isMobile ? "justify-center" : ""}`}>
                  <Badge
                    variant="outline"
                    className={`font-mono border-primary/50 bg-primary/5 ${isMobile ? "text-base px-3 py-1.5" : "text-lg px-4 py-2"}`}
                  >
                    {profile.caregiver_code}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!profile?.caregiver_code) return;
                      try {
                        await navigator.clipboard.writeText(profile.caregiver_code);
                        setCopyStatus("copied");
                        toast({
                          title: "Code copied!",
                          description: "Connection code copied to clipboard",
                          variant: "caregiver-success",
                        });
                      } catch (error) {
                        console.error("Erro ao copiar código do cuidador", error);
                        toast({
                          title: "Copy failed",
                          description: "Could not copy code to clipboard",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="h-9 w-9 p-0 border border-primary/40 bg-white/5 hover:bg-primary/10 hover:border-primary/60 transition-colors"
                  >
                    {copyStatus === "copied" ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <Copy className="h-5 w-5 text-primary" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Overview Modal */}
          <Dialog open={overviewModalOpen} onOpenChange={setOverviewModalOpen}>
            <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Overview
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-3 overflow-x-hidden max-w-full">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-background/50 rounded-lg border border-border">
                    <div className="text-xl font-bold text-primary">{activeConnections.length}</div>
                    <div className="text-[10px] text-muted-foreground">Connected</div>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg border border-border">
                    <div className="text-xl font-bold text-warning">{openHelpRequests.length}</div>
                    <div className="text-[10px] text-muted-foreground">Open</div>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg border border-border">
                    <div className="text-xl font-bold text-emerald-500">{closedHelpRequests.length}</div>
                    <div className="text-[10px] text-muted-foreground">Closed</div>
                  </div>
                </div>

                <div className="max-w-full overflow-x-hidden">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold mb-2">Requests Per Month</h3>

                    <div className="flex flex-col gap-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                            {chartPeriod.charAt(0).toUpperCase() + chartPeriod.slice(1)}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setChartPeriod("daily")}>Daily</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setChartPeriod("weekly")}>Weekly</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setChartPeriod("monthly")}>Monthly</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1.5"
                          onClick={handleExportHelpRequestChart}
                          disabled={!hasHelpRequestStats}
                        >
                          <ImageDown className="h-3.5 w-3.5" />
                          PNG
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1.5"
                          onClick={handleExportHelpRequestStats}
                          disabled={!hasHelpRequestStats}
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div ref={mobileChartRef} className="w-full overflow-x-hidden">
                    <ChartContainer config={monthlyChartConfig} className="w-full h-[180px] max-w-full">
                      <BarChart 
                        data={helpRequestsChartData}
                        margin={{ left: 0, right: 5, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="4 4" />
                        <XAxis 
                          dataKey="period" 
                          axisLine={false} 
                          tickLine={false}
                          fontSize={9}
                        />
                        <YAxis 
                          allowDecimals={false} 
                          axisLine={false} 
                          tickLine={false}
                          fontSize={9}
                          width={25}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelKey="fullLabel"
                              labelFormatter={(value) => value}
                              formatter={(value: any, name: string) => [
                                value,
                                name === "ok" ? `🟢 Good` : name === "attention" ? `🟡 Attention` : `🔴 Urgent`,
                              ]}
                            />
                          }
                        />
                        <Bar dataKey="urgent" stackId="requests" fill="var(--color-urgent)" />
                        <Bar dataKey="attention" stackId="requests" fill="var(--color-attention)" />
                        <Bar dataKey="ok" stackId="requests" fill="var(--color-ok)" />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Students Modal */}
          <Dialog open={studentsModalOpen} onOpenChange={setStudentsModalOpen}>
            <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  My {StudentLabel}
                </DialogTitle>
              </DialogHeader>

              <div className="py-4">
                {activeConnections.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No {studentLabel} connected yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Share your connection code with {studentLabel}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeConnections.map((connection) => (
                      <div key={connection.id} className="p-3 bg-background/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <StudentAvatar
                            imageUrl={connection.thrive_sprite?.image_url}
                            seed={
                              connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.seed : undefined
                            }
                            style={
                              connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.style : undefined
                            }
                            size={36}
                            className="border-2 border-primary/20"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                              {connection.student_profile?.username || "Unknown Student"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Connected on {new Date(connection.created_at).toLocaleDateString("en-US")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              <Activity className="h-2 w-2 mr-1" />
                              Active
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedStudentId(connection.student_id)}
                              className="h-7 w-7 rounded-lg hover:bg-primary/10 transition-colors"
                              title="View Statistics"
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Student Stats Dialog */}
          <Dialog open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
            <DialogContent className="max-w-[95vw] md:max-w-[600px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {profile?.role === "caregiver" ? "Child" : "Student"} Statistics
                </DialogTitle>
              </DialogHeader>
              {selectedStudentId && (
                <div className="mt-4 overflow-x-hidden">
                  <StudentStats userId={selectedStudentId} />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
