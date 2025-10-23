import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
} from "date-fns";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportChartAsPng } from "@/lib/export-chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"];

interface StudentStatsProps {
  userId: string;
}

export function StudentStats({ userId }: StudentStatsProps) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "all">("weekly");
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchHelpRequests();
  }, [userId, period]);

  // Realtime updates for help requests
  useEffect(() => {
    if (!userId) return;

    // Listen to postgres_changes for this student's help requests
    const helpRequestsChannel = supabase
      .channel(`help-requests-student-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "help_requests",
          filter: `student_id=eq.${userId}`,
        },
        () => {
          // Refetch data when any change occurs
          fetchHelpRequests();
        },
      )
      .subscribe();

    // Listen to broadcast for immediate feedback
    const broadcastChannel = supabase
      .channel(`help-status-student-${userId}`)
      .on(
        "broadcast",
        {
          event: "status-update",
        },
        () => {
          // Refetch data when status update broadcast is received
          fetchHelpRequests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(helpRequestsChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [userId, period]);

  const fetchHelpRequests = async () => {
    let query = supabase
      .from("help_requests")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: true });

    if (period !== "all") {
      let startDate: Date;

      switch (period) {
        case "daily":
          startDate = subDays(new Date(), 7);
          break;
        case "weekly":
          startDate = subWeeks(new Date(), 4);
          break;
        case "monthly":
          startDate = subMonths(new Date(), 6);
          break;
        case "quarterly":
          startDate = subQuarters(new Date(), 4);
          break;
        case "yearly":
          startDate = subYears(new Date(), 3);
          break;
        default:
          startDate = subWeeks(new Date(), 4);
      }

      query = query.gte("created_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setHelpRequests(data);
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let periods: { key: string; date: Date; label: string; fullLabel: string }[] = [];

    if (period === "daily") {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          date,
          label: format(date, "dd/MM"),
          fullLabel: format(date, "dd/MM/yyyy"),
        });
      }
    } else if (period === "weekly") {
      for (let i = 3; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        periods.push({
          key: `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`,
          date: weekStart,
          label: format(weekStart, "dd/MM"),
          fullLabel: `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`,
        });
      }
    } else if (period === "monthly") {
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}`,
          date,
          label: date.toLocaleDateString("pt-BR", { month: "short" }),
          fullLabel: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        });
      }
    } else if (period === "quarterly") {
      for (let i = 3; i >= 0; i--) {
        const date = subQuarters(now, i);
        const quarterStart = startOfQuarter(date);
        const quarterEnd = endOfQuarter(quarterStart);
        const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
        periods.push({
          key: `${quarterStart.getFullYear()}-Q${quarter}`,
          date: quarterStart,
          label: `Q${quarter}`,
          fullLabel: `Q${quarter} ${quarterStart.getFullYear()} (${format(quarterStart, "dd/MM")} - ${format(quarterEnd, "dd/MM/yyyy")})`,
        });
      }
    } else if (period === "yearly") {
      for (let i = 2; i >= 0; i--) {
        const date = subYears(now, i);
        periods.push({
          key: `${date.getFullYear()}`,
          date,
          label: `${date.getFullYear()}`,
          fullLabel: `${date.getFullYear()}`,
        });
      }
    } else if (period === "all") {
      // Para "All Time", vamos mostrar por ano
      const years = new Set(helpRequests.map((r) => new Date(r.created_at).getFullYear()));
      const sortedYears = Array.from(years).sort();
      periods = sortedYears.map((year) => ({
        key: `${year}`,
        date: new Date(year, 0, 1),
        label: `${year}`,
        fullLabel: `${year}`,
      }));
    }

    // Initialize counters for each urgency level
    const counters = new Map<string, { ok: number; attention: number; urgent: number }>();

    helpRequests.forEach((request) => {
      if (!request.created_at) return;
      const created = new Date(request.created_at);
      let key = "";

      if (period === "daily") {
        key = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`;
      } else if (period === "weekly") {
        const weekStart = startOfWeek(created, { weekStartsOn: 0 });
        key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      } else if (period === "monthly") {
        key = `${created.getFullYear()}-${created.getMonth()}`;
      } else if (period === "quarterly") {
        const quarterStart = startOfQuarter(created);
        const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
        key = `${quarterStart.getFullYear()}-Q${quarter}`;
      } else if (period === "yearly" || period === "all") {
        key = `${created.getFullYear()}`;
      }

      const urgency = request.urgency || "ok";
      const existing = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
      if (urgency === "ok") existing.ok += 1;
      else if (urgency === "attention") existing.attention += 1;
      else if (urgency === "urgent") existing.urgent += 1;

      counters.set(key, existing);
    });

    return periods.map(({ key, label, fullLabel }) => {
      const counts = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
      return {
        period: label,
        fullLabel,
        ok: counts.ok,
        attention: counts.attention,
        urgent: counts.urgent,
        total: counts.ok + counts.attention + counts.urgent,
      };
    });
  }, [helpRequests, period]);

  const totalRequests = helpRequests.length;
  const urgentCount = helpRequests.filter((r) => r.urgency === "urgent").length;
  const attentionCount = helpRequests.filter((r) => r.urgency === "attention").length;
  const okCount = helpRequests.filter((r) => r.urgency === "ok").length;
  const handleExportCsv = () => {
    if (chartData.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no help requests for the selected period.",
      });
      return;
    }

    const rows = [
      ["Period", "OK", "Attention", "Urgent", "Total"],
      ...chartData.map((item) => [
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
    link.download = `student-help-requests-${period}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export started",
      description: "Help request statistics exported as CSV.",
    });
  };
  const handleExportChart = async () => {
    if (chartData.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no help requests for the selected period.",
      });
      return;
    }

    if (!chartContainerRef.current) {
      toast({
        title: "Export unavailable",
        description: "Chart area not found. Try reopening the statistics.",
        variant: "destructive",
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      await exportChartAsPng(chartContainerRef.current, `student-help-requests-${period}-${timestamp}`);
      toast({
        title: "Export started",
        description: "Help request chart exported as PNG.",
      });
    } catch (error) {
      console.error("Error exporting student chart image:", error);
      toast({
        title: "Export failed",
        description: "Unable to export the chart right now. Please try again.",
        variant: "destructive",
      });
    }
  };

  const periodLabels = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    all: "All Time",
  };

  return (
    <div className="space-y-3">
      {/* Period Filter and Export */}
      <div className="flex justify-between items-center gap-1.5 px-4 sm:gap-2 sm:px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto gap-2 h-8 text-xs sm:h-9 sm:text-sm px-2 sm:px-3 justify-between hover:bg-gradient-hero hover:text-white hover:border-transparent dark:hover:bg-accent dark:hover:text-accent-foreground dark:hover:bg-none"
            >
              {periodLabels[period]}
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setPeriod("daily")}>Daily</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("weekly")}>Weekly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("monthly")}>Monthly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("quarterly")}>Quarterly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("yearly")}>Yearly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("all")}>All Time</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto gap-2 h-8 text-xs sm:h-9 sm:text-sm px-2 sm:px-3 hover:bg-gradient-hero hover:text-white hover:border-transparent dark:hover:bg-accent dark:hover:text-accent-foreground dark:hover:bg-none"
              disabled={chartData.length === 0}
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportChart}>Export PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCsv}>Export CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-lg bg-muted/50 border">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Total Requests</p>
          <p className="text-xl sm:text-2xl font-bold">{totalRequests}</p>
        </div>
        <div className="p-2 sm:p-3 rounded-lg bg-muted/50 border">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">By Urgency</p>
          <div className="flex gap-1.5 sm:gap-2 items-center text-xs sm:text-sm">
            <span>🟢 {okCount}</span>
            <span>🟡 {attentionCount}</span>
            <span>🔴 {urgentCount}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div ref={chartContainerRef} className="h-[180px] sm:h-[200px] md:h-[250px] w-full overflow-x-hidden">
          <ChartContainer
            config={{
              ok: {
                label: "OK",
                color: "hsl(var(--chart-1))",
              },
              attention: {
                label: "Attention",
                color: "hsl(var(--chart-2))",
              },
              urgent: {
                label: "Urgent",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-full w-full max-w-full"
          >
            <BarChart data={chartData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }} className="max-w-full">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="period"
                fontSize={14}
                tickLine={false}
                axisLine={false}
                className="sm:text-xs md:text-sm"
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={25}
                className="sm:text-xs md:text-sm"
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-muted-foreground">{name === "ok" ? "OK" : name === "attention" ? "Attention" : "Urgent"}</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
                    </div>
                  )}
                  labelFormatter={(label, payload) => (
                    <div className="space-y-1">
                      <div className="font-medium">{payload?.[0]?.payload?.fullLabel || label}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        Total: {payload?.reduce((sum, item) => sum + (Number(item.value) || 0), 0)}
                      </div>
                    </div>
                  )}
                />} 
              />
              <Bar dataKey="ok" stackId="a" fill="hsl(142 76% 36%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="attention" stackId="a" fill="hsl(48 96% 53%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="urgent" stackId="a" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="h-[180px] sm:h-[200px] md:h-[250px] flex items-center justify-center border rounded-lg bg-muted/20">
          <p className="text-xs sm:text-sm text-muted-foreground">No data for this period</p>
        </div>
      )}
    </div>
  );
}
