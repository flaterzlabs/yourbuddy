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
  const studentToasts = toasts.filter(toast => !toast.variant || toast.variant === 'student' || toast.variant === 'destructive');
  const caregiverToasts = toasts.filter(toast => toast.variant && toast.variant.startsWith('caregiver-'));

  return (
    <ToastProvider>
      {/* Viewport para toasts de estudante - bottom-right */}
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
      
      {/* Viewport para toasts de caregiver - top-center */}
      <ToastViewport className="top-4 left-1/2 -translate-x-1/2 bottom-auto right-auto md:max-w-lg w-full max-w-lg">
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
