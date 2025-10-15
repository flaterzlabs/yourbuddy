import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Clock, CheckCircle, XCircle, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { subDays } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"];

interface OpenRequestsModalContentProps {
  helpRequests: HelpRequest[];
  recipientsText: string;
}

const ITEMS_PER_PAGE = 30;

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
  const getStatusLabel = (status: string | null | undefined) => {
    switch (status) {
      case "answered":
        return "Answered";
      case "closed":
        return "Closed";
      case "pending":
        return "Waiting";
      case "open":
      default:
        return "Waiting";
    }
  };
  const getUrgencyLabel = (urgency: string | null | undefined) => {
    switch (urgency) {
      case "attention":
        return "Attention";
      case "urgent":
        return "Urgent";
      default:
        return "OK";
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
    const pages: JSX.Element[] = [];
    const isMobile = window.innerWidth < 640;
    const maxVisiblePages = isMobile ? 2 : 3;

    if (isMobile && totalPages > maxVisiblePages) {
      // Mobile: show only current, ellipsis, and last
      pages.push(
        <PaginationItem key={currentPage}>
          <PaginationLink
            href="#"
            isActive={true}
            onClick={(e) => {
              e.preventDefault();
            }}
            className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
          >
            {currentPage}
          </PaginationLink>
        </PaginationItem>,
      );

      if (currentPage < totalPages - 1) {
        pages.push(
          <PaginationItem key="ellipsis">
            <PaginationEllipsis className="h-8 w-8" />
          </PaginationItem>,
        );
      }

      if (currentPage !== totalPages) {
        pages.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(totalPages);
              }}
              className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(i);
              }}
              className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      // Show pages with ellipsis
      if (currentPage <= maxVisiblePages) {
        // Show first pages + ellipsis + last
        for (let i = 1; i <= maxVisiblePages + 1; i++) {
          pages.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(i);
                }}
                className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }
        pages.push(
          <PaginationItem key="ellipsis">
            <PaginationEllipsis className="h-8 w-8" />
          </PaginationItem>,
        );
        pages.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(totalPages);
              }}
              className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        );
      } else if (currentPage >= totalPages - maxVisiblePages) {
        // Show first + ellipsis + last pages
        pages.push(
          <PaginationItem key={1}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(1);
              }}
              className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
            >
              1
            </PaginationLink>
          </PaginationItem>,
        );
        pages.push(
          <PaginationItem key="ellipsis">
            <PaginationEllipsis className="h-8 w-8" />
          </PaginationItem>,
        );
        for (let i = totalPages - maxVisiblePages; i <= totalPages; i++) {
          pages.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(i);
                }}
                className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }
      } else {
        // Show first + ellipsis + current range + ellipsis + last
        pages.push(
          <PaginationItem key={1}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(1);
              }}
              className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
            >
              1
            </PaginationLink>
          </PaginationItem>,
        );
        pages.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis className="h-8 w-8" />
          </PaginationItem>,
        );
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(i);
                }}
                className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }
        pages.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis className="h-8 w-8" />
          </PaginationItem>,
        );
        pages.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(totalPages);
              }}
              className="h-8 w-8 p-0 text-xs sm:h-10 sm:w-10 sm:text-sm"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    }

    return pages;
  };
  const handleExportRequests = () => {
    if (filteredRequests.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No help requests available for the selected period.",
        variant: "student",
      });
      return;
    }

    const rows = [
      ["Created At", "Urgency", "Status", "Message"],
      ...filteredRequests.map((request) => [
        request.created_at ? new Date(request.created_at).toLocaleString("en-US") : "-",
        `${getUrgencyEmoji(request.urgency || "ok")} ${getUrgencyLabel(request.urgency)}`,
        getStatusLabel(request.status),
        request.message || "",
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
    link.download = `help-requests-${periodFilter}-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export started",
      description: "Help requests exported as CSV.",
      variant: "student",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with count */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Open Requests ({openRequestsCount.toString().padStart(2, "0")})</h2>
        <p className="text-xs text-muted-foreground">Requests notify: {recipientsText}</p>
      </div>

      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant={periodFilter === "7days" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("7days")}
            className="flex-1 text-xs px-2 h-8 sm:flex-none sm:text-sm sm:px-3 sm:h-9"
          >
            7 days
          </Button>
          <Button
            variant={periodFilter === "30days" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("30days")}
            className="flex-1 text-xs px-2 h-8 sm:flex-none sm:text-sm sm:px-3 sm:h-9"
          >
            30 days
          </Button>
          <Button
            variant={periodFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("all")}
            className="flex-1 text-xs px-2 h-8 sm:flex-none sm:text-sm sm:px-3 sm:h-9"
          >
            All ({helpRequests.length})
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-xs px-2 h-8 sm:text-sm sm:px-3 sm:h-9"
          onClick={handleExportRequests}
          disabled={filteredRequests.length === 0}
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          Export CSV
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
        <Pagination className="mt-4">
          <PaginationContent className="gap-1 flex-nowrap justify-center">
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={cn(
                  "h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 sm:gap-2",
                  currentPage === 1 && "pointer-events-none opacity-50",
                )}
                aria-label="Go to previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </PaginationLink>
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={cn(
                  "h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 sm:gap-2",
                  currentPage === totalPages && "pointer-events-none opacity-50",
                )}
                aria-label="Go to next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
