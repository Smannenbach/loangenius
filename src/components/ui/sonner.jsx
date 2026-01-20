import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast bg-white text-slate-900 border border-slate-200 shadow-lg",
          description: "text-slate-600",
          actionButton: "bg-blue-600 text-white",
          cancelButton: "bg-slate-100 text-slate-600",
          success: "bg-green-50 border-green-200 text-green-900",
          error: "bg-red-50 border-red-200 text-red-900",
          warning: "bg-amber-50 border-amber-200 text-amber-900",
          info: "bg-blue-50 border-blue-200 text-blue-900",
        },
      }}
      {...props}
    />
  );
}

export { Toaster }