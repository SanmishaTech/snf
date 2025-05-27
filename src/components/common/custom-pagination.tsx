import * as React from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  recordsPerPage: number;
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (recordsPerPage: number) => void;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onPageChange,
  onRecordsPerPageChange,
}) => {
  const startRecord =
    totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Ensure current page is valid
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-3">
        {/* Number of Records */}
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startRecord}</span> to{" "}
          <span className="font-medium">{endRecord}</span> of{" "}
          <span className="font-medium">{totalRecords}</span> records
        </div>

        {/* Records Per Page Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Records per page:</span>
          <Select
            value={recordsPerPage?.toString() || "10"}
            onValueChange={(value) => onRecordsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue placeholder={`${recordsPerPage || 10}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex justify-center md:justify-end w-full overflow-x-auto py-1">
          <Pagination>
            <PaginationContent>
            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {/* Page Numbers */}
            {totalPages <= 7 ? (
              // If 7 or fewer pages, show all page numbers
              Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )
            ) : (
              // If more than 7 pages, show a more compact view with ellipsis
              <>
                {/* Always show first page */}
                <PaginationItem>
                  <PaginationLink
                    isActive={currentPage === 1}
                    onClick={() => onPageChange(1)}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>

                {/* Show ellipsis if not on first few pages */}
                {currentPage > 3 && (
                  <PaginationItem>
                    <span className="px-4">...</span>
                  </PaginationItem>
                )}

                {/* Show pages around current page */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page !== 1 &&
                      page !== totalPages &&
                      (Math.abs(page - currentPage) < 2 ||
                        (currentPage <= 3 && page <= 5) ||
                        (currentPage >= totalPages - 2 &&
                          page >= totalPages - 4))
                  )
                  .map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPage === page}
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                {/* Show ellipsis if not on last few pages */}
                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <span className="px-4">...</span>
                  </PaginationItem>
                )}

                {/* Always show last page */}
                <PaginationItem>
                  <PaginationLink
                    isActive={currentPage === totalPages}
                    onClick={() => onPageChange(totalPages)}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}

            {/* Next Button */}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  currentPage < totalPages && onPageChange(currentPage + 1)
                }
                className={
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        </div>
      )}
    </div>
  );
};

export default CustomPagination;
