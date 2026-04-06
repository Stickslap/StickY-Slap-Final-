
"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Safe string extraction for React children to prevent [object Error] crashes
        const extractString = (val: any) => {
          if (!val) return null;
          if (typeof val === 'string') return val;
          if (val instanceof Error) return val.message;
          if (typeof val === 'object') {
            return val.message || JSON.stringify(val);
          }
          return String(val);
        };

        const safeTitle = extractString(title);
        const safeDescription = extractString(description);

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {safeTitle && <ToastTitle>{safeTitle}</ToastTitle>}
              {safeDescription && (
                <ToastDescription>
                  {safeDescription}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
