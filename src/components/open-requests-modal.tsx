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
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(i);
              }}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      // Show first page
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(1);
            }}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );

      // Show ellipsis if needed
      if (currentPage > 3) {
        pages.push(
          <PaginationItem key="ellipsis-1">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      // Show current page and surrounding pages
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(i);
              }}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        pages.push(
          <PaginationItem key="ellipsis-2">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      // Show last page
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(totalPages);
            }}
            isActive={currentPage === totalPages}
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
      <div className="flex gap-2 flex-wrap">
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
     <div className="space-y-3 overflow-y-auto pr-1 max-h-[320px]">
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
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
