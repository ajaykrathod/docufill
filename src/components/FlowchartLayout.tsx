export function FlowchartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[80vh] min-w-[75vw] my-5 md:px-8 md:pt-4 lg:pt-6 bg-[#f6f5f6] dark:bg-[#0c0c0c]">
      {children}
    </div>
  );
}
