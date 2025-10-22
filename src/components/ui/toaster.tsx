import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  const { toasts } = useToast();

  // Separa os toasts por tipo
  const studentToasts = toasts.filter(toast => 
    !toast.variant || 
    toast.variant === 'student' || 
    toast.variant === 'destructive'
  );
  const caregiverToasts = toasts.filter(toast => 
    toast.variant && 
    (toast.variant.startsWith('caregiver-'))
  );

  return (
    <ToastProvider>
      {/* Viewport for student toasts - bottom-right */}
      <ToastViewport className="bottom-0 right-0 top-auto left-auto md:max-w-md">
        {studentToasts.map(function ({ id, title, description, action, variant, ...props }) {
          return (
            <Toast key={id} variant={variant} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </Toast>
          );
        })}
      </ToastViewport>
      
      {/* Viewport for caregiver toasts - top-center */}
      <ToastViewport className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-auto sm:right-auto sm:top-4 sm:flex-col md:max-w-[420px]">
        {caregiverToasts.map(function ({ id, title, description, action, variant, ...props }) {
          return (
            <Toast key={id} variant={variant} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </Toast>
          );
        })}
      </ToastViewport>
    </ToastProvider>
  );
}
