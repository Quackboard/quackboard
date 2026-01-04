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

interface RemoveFromLineupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  slotPosition: number;
  onConfirm: () => void;
  isRemoving?: boolean;
}

export function RemoveFromLineupModal({
  open,
  onOpenChange,
  guestName,
  slotPosition,
  onConfirm,
  isRemoving = false,
}: RemoveFromLineupModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from Lineup?</AlertDialogTitle>
          <AlertDialogDescription>
            Remove {guestName} from slot {slotPosition}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
