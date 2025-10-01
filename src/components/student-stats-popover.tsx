import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart3 } from 'lucide-react';
import { StudentStats } from './student-stats';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentStatsPopoverProps {
  userId: string;
}

export function StudentStatsPopover({ userId }: StudentStatsPopoverProps) {
  const [open, setOpen] = useState(false);

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
             className="w-[90vw] md:w-[650px] p-6 md:p-10 min-h-[500px] md:min-h-[600px]" 
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

                <StudentStats userId={userId} />
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
