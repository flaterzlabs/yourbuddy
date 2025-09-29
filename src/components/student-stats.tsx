import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { subDays, subWeeks, subMonths, format, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];

interface StudentStatsProps {
  userId: string;
}

export function StudentStats({ userId }: StudentStatsProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetchHelpRequests();
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
    if (!helpRequests.length) return [];

    const groupedData: Record<string, { ok: number; attention: number; urgent: number }> = {};

    helpRequests.forEach((request) => {
      let key: string;
      const date = new Date(request.created_at);

      switch (period) {
        case 'daily':
          key = format(date, 'MMM dd');
          break;
        case 'weekly':
          key = `Week ${format(date, 'w')}`;
          break;
        case 'monthly':
          key = format(date, 'MMM yyyy');
          break;
      }

      if (!groupedData[key]) {
        groupedData[key] = { ok: 0, attention: 0, urgent: 0 };
      }

      const urgency = request.urgency || 'ok';
      groupedData[key][urgency as 'ok' | 'attention' | 'urgent']++;
    });

    return Object.entries(groupedData).map(([period, counts]) => ({
      period,
      ...counts,
    }));
  }, [helpRequests, period]);

  const totalRequests = helpRequests.length;
  const urgentCount = helpRequests.filter(r => r.urgency === 'urgent').length;
  const attentionCount = helpRequests.filter(r => r.urgency === 'attention').length;
  const okCount = helpRequests.filter(r => r.urgency === 'ok').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative transition-colors duration-200"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <AnimatePresence>
        {open && (
          <PopoverContent 
            className="w-[90vw] md:w-[500px] p-4 md:p-6" 
            align="end"
            asChild
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Help Request Statistics</h3>
                  <p className="text-sm text-muted-foreground">
                    Your help request activity over time
                  </p>
                </div>

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
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
