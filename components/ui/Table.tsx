import React from "react";

const Table: React.FC<
  React.HTMLAttributes<HTMLTableElement> & {
    wrapperClassName?: string;
    isMenuOpen?: boolean;
  }
> = ({ className, wrapperClassName, isMenuOpen, ...props }) => (
  <div
    className={`relative w-full ${
      isMenuOpen
        ? "overflow-visible"
        : "max-[1000px]:overflow-x-auto min-[1000px]:overflow-visible"
    } ${wrapperClassName || ""}`}
  >
    <table
      className={`w-full caption-bottom text-sm max-[1000px]:min-w-[600px] ${
        className || ""
      }`}
      {...props}
    />
  </div>
);

const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => <thead className={`[&_tr]:border-b ${className || ""}`} {...props} />;

const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <tbody
    className={`[&_tr:last-child]:border-0 ${className || ""}`}
    {...props}
  />
);

const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => (
  <tr
    className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${
      className || ""
    }`}
    {...props}
  />
);

const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <th
    className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${
      className || ""
    }`}
    {...props}
  />
);

const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <td
    className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${
      className || ""
    }`}
    {...props}
  />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
