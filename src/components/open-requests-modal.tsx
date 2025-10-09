import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { subDays } from "date-fns";

type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"];

interface OpenRequestsModalContentProps {
  helpRequests: HelpRequest[];
  recipientsText: string;
}

const ITEMS_PER_PAGE = 20;

type PeriodFilter = "7days" | "30days" | "all";

export function OpenRequestsModalContent({ helpRequests, recipientsText }: OpenRequestsModalContentProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

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

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "open":
        return "destructive";
      case "answered":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Count open requests for header
  const openRequestsCount = useMemo(() => {
    return helpRequests.filter((r) => r.status === "open").length;
  }, [helpRequests]);

  // Filter requests by period (show all statuses)
  const filteredRequests = useMemo(() => {
    const now = new Date();

    // Sort by most recent first
    const sortedRequests = [...helpRequests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return sortedRequests.filter((request) => {
      if (periodFilter === "all") return true;

      const requestDate = new Date(request.created_at);
      const daysAgo = periodFilter === "7days" ? 7 : 30;
      const cutoffDate = subDays(now, daysAgo);

      return requestDate >= cutoffDate;
    });
  }, [helpRequests, periodFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  const handleFilterChange = (filter: PeriodFilter) => {
    setPeriodFilter(filter);
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const pages = [];

    // Always show page 1
    pages.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
          isActive={currentPage === 1}
          className="h-8 w-8 text-xs sm:h-10 sm:w-10 sm:text-sm"
        >
          1
        </PaginationLink>
      </PaginationItem>,
    );

    // Show page 2 if exists
    if (totalPages >= 2) {
      pages.push(
        <PaginationItem key={2}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(2);
            }}
            isActive={currentPage === 2}
            className="h-8 w-8 text-xs sm:h-10 sm:w-10 sm:text-sm"
          >
            2
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Show ellipsis if there are more than 3 pages
    if (totalPages > 3) {
      pages.push(
        <PaginationItem key="ellipsis">
          <PaginationEllipsis className="h-8 w-8 sm:h-10 sm:w-10" />
        </PaginationItem>,
      );
    }

    // Show last page if there are more than 2 pages
    if (totalPages > 2) {
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(totalPages);
            }}
            isActive={currentPage === totalPages}
            className="h-8 w-8 text-xs sm:h-10 sm:w-10 sm:text-sm"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with count */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Open Requests ({openRequestsCount.toString().padStart(2, "0")})</h2>
        <p className="text-xs text-muted-foreground">Requests notify: {recipientsText}</p>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 flex-wrap sm:justify-evenly">
        <Button
          variant={periodFilter === "7days" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("7days")}
          className="flex-1 sm:flex-none"
        >
          Last 7 days
        </Button>
        <Button
          variant={periodFilter === "30days" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("30days")}
          className="flex-1 sm:flex-none"
        >
          Last 30 days
        </Button>
        <Button
          variant={periodFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("all")}
          className="flex-1 sm:flex-none"
        >
          All Requests ({helpRequests.length})
        </Button>
      </div>

      {/* Requests List */}
     <div className="space-y-3 overflow-y-auto pr-1 max-h-[340px]">
        {paginatedRequests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {periodFilter === "all"
              ? "No requests found"
              : `No requests in the last ${periodFilter === "7days" ? "7" : "30"} days`}
          </p>
        ) : (
          paginatedRequests.map((request) => (
            <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{getUrgencyEmoji(request.urgency || "ok")}</span>
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
                <span className="text-xs text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {request.message && <p className="text-sm text-muted-foreground">{request.message}</p>}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="overflow-x-auto mt-4">
          <Pagination>
            <PaginationContent className="flex-nowrap gap-1 justify-center">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50 h-8 sm:h-10" : "h-8 sm:h-10"}
                >
                  <span className="hidden sm:inline">Previous</span>
                </PaginationPrevious>
              </PaginationItem>
              {renderPageNumbers()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50 h-8 sm:h-10" : "h-8 sm:h-10"}
                >
                  <span className="hidden sm:inline">Next</span>
                </PaginationNext>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
