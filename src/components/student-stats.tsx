import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  fetchHelpRequests as fetchHelpRequestsApi,
  type HelpRequestWithProfile,
} from '@/integrations/api/help-requests';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { subDays, subWeeks, subMonths, format, startOfWeek, endOfWeek } from 'date-fns';
import { getRealtimeSocket } from '@/integrations/realtime/socket';
import { Download, ImageDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportChartAsPng } from '@/lib/export-chart';

type HelpRequest = HelpRequestWithProfile;

interface StudentStatsProps {
  userId: string;
}

export function StudentStats({ userId }: StudentStatsProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchHelpRequests = useCallback(async () => {
    if (!userId) return;

    let startDate: Date;
    switch (period) {
      case 'daily':
        startDate = subDays(new Date(), 7);
        break;
      case 'weekly':
        startDate = subWeeks(new Date(), 4);
        break;
      case 'monthly':
        startDate = subMonths(new Date(), 6);
        break;
      default:
        startDate = subWeeks(new Date(), 4);
    }

    try {
      const response = await fetchHelpRequestsApi();
      if (response.error || !response.data) {
        if (response.error) {
          console.error('Error fetching help requests stats:', response.error);
        }
        setHelpRequests([]);
        return;
      }

      const filtered = response.data.filter((request) => {
        if (request.student_id !== userId || !request.created_at) return false;
        const created = new Date(request.created_at).getTime();
        return created >= startDate.getTime();
      });

      setHelpRequests(filtered);
    } catch (error) {
      console.error('Error fetching help requests stats:', error);
      setHelpRequests([]);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchHelpRequests();
  }, [fetchHelpRequests]);

  // Realtime updates for help requests
  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket || !userId) return;

    const handleEvent = (request: HelpRequest) => {
      if (request.student_id !== userId) return;
      fetchHelpRequests();
    };

    socket.on('help_request:new', handleEvent);
    socket.on('help_request:updated', handleEvent);

    return () => {
      socket.off('help_request:new', handleEvent);
      socket.off('help_request:updated', handleEvent);
    };
  }, [userId, fetchHelpRequests]);

  const chartData = useMemo(() => {
    const now = new Date();
    let periods: { key: string; date: Date }[] = [];

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          date,
        });
      }
    } else if (period === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 0 });
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

    const counters = new Map<string, { ok: number; attention: number; urgent: number }>();

    helpRequests.forEach((request) => {
      if (!request.created_at) return;
      const created = new Date(request.created_at);
      let key = '';

      if (period === 'daily') {
        key = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`;
      } else if (period === 'weekly') {
        const weekStart = startOfWeek(created, { weekStartsOn: 0 });
        key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      } else {
        key = `${created.getFullYear()}-${created.getMonth()}`;
      }

      const urgency = request.urgency || 'ok';
      const existing = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
      if (urgency === 'ok') existing.ok += 1;
      else if (urgency === 'attention') existing.attention += 1;
      else if (urgency === 'urgent') existing.urgent += 1;

      counters.set(key, existing);
    });

    return periods.map(({ key, date }) => {
      const counts = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
      let label = '';
      let fullLabel = '';

      if (period === 'daily') {
        label = format(date, 'dd/MM');
        fullLabel = format(date, 'dd/MM/yyyy');
      } else if (period === 'weekly') {
        const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
        label = format(date, 'dd/MM');
        fullLabel = `${format(date, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
      } else {
        label = date.toLocaleDateString('pt-BR', { month: 'short' });
        fullLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
  }, [helpRequests, period]);
  const hasChartData = useMemo(() => chartData.some((item) => item.total > 0), [chartData]);

  const handleExportCsv = () => {
    if (!hasChartData) {
      toast({
        title: 'No data to export',
        description: 'There is no help request activity for the selected period.',
        variant: 'caregiver-warning',
      });
      return;
    }

    const rows = [
      ['Period', 'Low Priority', 'Medium Priority', 'High Priority', 'Total'],
      ...chartData.map((item) => [
        item.fullLabel,
        item.ok.toString(),
        item.attention.toString(),
        item.urgent.toString(),
        item.total.toString(),
      ]),
    ];

    const escapeCell = (value: string) => {
      const cell = value ?? '';
      if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const csvContent = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `student-help-request-stats-${period}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export started',
      description: 'Help request statistics exported as CSV.',
      variant: 'caregiver-success',
    });
  };

  const handleExportChart = async () => {
    if (!hasChartData) {
      toast({
        title: 'No data to export',
        description: 'There is no help request activity for the selected period.',
        variant: 'caregiver-warning',
      });
      return;
    }

    const container = chartContainerRef.current;
    if (!container) {
      toast({
        title: 'Export unavailable',
        description: 'Chart area was not found on screen.',
        variant: 'caregiver-warning',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      await exportChartAsPng(container, `student-help-request-chart-${period}-${timestamp}`);
      toast({
        title: 'Export started',
        description: 'Help request chart exported as PNG.',
        variant: 'caregiver-success',
      });
    } catch (error) {
      console.error('Error exporting student chart image:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export the chart right now. Please try again.',
        variant: 'caregiver-warning',
      });
    }
  };

  const totalRequests = helpRequests.length;
  const urgentCount = helpRequests.filter(r => r.urgency === 'urgent').length;
  const attentionCount = helpRequests.filter(r => r.urgency === 'attention').length;
  const okCount = helpRequests.filter(r => r.urgency === 'ok').length;

  return (
    <div className="space-y-4">
      {/* Period Filter */}
      <div className="flex gap-2">
        <Button
          variant={period === 'daily' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('daily')}
          className="flex-1"
        >
          Daily
        </Button>
        <Button
          variant={period === 'weekly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('weekly')}
          className="flex-1"
        >
          Weekly
        </Button>
        <Button
          variant={period === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('monthly')}
          className="flex-1"
        >
          Monthly
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto gap-2"
          onClick={handleExportCsv}
          disabled={!hasChartData}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto gap-2"
          onClick={handleExportChart}
          disabled={!hasChartData}
        >
          <ImageDown className="h-4 w-4" />
          Export PNG
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-1">Total Requests</p>
          <p className="text-2xl font-bold">{totalRequests}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-1">By Urgency</p>
          <div className="flex gap-2 items-center text-sm">
            <span>🟢 {okCount}</span>
            <span>🟡 {attentionCount}</span>
            <span>🔴 {urgentCount}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div ref={chartContainerRef} className="h-[200px] md:h-[250px] w-full overflow-hidden">
          <ChartContainer
            config={{
              ok: {
                label: 'OK',
                color: 'hsl(var(--chart-1))',
              },
              attention: {
                label: 'Attention',
                color: 'hsl(var(--chart-2))',
              },
              urgent: {
                label: 'Urgent',
                color: 'hsl(var(--chart-3))',
              },
            }}
            className="h-full w-full"
          >
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="period" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="ok" 
                stackId="a" 
                fill="hsl(142 76% 36%)" 
                radius={[0, 0, 4, 4]}
              />
              <Bar 
                dataKey="attention" 
                stackId="a" 
                fill="hsl(48 96% 53%)" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="urgent" 
                stackId="a" 
                fill="hsl(0 84% 60%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="h-[200px] md:h-[250px] flex items-center justify-center border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">No data for this period</p>
        </div>
      )}
    </div>
  );
}
