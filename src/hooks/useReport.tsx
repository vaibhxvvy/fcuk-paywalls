import { createContext, ReactNode, useContext, useState } from "react";

interface ReportController {
  reportMode: boolean;
  setReportMode: (newValue: boolean) => void;
}

const ReportContext = createContext<ReportController | undefined>(undefined);

export function useReport() {
  const context = useContext(ReportContext);

  if (!context) {
    throw new Error("useReport must be used inside a ReportProvider");
  }

  return context;
}

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reportMode, setReportMode] = useState(false);

  return (
    <ReportContext.Provider value={{ reportMode, setReportMode }}>
      {children}
    </ReportContext.Provider>
  );
}
