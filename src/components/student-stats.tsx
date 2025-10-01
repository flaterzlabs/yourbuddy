import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { subDays, subWeeks, subMonths, format, startOfWeek, endOfWeek } from 'date-fns';

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];

interface StudentStatsProps {
  userId: string;
}

export function StudentStats({ userId }: StudentStatsProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);

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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'help_requests',
        filter: `student_id=eq.${userId}`
      }, () => {
        // Refetch data when any change occurs
        fetchHelpRequests();
      })
      .subscribe();

    // Listen to broadcast for immediate feedback
    const broadcastChannel = supabase
      .channel(`help-status-student-${userId}`)
      .on('broadcast', {
        event: 'status-update'
      }, () => {
        // Refetch data when status update broadcast is received
        fetchHelpRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(helpRequestsChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [userId, period]);

  const fetchHelpRequests = async () => {
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
    }

    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('student_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) {
      setHelpRequests(data);
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let periods: { key: string; date: Date; label: string }[] = [];
    
    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          date,
          label: format(date, 'dd/MM')
        });
      }
    } else if (period === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 0 });
        periods.push({
          key: `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`,
          date: weekStart,
          label: format(weekStart, 'dd/MM')
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        periods.push({
          key: `${date.getFullYear()}-${date.getMonth()}`,
          date,
          label: date.toLocaleDateString('pt-BR', { month: 'short' })
        });
      }
    }
    
    // Initialize counters for each urgency level
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
    
    return periods.map(({ key, label }) => {
      const counts = counters.get(key) || { ok: 0, attention: 0, urgent: 0 };
      return {
        period: label,
        ok: counts.ok,
        attention: counts.attention,
        urgent: counts.urgent,
        total: counts.ok + counts.attention + counts.urgent
      };
    });
  }, [helpRequests, period]);

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
        <div className="h-[250px] w-full">
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
        <div className="h-[250px] flex items-center justify-center border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">No data for this period</p>
        </div>
      )}
    </div>
  );
}
