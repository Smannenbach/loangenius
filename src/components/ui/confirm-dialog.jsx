import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, XCircle, CheckCircle, Info } from 'lucide-react';

const icons = {
  danger: AlertTriangle,
  delete: Trash2,
  warning: XCircle,
  success: CheckCircle,
  info: Info,
};

const iconColors = {
  danger: 'text-red-600',
  delete: 'text-red-600',
  warning: 'text-yellow-600',
  success: 'text-green-600',
  info: 'text-blue-600',
};

const buttonStyles = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  delete: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  info: 'bg-blue-600 hover:bg-blue-700 text-white',
};

/**
 * Reusable confirmation dialog component
 *
 * @example
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Contact"
 *   description="Are you sure you want to delete this contact? This action cannot be undone."
 *   variant="delete"
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const Icon = icons[variant] || AlertTriangle;

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100 ${iconColors[variant]}`}>
              <Icon className="h-5 w-5" />
            </div>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={buttonStyles[variant]}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for easy confirm dialog usage
 *
 * @example
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Lead',
 *     description: 'This will permanently delete the lead.',
 *     variant: 'delete',
 *   });
 *   if (confirmed) {
 *     // perform delete
 *   }
 * };
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     {ConfirmDialogComponent}
 *   </>
 * );
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState({
    open: false,
    title: '',
    description: '',
    variant: 'danger',
    confirmLabel: 'Confirm',
    resolve: null,
  });

  const confirm = React.useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title || 'Are you sure?',
        description: options.description || 'This action cannot be undone.',
        variant: options.variant || 'danger',
        confirmLabel: options.confirmLabel || 'Confirm',
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  };

  const ConfirmDialogComponent = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={state.title}
      description={state.description}
      variant={state.variant}
      confirmLabel={state.confirmLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogComponent };
}

// Pre-configured delete confirmation
export function DeleteConfirmDialog({ open, onOpenChange, itemName, onConfirm, loading }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemName}?`}
      description={`Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`}
      variant="delete"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
